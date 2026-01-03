import express from 'express';
import { body, param, validationResult } from 'express-validator';
import {
    addToCart,
    updateCartQuantity,
    removeFromCart,
    getCart,
    clearCart,
    validateCart,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    moveToCart,
    saveGuestCart,
    getGuestCart,
    mergeCart
} from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

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

/**
 * Routes Panier (authentification requise)
 */
router.post('/add',
    authenticate,
    body('product_id').isUUID().withMessage('ID produit invalide'),
    body('quantity').isInt({ min: 1, max: 1000 }).withMessage('Quantité invalide (1-1000)'),
    handleValidationErrors,
    addToCart
);

router.put('/update/:productId',
    authenticate,
    param('productId').isUUID().withMessage('ID produit invalide'),
    body('quantity').isInt({ min: 1, max: 1000 }).withMessage('Quantité invalide (1-1000)'),
    handleValidationErrors,
    updateCartQuantity
);

router.delete('/remove/:productId',
    authenticate,
    param('productId').isUUID().withMessage('ID produit invalide'),
    handleValidationErrors,
    removeFromCart
);

router.get('/', authenticate, getCart);
router.delete('/clear', authenticate, clearCart);
router.get('/validate', authenticate, validateCart);

/**
 * Routes Favoris (authentification requise)
 */
router.post('/wishlist/add',
    authenticate,
    body('product_id').isUUID().withMessage('ID produit invalide'),
    handleValidationErrors,
    addToWishlist
);

router.delete('/wishlist/remove/:productId',
    authenticate,
    param('productId').isUUID().withMessage('ID produit invalide'),
    handleValidationErrors,
    removeFromWishlist
);

router.get('/wishlist', authenticate, getWishlist);

router.post('/wishlist/move-to-cart/:productId',
    authenticate,
    param('productId').isUUID().withMessage('ID produit invalide'),
    handleValidationErrors,
    moveToCart
);

/**
 * Routes Panier Invité (pas d'auth)
 */
router.post('/guest/save',
    body('items').isArray({ min: 1 }).withMessage('Panier vide'),
    body('items.*.product_id').isUUID().withMessage('ID produit invalide'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantité invalide'),
    handleValidationErrors,
    saveGuestCart
);

router.get('/guest', getGuestCart);

/**
 * Fusion des paniers après connexion
 */
router.post('/merge',
    authenticate,
    body('items').isArray().withMessage('Items invalide'),
    handleValidationErrors,
    mergeCart
);

export default router;