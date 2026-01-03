import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
    createProduct,
    getProductsByShop,
    getAllProducts,
    getProductById,
    getMyProducts,
    updateProduct,
    deleteProduct
} from '../controllers/productController.js';
import { authenticate, isVendor } from '../middleware/auth.js';

const router = express.Router();

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

// Routes publiques
router.get('/',
    query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit invalide'),
    query('search').optional().trim().isLength({ min: 1 }).withMessage('Recherche vide'),
    query('category').optional().isUUID().withMessage('Catégorie invalide'),
    handleValidationErrors,
    getAllProducts
);

router.get('/shop/:shopId',
    param('shopId').isUUID().withMessage('ID boutique invalide'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
    handleValidationErrors,
    getProductsByShop
);

router.get('/:id',
    param('id').isUUID().withMessage('ID produit invalide'),
    handleValidationErrors,
    getProductById
);

// Routes vendeurs
router.post('/create',
    authenticate,
    isVendor,
    body('titre').trim().isLength({ min: 3, max: 200 }).withMessage('Titre: 3-200 caractères'),
    body('description').optional().trim().isLength({ min: 10 }).withMessage('Description: min 10 caractères'),
    body('prix').isFloat({ min: 0.01 }).withMessage('Prix doit être positif'),
    body('stock').isInt({ min: 0 }).withMessage('Stock doit être un entier positif'),
    body('category_id').isUUID().withMessage('Catégorie invalide'),
    body('images').optional().isArray({ min: 1 }).withMessage('Au moins 1 image'),
    handleValidationErrors,
    createProduct
);

router.get('/my/products',
    authenticate,
    isVendor,
    query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
    handleValidationErrors,
    getMyProducts
);

router.put('/update/:id',
    authenticate,
    isVendor,
    param('id').isUUID().withMessage('ID produit invalide'),
    body('titre').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Titre: 3-200 caractères'),
    body('description').optional().trim().isLength({ min: 10 }).withMessage('Description: min 10 caractères'),
    body('prix').optional().isFloat({ min: 0.01 }).withMessage('Prix doit être positif'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock doit être un entier positif'),
    handleValidationErrors,
    updateProduct
);

router.delete('/delete/:id',
    authenticate,
    isVendor,
    param('id').isUUID().withMessage('ID produit invalide'),
    handleValidationErrors,
    deleteProduct
);

export default router;