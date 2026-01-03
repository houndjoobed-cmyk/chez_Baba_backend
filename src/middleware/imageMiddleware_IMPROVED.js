import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from 'cloudinary';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ImageMiddleware');

/**
 * Configuration Cloudinary
 */
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Configuration du stockage Cloudinary pour les produits
 */
const productStorage = new CloudinaryStorage({
    cloudinary: cloudinary.v2,
    params: async (req, file) => {
        return {
            folder: 'chez-baba/products',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            quality: 'auto:good',
            fetch_format: 'auto',
            resource_type: 'auto',
            timeout: 60000
        };
    }
});

/**
 * Configuration du stockage Cloudinary pour les avatars
 */
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary.v2,
    params: async (req, file) => {
        return {
            folder: 'chez-baba/avatars',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            quality: 'auto:good',
            resource_type: 'auto',
            gravity: 'face',
            crop: 'thumb',
            width: 500,
            height: 500,
            timeout: 60000
        };
    }
});

/**
 * Validateur de fichier image
 */
const validateImageFile = (file, allowedMimes, allowedExtensions) => {
    // Vérifier le MIME type
    if (!allowedMimes.includes(file.mimetype)) {
        throw new Error(
            `Invalid file type. Allowed: ${allowedMimes.join(', ')}`
        );
    }

    // Vérifier l'extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        throw new Error(
            `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`
        );
    }

    // Vérifier la taille
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }
};

/**
 * Middleware pour uploader des images de produits
 */
export const multerProductImages = multer({
    storage: productStorage,
    fileFilter: (req, file, cb) => {
        try {
            const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
            
            validateImageFile(file, allowedMimes, allowedExtensions);
            
            logger.info('Product image validated', {
                filename: file.originalname,
                size: file.size,
                mime: file.mimetype
            });
            
            cb(null, true);
        } catch (error) {
            logger.error('Product image validation failed', error, {
                filename: file.originalname
            });
            cb(error);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10 // Max 10 fichiers
    }
});

/**
 * Middleware pour uploader un avatar
 */
export const multerAvatar = multer({
    storage: avatarStorage,
    fileFilter: (req, file, cb) => {
        try {
            const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
            
            validateImageFile(file, allowedMimes, allowedExtensions);
            
            logger.info('Avatar validated', {
                filename: file.originalname,
                size: file.size
            });
            
            cb(null, true);
        } catch (error) {
            logger.error('Avatar validation failed', error);
            cb(error);
        }
    },
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB pour les avatars
    }
});

/**
 * Middleware de validation après upload
 * Valide que c'est réellement une image
 */
export const validateUploadedImage = async (req, res, next) => {
    if (!req.file && !req.files) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const files = req.files || [req.file];
        
        for (const file of files) {
            // Vérifier que c'est vraiment une image valide
            if (file.path) {
                const metadata = await sharp(file.path).metadata();
                
                // Vérifier le format
                if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
                    throw new Error('Invalid image format');
                }

                // Vérifier les dimensions
                if (!metadata.width || !metadata.height) {
                    throw new Error('Cannot read image dimensions');
                }

                if (metadata.width < 100 || metadata.height < 100) {
                    throw new Error('Image too small (minimum 100x100px)');
                }

                if (metadata.width > 4000 || metadata.height > 4000) {
                    throw new Error('Image too large (maximum 4000x4000px)');
                }

                // Vérifier si c'est un fichier valide (pas corrompu)
                if (metadata.hasAlpha === undefined && metadata.format !== 'webp') {
                    // Alpha channel info unavailable = possibly corrupted
                    logger.warn('Potentially corrupted image detected', null, {
                        filename: file.originalname
                    });
                }

                logger.info('Image validation passed', {
                    filename: file.originalname,
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    size: file.size
                });
            }
        }

        next();
    } catch (error) {
        logger.error('Image validation failed', error, {
            filename: req.file?.originalname
        });
        
        return res.status(400).json({
            error: error.message || 'Invalid image file'
        });
    }
};

/**
 * Middleware de gestion des erreurs d'upload
 */
export const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        logger.error('Multer error', error, {
            code: error.code,
            field: error.field
        });

        let message = 'File upload error';
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            message = 'File size exceeds limit (5MB for products, 3MB for avatars)';
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            message = 'Too many files (maximum 10)';
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
        }

        return res.status(400).json({ error: message });
    }

    if (error) {
        logger.error('Upload middleware error', error);
        return res.status(400).json({ 
            error: error.message || 'File upload failed' 
        });
    }

    next();
};

/**
 * Optimiser et compresser une image après upload (optionnel)
 */
export const optimizeImage = async (req, res, next) => {
    if (!req.file || !req.file.path) {
        return next();
    }

    try {
        // Sauvegarder l'image optimisée
        const optimizedPath = req.file.path.replace(
            /\.[^.]+$/,
            '-optimized.jpg'
        );

        await sharp(req.file.path)
            .resize(1920, 1920, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80, progressive: true })
            .toFile(optimizedPath);

        logger.info('Image optimized', {
            original: req.file.path,
            optimized: optimizedPath
        });

        next();
    } catch (error) {
        logger.error('Image optimization failed', error);
        // Ne pas échouer si l'optimisation échoue
        next();
    }
};

export default {
    multerProductImages,
    multerAvatar,
    validateUploadedImage,
    handleUploadError,
    optimizeImage
};
