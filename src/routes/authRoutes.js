import express from 'express';
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
import {
    validate,
    registerClientSchema,
    registerVendorSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyOTPSchema
} from '../validators/authValidator.js';

const router = express.Router();

// Middleware de sécurité appliqué à toutes les routes
router.use(sanitizeInput);

// Routes publiques avec protection
router.post('/register', 
    authLimiter,
    (req, res, next) => {
        // Validation conditionnelle selon le rôle
        const schema = req.body.role === 'vendor' ? registerVendorSchema : registerClientSchema;
        validate(schema)(req, res, next);
    },
    register
);

router.post('/login', 
    authLimiter, 
    validate(loginSchema), 
    login
);

router.post('/google',
    authLimiter,
    googleAuth
);

router.post('/verify-email',
    strictLimiter,
    validate(verifyOTPSchema),
    verifyEmail
);

router.post('/resend-otp',
    strictLimiter,
    resendOTP
);

router.post('/forgot-password',
    strictLimiter,
    validate(forgotPasswordSchema),
    forgotPassword
);

router.post('/reset-password',
    strictLimiter,
    validate(resetPasswordSchema),
    resetPassword
);

// Routes protégées
router.get('/profile', authenticate, getProfile);
router.post('/enable-2fa', authenticate, enable2FA);

export default router;