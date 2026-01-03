import { validationResult } from 'express-validator';

/**
 * Middleware pour gérer les erreurs de validation
 * Renvoie une erreur 422 si la validation échoue
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: 'Données invalides',
            details: errors.array()
        });
    }
    next();
};
