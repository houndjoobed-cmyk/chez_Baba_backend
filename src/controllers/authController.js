import bcrypt from 'bcrypt';
import { supabase } from '../config/supabase.js';
import { generateToken } from '../utils/jwt.js';

// 📌 Inscription
export const register = async (req, res) => {
    try {
        const { nom, email, motdepasse, role, adresse, telephone, ville } = req.body;

        // Validation de base
        if (!nom || !email || !motdepasse) {
            return res.status(400).json({ error: 'Nom, email et mot de passe sont requis' });
        }

        // Validation supplémentaire pour les vendeurs
        if (role === 'vendor') {
            if (!adresse || !telephone || !ville) {
                return res.status(400).json({
                    error: 'Pour les vendeurs, l\'adresse, le téléphone et la ville sont requis'
                });
            }
        }

        // Vérifie si l'email existe déjà
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(motdepasse, 10);

        // Prépare les données à insérer
        const userData = {
            nom,
            email,
            motdepasse: hashedPassword,
            role: role || 'client'
        };

        // Ajoute les champs supplémentaires pour les vendeurs
        if (role === 'vendor') {
            userData.adresse = adresse;
            userData.telephone = telephone;
            userData.ville = ville;
        }

        // Insertion dans la base de données
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Génère le token
        const token = generateToken(data.id, data.email, data.role);

        // Prépare la réponse utilisateur
        const userResponse = {
            id: data.id,
            nom: data.nom,
            email: data.email,
            role: data.role
        };

        // Ajoute les informations supplémentaires pour les vendeurs
        if (data.role === 'vendor') {
            userResponse.adresse = data.adresse;
            userResponse.telephone = data.telephone;
            userResponse.ville = data.ville;
        }

        res.status(201).json({
            message: 'Inscription réussie',
            user: userResponse,
            token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Connexion
export const login = async (req, res) => {
    try {
        const { email, motdepasse } = req.body;

        // Validation
        if (!email || !motdepasse) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        // Cherche l'utilisateur
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Vérifie le mot de passe
        const isPasswordValid = await bcrypt.compare(motdepasse, user.motdepasse);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Génère le token
        const token = generateToken(user.id, user.email, user.role);

        res.status(200).json({
            message: 'Connexion réussie',
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer le profil de l'utilisateur connecté
export const getProfile = async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, nom, email, role, adresse, telephone, ville, created_at')
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