import express from 'express';
import {
    getLanguages,
    getCurrencies,
    getTranslations,
    convertPrice,
    getUserPreferences,
    updateUserPreferences,
    detectLocale,
    getLocalizedProducts,
    translateProduct,
    updateExchangeRates
} from '../controllers/i18nController.js';
import { authenticate, isVendor, isAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Routes publiques
 */
router.get('/languages', getLanguages);
router.get('/currencies', getCurrencies);
router.get('/translations', getTranslations);
router.get('/convert', convertPrice);
router.get('/detect-locale', detectLocale);
router.get('/products', getLocalizedProducts);

/**
 * Routes authentifiées
 */
router.get('/preferences', authenticate, getUserPreferences);
router.put('/preferences', authenticate, updateUserPreferences);

/**
 * Routes vendeur
 */
router.post('/product/:productId/translate', authenticate, isVendor, translateProduct);

/**
 * Routes admin
 */
router.post('/update-rates', authenticate, isAdmin, updateExchangeRates);

export default router;