import express from 'express';
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

/**
 * Routes Panier (authentification requise)
 */
router.post('/add', authenticate, addToCart);
router.put('/update/:productId', authenticate, updateCartQuantity);
router.delete('/remove/:productId', authenticate, removeFromCart);
router.get('/', authenticate, getCart);
router.delete('/clear', authenticate, clearCart);
router.get('/validate', authenticate, validateCart);

/**
 * Routes Favoris (authentification requise)
 */
router.post('/wishlist/add', authenticate, addToWishlist);
router.delete('/wishlist/remove/:productId', authenticate, removeFromWishlist);
router.get('/wishlist', authenticate, getWishlist);
router.post('/wishlist/move-to-cart/:productId', authenticate, moveToCart);

/**
 * Routes Panier Invité (pas d'auth)
 */
router.post('/guest/save', saveGuestCart);
router.get('/guest', getGuestCart);

/**
 * Fusion des paniers après connexion
 */
router.post('/merge', authenticate, mergeCart);

export default router;