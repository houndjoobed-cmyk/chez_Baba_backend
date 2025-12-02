import bcrypt from 'bcrypt';
import { supabase } from '../config/supabase.js';
import { generateToken } from '../utils/jwt.js';

// 📌 Inscription
export const register = async (req, res) => {
    try {
        const { nom, email, motdepasse, role } = req.body;

        // Validation
        if (!nom || !email || !motdepasse) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
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

        // Insertion dans la base de données
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    nom,
                    email,
                    motdepasse: hashedPassword,
                    role: role || 'client'
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Génère le token
        const token = generateToken(data.id, data.email, data.role);

        res.status(201).json({
            message: 'Inscription réussie',
            user: {
                id: data.id,
                nom: data.nom,
                email: data.email,
                role: data.role
            },
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
            .select('id, nom, email, role, created_at')
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