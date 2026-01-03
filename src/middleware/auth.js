import { verifyToken } from '../utils/jwt.js';
import { supabase } from '../config/supabase.js';

export const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }

    req.user = decoded; // On stocke les infos de l'utilisateur

    // 🔒 SÉCURITÉ : Vérifier si l'utilisateur existe toujours et est actif
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, role, banni') // Supposez qu'il y a un champ 'banni' ou similaire, sinon on vérifie juste l'existence
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Utilisateur introuvable ou supprimé' });
        }

        if (user.banni) {
            return res.status(403).json({ error: 'Votre compte a été suspendu' });
        }

        // Mise à jour du rôle au cas où il aurait changé depuis la création du token
        req.user.role = user.role;

    } catch (err) {
        console.error('Erreur vérification user DB:', err);
        return res.status(500).json({ error: 'Erreur serveur lors de l\'authentification' });
    }

    next();
};

// Middleware pour vérifier si l'utilisateur est vendeur
export const isVendor = (req, res, next) => {
    if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux vendeurs' });
    }
    next();
};

// Middleware pour vérifier si l'utilisateur est admin
export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux admins' });
    }
    next();
};