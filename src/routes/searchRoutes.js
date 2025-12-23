import express from 'express';
import {
    searchProducts,
    autocomplete,
    getSuggestions,
    getSimilarProducts,
    getPopularSearches,
    getUserSearchHistory,
    clearSearchHistory,
    searchShops,
    advancedSearch,
    trackSearchClick
} from '../controllers/searchController.js';
import { authenticate } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/security.js';

const router = express.Router();

/**
 * Routes publiques de recherche
 */

// Recherche principale
router.get('/products', apiLimiter, searchProducts);

// Autocomplétion (limite plus élevée car appelé à chaque frappe)
router.get('/autocomplete', autocomplete);

// Suggestions
router.get('/suggestions', getSuggestions);

// Produits similaires
router.get('/similar/:productId', getSimilarProducts);

// Recherches populaires
router.get('/popular', getPopularSearches);

// Recherche de boutiques
router.get('/shops', searchShops);

// Recherche avancée (POST pour body complexe)
router.post('/advanced', apiLimiter, advancedSearch);

// Tracking de clic (optionnel, améliore les résultats)
router.post('/track-click', trackSearchClick);

/**
 * Routes protégées (utilisateur connecté)
 */

// Historique personnel
router.get('/history', authenticate, getUserSearchHistory);

// Effacer historique
router.delete('/history', authenticate, clearSearchHistory);

export default router;