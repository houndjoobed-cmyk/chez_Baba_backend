import express from 'express';
import { param, query } from 'express-validator';
import {
    createProduct,
    getProductsByShop,
    getAllProducts,
    getProductById,
    getMyProducts,
    updateProduct,
    deleteProduct,
    getProductWithRatings
} from '../controllers/productController.js';
import { authenticate, isVendor } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { createProductValidator, updateProductValidator } from '../validators/productValidators.js';

const router = express.Router();

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
    getProductWithRatings // Utilisation de la version améliorée avec notes
);

// Routes vendeurs
router.post('/create',
    authenticate,
    isVendor,
    createProductValidator,
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
    updateProductValidator,
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