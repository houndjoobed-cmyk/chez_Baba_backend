import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { generateToken } from '../utils/jwt.js';
import emailService from '../services/emailService.js';
import googleAuthService from '../services/googleAuthService.js';

/**
 * Génère un OTP à 6 chiffres
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Génère un token de réinitialisation sécurisé
 */
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// 📌 Inscription avec validation et OTP
// 📌 Inscription avec validation et OTP
export const register = async (req, res) => {
    try {
        // Normalisation des entrées (Snake_case du front vers Camel/DB)
        const {
            email,
            password,
            first_name,
            last_name,
            role,
            phone,
            shop_name,
            address,
            city
        } = req.body;

        // Validation basique des champs requis manquants (au cas où le middleware a laissé passer)
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }

        // Vérifier si l'email existe déjà
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Préparer les données utilisateur (Schema DB)
        const userData = {
            nom: `${first_name} ${last_name}`.trim(), // Colonne 'nom' en base
            email,
            motdepasse: hashedPassword,
            role: role || 'client',
            auth_provider: 'local',
            email_verified: false
        };

        // Ajouter les champs vendeur si nécessaire (stockés dans users ou profil ?)
        // Note: Idéalement ces champs devraient être dans une table 'profiles' ou 'shops'
        if (role === 'vendor') {
            userData.adresse = address;
            userData.telephone = phone;
            userData.ville = city;
        }

        // Créer l'utilisateur
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) {
            console.error('Erreur création user:', error);
            return res.status(500).json({ error: 'Erreur lors de la création du compte' });
        }

        // Si Vendeur : Création automatique de la boutique
        if (role === 'vendor' && shop_name) {
            const { error: shopError } = await supabase
                .from('shops')
                .insert([{
                    owner_id: newUser.id,
                    nom: shop_name,
                    description: '', // À remplir plus tard
                    status: 'pending' // En attente de validation
                }]);

            if (shopError) {
                console.error('Erreur création boutique:', shopError);
                // On ne bloque pas l'inscription, mais on loggue l'erreur
                // Le vendeur pourra créer sa boutique manuellement plus tard
            }
        }

        // Générer et sauvegarder l'OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await supabase.from('email_verifications').insert([{
            user_id: newUser.id,
            otp,
            expires_at: expiresAt
        }]);

        // Envoyer l'email de vérification
        try {
            await emailService.sendOTPEmail(email, otp);
        } catch (emailError) {
            console.error('Erreur envoi email:', emailError);
            // On continue même si l'email échoue (l'utilisateur pourra redemander un OTP)
        }

        // Générer le token JWT
        const token = generateToken(newUser.id, newUser.email, newUser.role);

        res.status(201).json({
            message: 'Inscription réussie ! Vérifiez votre email pour activer votre compte.',
            user: {
                id: newUser.id,
                nom: newUser.nom,
                email: newUser.email,
                role: newUser.role,
                shop_name: shop_name || null,
                email_verified: false
            },
            token
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
};

// 📌 Vérification de l'email avec OTP
export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Récupérer l'utilisateur
        const { data: user } = await supabase
            .from('users')
            .select('id, email_verified')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email déjà vérifié' });
        }

        // Vérifier l'OTP
        const { data: verification } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('otp', otp)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!verification) {
            return res.status(400).json({ error: 'Code OTP invalide ou expiré' });
        }

        // Marquer l'email comme vérifié
        await supabase
            .from('users')
            .update({ email_verified: true })
            .eq('id', user.id);

        // Marquer l'OTP comme utilisé
        await supabase
            .from('email_verifications')
            .update({ verified: true })
            .eq('id', verification.id);

        // Envoyer email de bienvenue
        await emailService.sendWelcomeEmail(email, user.nom);

        res.status(200).json({
            message: 'Email vérifié avec succès !'
        });
    } catch (error) {
        console.error('Erreur vérification email:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
};

// 📌 Renvoyer l'OTP
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Récupérer l'utilisateur
        const { data: user } = await supabase
            .from('users')
            .select('id, email_verified')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email déjà vérifié' });
        }

        // Vérifier les limites de renvoi (max 3 par heure)
        const { data: recentOTPs } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

        if (recentOTPs && recentOTPs.length >= 3) {
            return res.status(429).json({
                error: 'Trop de demandes. Réessayez dans une heure.'
            });
        }

        // Générer un nouveau OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await supabase.from('email_verifications').insert([{
            user_id: user.id,
            otp,
            expires_at: expiresAt
        }]);

        // Envoyer l'email
        await emailService.sendOTPEmail(email, otp);

        res.status(200).json({
            message: 'Nouveau code envoyé par email'
        });
    } catch (error) {
        console.error('Erreur renvoi OTP:', error);
        res.status(500).json({ error: 'Erreur lors du renvoi' });
    }
};

