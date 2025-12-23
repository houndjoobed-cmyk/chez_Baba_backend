import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { supabase } from '../config/supabase.js';

/**
 * Rate limiting pour prévenir les attaques brute force
 * Limite le nombre de requêtes par IP
 */
export const createRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return rateLimit({
        windowMs, // Fenêtre de temps en ms
        max: maxRequests, // Limite de requêtes
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        standardHeaders: true,
        legacyHeaders: false,
        // Stockage des tentatives dans la base de données (optionnel)
        handler: async (req, res) => {
            // Log l'attaque potentielle
            await supabase.from('login_attempts').insert({
                email: req.body.email || 'unknown',
                ip_address: req.ip,
                success: false
            });
            
            res.status(429).json({
                error: 'Trop de tentatives, compte temporairement bloqué'
            });
        }
    });
};

/**
 * Rate limiter spécifique pour l'authentification
 * Plus strict : 5 tentatives par 15 minutes
 */
export const authLimiter = createRateLimiter(5, 15 * 60 * 1000);

/**
 * Rate limiter pour les endpoints sensibles (reset password, etc.)
 * 3 tentatives par heure
 */
export const strictLimiter = createRateLimiter(3, 60 * 60 * 1000);

/**
 * Rate limiter général pour l'API
 * 100 requêtes par 15 minutes
 */
export const apiLimiter = createRateLimiter(100, 15 * 60 * 1000);

/**
 * Middleware de sécurité Helmet
 * Protège contre les vulnérabilités web communes
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

/**
 * Vérifie si une IP est blacklistée
 */
export const checkBlacklist = async (req, res, next) => {
    const ip = req.ip;
    
    // Vérifier si l'IP a trop de tentatives échouées
    const { data: attempts } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('ip_address', ip)
        .eq('success', false)
        .gte('attempted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(10);
    
    if (attempts && attempts.length >= 10) {
        return res.status(403).json({
            error: 'Votre IP a été temporairement bloquée pour raisons de sécurité'
        });
    }
    
    next();
};

/**
 * Nettoie et valide les entrées utilisateur
 */
export const sanitizeInput = (req, res, next) => {
    // Nettoyer les données d'entrée
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Enlever les espaces en début/fin
                req.body[key] = req.body[key].trim();
                
                // Échapper les caractères HTML dangereux
                req.body[key] = req.body[key]
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');
            }
        });
    }
    next();
};