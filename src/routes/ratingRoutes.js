import express from 'express';
import {
    rateProduct,
    rateShop,
    getUserProductRating,
    getUserShopRating,
    getProductRatingDistribution,
    getShopRatingDistribution,
    getTopRatedProducts,
    getTopRatedShops,
    getGlobalRatingStats,
    canUserRate
} from '../controllers/ratingController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Routes protégées - Utilisateur connecté requis
 */

// Noter un produit
router.post('/product/:productId', authenticate, rateProduct);

// Noter une boutique
router.post('/shop/:shopId', authenticate, rateShop);

// Obtenir sa note pour un produit
router.get('/product/:productId/user', authenticate, getUserProductRating);

// Obtenir sa note pour une boutique
router.get('/shop/:shopId/user', authenticate, getUserShopRating);

// Vérifier si l'utilisateur peut noter
router.get('/can-rate/:type/:id', authenticate, canUserRate);

/**
 * Routes publiques
 */

// Distribution des notes d'un produit
router.get('/product/:productId/distribution', getProductRatingDistribution);

// Distribution des notes d'une boutique
router.get('/shop/:shopId/distribution', getShopRatingDistribution);

// Produits les mieux notés
router.get('/top/products', getTopRatedProducts);

// Boutiques les mieux notées
router.get('/top/shops', getTopRatedShops);

/**
 * Routes Admin
 */

// Statistiques globales
router.get('/stats/global', authenticate, isAdmin, getGlobalRatingStats);

export default router;