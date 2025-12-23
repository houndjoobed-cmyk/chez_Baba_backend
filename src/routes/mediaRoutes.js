import express from 'express';
import {
    uploadUserAvatar,
    uploadProductImages,
    deleteProductImage,
    reorderProductImages,
    getUserMedia,
    cleanupOrphanImages
} from '../controllers/mediaController.js';
import { authenticate, isVendor, isAdmin } from '../middleware/auth.js';
import {
    uploadAvatar,
    uploadProductImages as multerProductImages,
    uploadShopLogo
} from '../config/cloudinary.js';
import {
    validateImageUpload,
    handleUploadError,
    cleanupOnError
} from '../middleware/imageMiddleware.js';

const router = express.Router();

/**
 * Routes d'upload avec leurs middlewares spécifiques
 * Logique : Chaque type d'upload a sa propre chaîne de middlewares
 */

// Upload avatar utilisateur
router.post('/avatar',
    authenticate,
    cleanupOnError, // Nettoie si erreur
    uploadAvatar, // Multer + Cloudinary
    handleUploadError, // Gestion erreurs
    uploadUserAvatar // Contrôleur
);

// Upload images produit
router.post('/product/:productId',
    authenticate,
    isVendor,
    cleanupOnError,
    multerProductImages,
    handleUploadError,
    uploadProductImages
);

// Supprimer image produit
router.delete('/product/:productId/:publicId',
    authenticate,
    isVendor,
    deleteProductImage
);

// Réorganiser images produit
router.put('/product/:productId/reorder',
    authenticate,
    isVendor,
    reorderProductImages
);

// Récupérer ses médias
router.get('/my-media',
    authenticate,
    getUserMedia
);

// Admin : nettoyer images orphelines
router.post('/cleanup',
    authenticate,
    isAdmin,
    cleanupOrphanImages
);

export default router;