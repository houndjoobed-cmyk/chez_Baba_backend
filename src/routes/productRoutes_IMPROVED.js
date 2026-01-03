import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, isVendor, isAdmin } from '../middleware/auth.js';
import productController from '../controllers/productController.js';
import { apiLimiter } from '../middleware/security.js';

const router = express.Router();

/**
 * Middleware de validation centralisé
 * Place la validation AVANT les contrôleurs
 */

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// ============================================
// GET - Lister les produits (avec pagination)
// ============================================
router.get('/',
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be >= 1'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('category_id')
        .optional()
        .isUUID()
        .withMessage('Invalid category_id format'),
    query('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search must be between 1 and 100 characters'),
    query('sort')
        .optional()
        .isIn(['newest', 'price_asc', 'price_desc', 'rating', 'popular'])
        .withMessage('Invalid sort parameter'),
    query('min_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('min_price must be >= 0'),
    query('max_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('max_price must be >= 0'),
    handleValidationErrors,
    apiLimiter,
    productController.listProducts
);

// ============================================
// GET - Détails d'un produit
// ============================================
router.get('/:id',
    param('id')
        .isUUID()
        .withMessage('Invalid product ID'),
    handleValidationErrors,
    productController.getProduct
);

// ============================================
// POST - Créer un produit (Vendeurs uniquement)
// ============================================
router.post('/',
    authenticate,
    isVendor,
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Product name is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Name must be between 3 and 255 characters'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
    body('price')
        .isFloat({ min: 0.01 })
        .withMessage('Price must be > 0'),
    body('stock')
        .isInt({ min: 0 })
        .withMessage('Stock must be >= 0'),
    body('category_id')
        .isUUID()
        .withMessage('Invalid category_id'),
    body('sku')
        .trim()
        .notEmpty()
        .withMessage('SKU is required')
        .isLength({ max: 50 })
        .withMessage('SKU max length is 50'),
    body('status')
        .optional()
        .isIn(['active', 'inactive', 'draft'])
        .withMessage('Invalid status'),
    handleValidationErrors,
    productController.createProduct
);

// ============================================
// PUT - Mettre à jour un produit
// ============================================
router.put('/:id',
    authenticate,
    isVendor,
    param('id')
        .isUUID()
        .withMessage('Invalid product ID'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Name must be between 3 and 255 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
    body('price')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Price must be > 0'),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be >= 0'),
    body('status')
        .optional()
        .isIn(['active', 'inactive', 'draft'])
        .withMessage('Invalid status'),
    handleValidationErrors,
    productController.updateProduct
);

// ============================================
// DELETE - Supprimer un produit
// ============================================
router.delete('/:id',
    authenticate,
    isVendor,
    param('id')
        .isUUID()
        .withMessage('Invalid product ID'),
    handleValidationErrors,
    productController.deleteProduct
);

// ============================================
// POST - Ajouter au panier (Utilise RPC function)
// ============================================
router.post('/:id/add-to-cart',
    authenticate,
    param('id')
        .isUUID()
        .withMessage('Invalid product ID'),
    body('quantity')
        .isInt({ min: 1, max: 10000 })
        .withMessage('Quantity must be between 1 and 10000'),
    handleValidationErrors,
    productController.addToCart
);

export default router;
