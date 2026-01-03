import express from 'express';
import { body, validationResult } from 'express-validator';
import {
    register,
    login,
    googleAuth,
    verifyEmail,
    resendOTP,
    forgotPassword,
    resetPassword,
    getProfile,
    enable2FA
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { 
    authLimiter, 
    strictLimiter,
    sanitizeInput 
} from '../middleware/security.js';

const router = express.Router();

// Middleware de sécurité appliqué à toutes les routes
router.use(sanitizeInput);

// Middleware de validation des erreurs
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// Routes publiques avec protection
router.post('/register', 
    authLimiter,
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe: minimum 8 caractères'),
    body('password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mot de passe faible (a-z, A-Z, 0-9 requis)'),
    body('role').isIn(['client', 'vendor']).withMessage('Rôle invalide'),
    body('first_name').trim().isLength({ min: 2 }).withMessage('Prénom invalide'),
    body('last_name').trim().isLength({ min: 2 }).withMessage('Nom invalide'),
    body('phone').optional().isMobilePhone().withMessage('Téléphone invalide'),
    body('shop_name').if((value, { req }) => req.body.role === 'vendor')
        .trim().isLength({ min: 3 }).withMessage('Nom boutique: minimum 3 caractères'),
    handleValidationErrors,
    register
);

router.post('/login', 
    authLimiter,
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
    handleValidationErrors,
    login
);

router.post('/google',
    body('token').notEmpty().withMessage('Token Google requis'),
    handleValidationErrors,
    googleAuth
);

router.post('/verify-email',
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP invalide'),
    handleValidationErrors,
    verifyEmail
);

router.post('/resend-otp',
    authLimiter,
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    handleValidationErrors,
    resendOTP
);

router.post('/forgot-password',
    authLimiter,
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    handleValidationErrors,
    forgotPassword
);

router.post('/reset-password',
    strictLimiter,
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP invalide'),
    body('new_password').isLength({ min: 8 }).withMessage('Mot de passe: minimum 8 caractères'),
    body('new_password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mot de passe faible'),
    handleValidationErrors,
    resetPassword
);

// Routes protégées
router.get('/profile', authenticate, getProfile);
router.post('/enable-2fa', authenticate, enable2FA);

export default router;
