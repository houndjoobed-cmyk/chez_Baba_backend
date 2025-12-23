import imageService from '../services/imageService.js';
import sharp from 'sharp';

/**
 * Middleware pour valider les images avant upload
 * Logique : Intercepte et vérifie avant d'envoyer à Cloudinary
 */
export const validateImageUpload = async (req, res, next) => {
    if (!req.files && !req.file) {
        return next();
    }

    try {
        const files = req.files || [req.file];
        
        for (const file of files) {
            // Convertir en buffer pour analyse
            const buffer = Buffer.from(file.buffer);
            
            // Valider l'image
            const validation = await imageService.validateImage(buffer);
            
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Image invalide',
                    details: validation.errors
                });
            }

            // Optimiser si nécessaire
            if (file.size > 1024 * 1024) { // > 1MB
                file.buffer = await imageService.optimizeBeforeUpload(buffer);
            }
        }

        next();
    } catch (error) {
        console.error('Erreur validation image:', error);
        res.status(400).json({ error: 'Erreur traitement image' });
    }
};

/**
 * Middleware pour gérer les erreurs d'upload
 * Logique : Capture les erreurs Multer et retourne des messages clairs
 */
export const handleUploadError = (error, req, res, next) => {
    if (error) {
        console.error('Erreur upload:', error);

        // Erreurs Multer
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'Fichier trop volumineux' 
            });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                error: 'Trop de fichiers uploadés' 
            });
        }

        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                error: 'Nom de champ incorrect' 
            });
        }

        // Erreur générique
        return res.status(500).json({ 
            error: 'Erreur lors de l\'upload' 
        });
    }
    next();
};

/**
 * Middleware pour nettoyer les uploads échoués
 * Logique : Si une erreur survient après upload, supprime les images
 */
export const cleanupOnError = async (req, res, next) => {
    // Sauvegarder la fonction res.json originale
    const originalJson = res.json;

    res.json = function(data) {
        // Si c'est une erreur et qu'il y a des fichiers uploadés
        if (res.statusCode >= 400 && req.uploadedImages) {
            // Nettoyer les images
            req.uploadedImages.forEach(async (image) => {
                try {
                    await imageService.deleteImage(image.public_id);
                } catch (err) {
                    console.error('Erreur nettoyage:', err);
                }
            });
        }

        // Appeler la fonction originale
        return originalJson.call(this, data);
    };

    next();
};

/**
 * Middleware pour ajouter des watermarks (optionnel)
 * Logique : Protège les images contre le vol
 */
export const addWatermark = async (req, res, next) => {
    if (!req.files || !req.user.addWatermark) {
        return next();
    }

    try {
        const watermarkPath = './assets/watermark.png';
        
        for (const file of req.files) {
            const watermarkedBuffer = await sharp(file.buffer)
                .composite([{
                    input: watermarkPath,
                    gravity: 'southeast', // Coin bas-droite
                    blend: 'over'
                }])
                .toBuffer();

            file.buffer = watermarkedBuffer;
        }

        next();
    } catch (error) {
        console.error('Erreur watermark:', error);
        next(); // Continue sans watermark en cas d'erreur
    }
};