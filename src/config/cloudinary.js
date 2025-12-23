import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration de Cloudinary
 * Cloudinary est un service cloud qui :
 * - Stocke les images
 * - Les optimise automatiquement
 * - Permet des transformations (resize, crop, etc.)
 * - Fournit des URLs CDN rapides
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Configuration du stockage pour les produits
 * Logique : Chaque type d'image a son dossier et ses transformations
 */
const productStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: 'chez-baba/products', // Dossier dans Cloudinary
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [
                { width: 1000, height: 1000, crop: 'limit' }, // Max 1000x1000
                { quality: 'auto:good' }, // Optimisation auto de la qualité
                { fetch_format: 'auto' } // Format auto (webp si supporté)
            ],
            // Nom unique : produit_timestamp_random
            public_id: `product_${Date.now()}_${Math.random().toString(36).substring(7)}`
        };
    }
});

/**
 * Configuration pour les logos de boutique
 * Logique : Les logos sont plus petits et carrés
 */
const shopLogoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'chez-baba/shops',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
            { width: 500, height: 500, crop: 'fill' }, // Carré 500x500
            { quality: 'auto:good' }
        ],
        public_id: (req, file) => `shop_${req.user.userId}_${Date.now()}`
    }
});

/**
 * Configuration pour les avatars utilisateur
 * Logique : Petite taille, format rond possible
 */
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'chez-baba/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' }, // Focus sur visage
            { radius: 'max' }, // Rond
            { quality: 'auto' }
        ],
        public_id: (req, file) => `avatar_${req.user.userId}_${Date.now()}`
    }
});

/**
 * Middlewares Multer pour chaque type d'upload
 * Logique : Chaque type a ses propres règles et limites
 */

// Upload de produits (max 5MB, jusqu'à 5 images)
export const uploadProductImages = multer({
    storage: productStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max par fichier
        files: 5 // Maximum 5 images par produit
    },
    fileFilter: (req, file, cb) => {
        // Vérification du type MIME
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Seules les images sont autorisées'), false);
        }
        cb(null, true);
    }
}).array('images', 5); // 'images' = nom du champ, 5 = max files

// Upload logo boutique (max 2MB, 1 seule image)
export const uploadShopLogo = multer({
    storage: shopLogoStorage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB max
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Le logo doit être une image'), false);
        }
        cb(null, true);
    }
}).single('logo'); // Une seule image

// Upload avatar (max 1MB)
export const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 1 * 1024 * 1024 // 1MB max
    }
}).single('avatar');

/**
 * Service pour supprimer une image de Cloudinary
 * Logique : Utilise le public_id pour identifier et supprimer
 */
export const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Erreur suppression Cloudinary:', error);
        return false;
    }
};

/**
 * Service pour optimiser une image existante
 * Logique : Applique des transformations sans re-uploader
 */
export const optimizeImage = (url, transformations) => {
    // Exemple : cloudinary.url('public_id', { width: 200, crop: 'thumb' })
    const publicId = url.split('/').pop().split('.')[0];
    return cloudinary.url(publicId, transformations);
};

export default cloudinary;