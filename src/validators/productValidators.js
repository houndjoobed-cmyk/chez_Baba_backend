import { body } from 'express-validator';

export const createProductValidator = [
    body('titre')
        .trim()
        .notEmpty().withMessage('Le titre est requis')
        .isLength({ min: 3 }).withMessage('Le titre doit faire au moins 3 caractères'),

    body('prix')
        .notEmpty().withMessage('Le prix est requis')
        .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),

    body('stock')
        .optional()
        .isInt({ min: 0 }).withMessage('Le stock doit être un entier positif'),

    body('category_id')
        .notEmpty().withMessage('La catégorie est requise')
        .isUUID().withMessage('ID de catégorie invalide'),

    body('description')
        .optional()
        .trim(),

    body('image')
        .optional()
        .isString()
];

export const updateProductValidator = [
    body('titre')
        .optional()
        .trim()
        .isLength({ min: 3 }),

    body('prix')
        .optional()
        .isFloat({ min: 0 }),

    body('stock')
        .optional()
        .isInt({ min: 0 }),

    body('category_id')
        .optional()
        .isUUID(),

    body('status')
        .optional()
        .isIn(['active', 'inactive', 'archived'])
];
