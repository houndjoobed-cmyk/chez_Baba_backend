import Joi from 'joi';

/**
 * Schémas de validation pour l'authentification
 * Utilise Joi pour valider les données entrantes
 */

// Regex pour validation
const phoneRegex = /^\+229\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * Validation pour l'inscription client
 */
export const registerClientSchema = Joi.object({
    nom: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut pas dépasser 100 caractères',
        'any.required': 'Le nom est obligatoire'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Email invalide',
        'any.required': 'L\'email est obligatoire'
    }),
    motdepasse: Joi.string().pattern(passwordRegex).required().messages({
        'string.pattern.base': 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre',
        'any.required': 'Le mot de passe est obligatoire'
    }),
    role: Joi.string().valid('client', 'vendor').default('client')
});

/**
 * Validation pour l'inscription vendeur
 */
export const registerVendorSchema = Joi.object({
    nom: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    motdepasse: Joi.string().pattern(passwordRegex).required(),
    role: Joi.string().valid('vendor').required(),
    adresse: Joi.string().min(10).max(500).required().messages({
        'string.min': 'L\'adresse doit contenir au moins 10 caractères',
        'any.required': 'L\'adresse est obligatoire pour les vendeurs'
    }),
    telephone: Joi.string().pattern(phoneRegex).required().messages({
        'string.pattern.base': 'Format de téléphone invalide (ex: +229 97 12 34 56)',
        'any.required': 'Le téléphone est obligatoire pour les vendeurs'
    }),
    ville: Joi.string().min(2).max(100).required().messages({
        'any.required': 'La ville est obligatoire pour les vendeurs'
    })
});

/**
 * Validation pour la connexion
 */
export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    motdepasse: Joi.string().required()
});

/**
 * Validation pour la demande de réinitialisation
 */
export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required()
});

/**
 * Validation pour la réinitialisation du mot de passe
 */
export const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    motdepasse: Joi.string().pattern(passwordRegex).required()
});

/**
 * Validation pour la vérification OTP
 */
export const verifyOTPSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
        'string.length': 'Le code OTP doit contenir 6 chiffres',
        'string.pattern.base': 'Le code OTP doit contenir uniquement des chiffres'
    })
});

/**
 * Middleware de validation
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
            // Formater les erreurs pour une meilleure lisibilité
            const errors = error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
            }));
            
            return res.status(400).json({
                error: 'Données invalides',
                details: errors
            });
        }
        
        next();
    };
};