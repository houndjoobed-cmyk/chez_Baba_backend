import { verifyToken } from '../utils/jwt.js';

export const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }

    req.user = decoded; // On stocke les infos de l'utilisateur
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