// 📌 Connexion avec vérification email
export const login = async (req, res) => {
    try {
        const { email, motdepasse } = req.body;

        // Chercher l'utilisateur
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            // Log tentative échouée
            await supabase.from('login_attempts').insert({
                email,
                ip_address: req.ip,
                success: false
            });
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Vérifier si c'est un compte local
        if (user.auth_provider !== 'local') {
            return res.status(400).json({
                error: `Veuillez vous connecter avec ${user.auth_provider}`
            });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(motdepasse, user.motdepasse);

        if (!isPasswordValid) {
            // Log tentative échouée
            await supabase.from('login_attempts').insert({
                email,
                ip_address: req.ip,
                success: false
            });
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Log tentative réussie
        await supabase.from('login_attempts').insert({
            email,
            ip_address: req.ip,
            success: true
        });

        // Avertissement si email non vérifié
        let warning = null;
        if (!user.email_verified) {
            warning = 'Votre email n\'est pas encore vérifié. Certaines fonctionnalités peuvent être limitées.';
        }

        // Générer le token
        const token = generateToken(user.id, user.email, user.role);

        res.status(200).json({
            message: 'Connexion réussie',
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                role: user.role,
                email_verified: user.email_verified
            },
            token,
            warning
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
};

// 📌 Connexion avec Google
export const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ error: 'Token Google manquant' });
        }

        // Vérifier le token Google
        const googleUser = await googleAuthService.verifyGoogleToken(idToken);

        // Vérifier si l'utilisateur existe
        let { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', googleUser.email)
            .single();

        let user;

        if (existingUser) {
            // L'utilisateur existe déjà
            if (existingUser.auth_provider === 'local') {
                // Lier le compte Google au compte existant
                await supabase
                    .from('users')
                    .update({
                        google_id: googleUser.googleId,
                        email_verified: true,
                        auth_provider: 'google'
                    })
                    .eq('id', existingUser.id);

                user = existingUser;
            } else if (existingUser.auth_provider === 'google') {
                user = existingUser;
            } else {
                return res.status(400).json({
                    error: 'Cet email est déjà utilisé avec un autre service de connexion'
                });
            }
        } else {
            // Créer un nouvel utilisateur
            const { data: newUser, error } = await supabase
                .from('users')
                .insert([{
                    nom: googleUser.nom,
                    email: googleUser.email,
                    google_id: googleUser.googleId,
                    auth_provider: 'google',
                    email_verified: true,
                    role: 'client',
                    motdepasse: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
                }])
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: 'Erreur création compte' });
            }

            user = newUser;

            // Envoyer email de bienvenue
            await emailService.sendWelcomeEmail(user.email, user.nom);
        }

        // Générer le token JWT
        const token = generateToken(user.id, user.email, user.role);

        res.status(200).json({
            message: 'Connexion avec Google réussie',
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                role: user.role,
                email_verified: true
            },
            token
        });
    } catch (error) {
        console.error('Erreur Google Auth:', error);
        res.status(500).json({ error: 'Erreur authentification Google' });
    }
};

// 📌 Demande de réinitialisation de mot de passe
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Vérifier si l'utilisateur existe
        const { data: user } = await supabase
            .from('users')
            .select('id, nom')
            .eq('email', email)
            .single();

        if (!user) {
            // Ne pas révéler si l'email existe ou non (sécurité)
            return res.status(200).json({
                message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
            });
        }

        // Vérifier les demandes récentes (max 3 par heure)
        const { data: recentRequests } = await supabase
            .from('password_resets')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

        if (recentRequests && recentRequests.length >= 3) {
            return res.status(429).json({
                error: 'Trop de demandes. Réessayez dans une heure.'
            });
        }

        // Générer un token de réinitialisation
        const resetToken = generateResetToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

        // Sauvegarder le token
        await supabase.from('password_resets').insert([{
            user_id: user.id,
            token: resetToken,
            expires_at: expiresAt
        }]);

        // Construire le lien de réinitialisation
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        // Envoyer l'email
        await emailService.sendPasswordResetEmail(email, resetLink);

        res.status(200).json({
            message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
        });
    } catch (error) {
        console.error('Erreur forgot password:', error);
        res.status(500).json({ error: 'Erreur lors de la demande' });
    }
};

// 📌 Réinitialisation du mot de passe
export const resetPassword = async (req, res) => {
    try {
        const { token, motdepasse } = req.body;

        // Vérifier le token
        const { data: resetRequest } = await supabase
            .from('password_resets')
            .select('*')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!resetRequest) {
            return res.status(400).json({
                error: 'Token invalide ou expiré'
            });
        }

        // Hash du nouveau mot de passe
        const hashedPassword = await bcrypt.hash(motdepasse, 10);

        // Mettre à jour le mot de passe
        await supabase
            .from('users')
            .update({ motdepasse: hashedPassword })
            .eq('id', resetRequest.user_id);

        // Marquer le token comme utilisé
        await supabase
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetRequest.id);

        res.status(200).json({
            message: 'Mot de passe réinitialisé avec succès'
        });
    } catch (error) {
        console.error('Erreur reset password:', error);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
};

// 📌 Récupérer le profil (mis à jour)
export const getProfile = async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, nom, email, role, adresse, telephone, ville, email_verified, auth_provider, created_at')
            .eq('id', req.user.userId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Activer l'authentification à deux facteurs (2FA)
export const enable2FA = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Générer un secret pour 2FA
        const secret = crypto.randomBytes(20).toString('hex');

        // Sauvegarder le secret
        await supabase
            .from('users')
            .update({
                two_fa_secret: secret,
                two_fa_enabled: false // Sera activé après vérification
            })
            .eq('id', userId);

        // Générer un QR code (vous pouvez utiliser une librairie comme 'qrcode')
        const otpAuthUrl = `otpauth://totp/ChezBaba:${req.user.email}?secret=${secret}&issuer=ChezBaba`;

        res.status(200).json({
            message: 'Scannez ce QR code avec votre application d\'authentification',
            secret,
            qrCode: otpAuthUrl
        });
    } catch (error) {
        console.error('Erreur activation 2FA:', error);
        res.status(500).json({ error: 'Erreur lors de l\'activation 2FA' });
    }
};