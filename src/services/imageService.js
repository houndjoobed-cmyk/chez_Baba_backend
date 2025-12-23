import sharp from 'sharp';
import { supabase } from '../config/supabase.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * Service de gestion des images
 * Centralise toute la logique de traitement d'images
 */
class ImageService {
    /**
     * Enregistre les métadonnées d'une image dans la BD
     * Logique : Garde une trace de toutes les images pour les gérer
     */
    async saveImageMetadata(imageData) {
        const { data, error } = await supabase
            .from('media')
            .insert([imageData])
            .select()
            .single();

        if (error) {
            console.error('Erreur sauvegarde metadata:', error);
            throw error;
        }

        return data;
    }

    /**
     * Traite les images uploadées pour un produit
     * Logique : 
     * 1. Première image = image principale
     * 2. Sauvegarde les métadonnées
     * 3. Retourne un tableau formaté pour la BD
     */
    async processProductImages(files, productId, userId) {
        const processedImages = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Structure de l'objet image
            const imageData = {
                url: file.path, // URL Cloudinary
                public_id: file.filename, // Pour suppression
                is_primary: i === 0, // Première image = principale
                order: i // Ordre d'affichage
            };

            // Sauvegarder les métadonnées
            await this.saveImageMetadata({
                user_id: userId,
                url: file.path,
                public_id: file.filename,
                type: 'product',
                entity_id: productId,
                file_name: file.originalname,
                file_size: file.size,
                mime_type: file.mimetype
            });

            processedImages.push(imageData);
        }

        return processedImages;
    }

    /**
     * Génère des miniatures pour une image
     * Logique : Crée différentes tailles pour différents usages
     */
    async generateThumbnails(imageUrl) {
        const sizes = {
            thumbnail: { width: 150, height: 150 },
            small: { width: 300, height: 300 },
            medium: { width: 600, height: 600 }
        };

        const thumbnails = {};
        
        for (const [name, size] of Object.entries(sizes)) {
            // Cloudinary génère automatiquement les thumbnails via URL
            const thumbUrl = imageUrl.replace('/upload/', `/upload/w_${size.width},h_${size.height},c_fill/`);
            thumbnails[name] = thumbUrl;
        }

        return thumbnails;
    }

    /**
     * Supprime une image (Cloudinary + BD)
     * Logique : Nettoyage complet pour éviter les images orphelines
     */
    async deleteImage(publicId, mediaId) {
        // 1. Supprimer de Cloudinary
        const cloudinaryDeleted = await deleteFromCloudinary(publicId);
        
        if (!cloudinaryDeleted) {
            throw new Error('Erreur suppression Cloudinary');
        }

        // 2. Supprimer de la BD
        const { error } = await supabase
            .from('media')
            .delete()
            .eq('public_id', publicId);

        if (error) {
            throw error;
        }

        return true;
    }

    /**
     * Vérifie la taille et les dimensions d'une image
     * Logique : Validation avant upload pour économiser la bande passante
     */
    async validateImage(buffer) {
        const metadata = await sharp(buffer).metadata();
        
        const validations = {
            isValid: true,
            errors: []
        };

        // Vérifications
        if (metadata.width < 200 || metadata.height < 200) {
            validations.isValid = false;
            validations.errors.push('Image trop petite (min 200x200)');
        }

        if (metadata.width > 5000 || metadata.height > 5000) {
            validations.isValid = false;
            validations.errors.push('Image trop grande (max 5000x5000)');
        }

        // Format
        const allowedFormats = ['jpeg', 'png', 'webp'];
        if (!allowedFormats.includes(metadata.format)) {
            validations.isValid = false;
            validations.errors.push('Format non supporté');
        }

        return validations;
    }

    /**
     * Optimise une image locale avant upload
     * Logique : Réduit la taille sans perdre trop de qualité
     */
    async optimizeBeforeUpload(buffer) {
        return sharp(buffer)
            .resize(2000, 2000, { 
                fit: 'inside', // Garde le ratio
                withoutEnlargement: true // N'agrandit pas les petites images
            })
            .jpeg({ 
                quality: 85, // Bonne qualité avec compression
                progressive: true // Chargement progressif
            })
            .toBuffer();
    }

    /**
     * Récupère toutes les images d'une entité
     * Logique : Centralise la récupération pour éviter les requêtes multiples
     */
    async getEntityImages(entityId, type) {
        const { data, error } = await supabase
            .from('media')
            .select('*')
            .eq('entity_id', entityId)
            .eq('type', type)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Met à jour l'ordre des images d'un produit
     * Logique : Permet de réorganiser les images par drag & drop
     */
    async reorderProductImages(productId, newOrder) {
        // newOrder = [{public_id: '...', order: 0}, ...]
        const images = [];
        
        for (const item of newOrder) {
            images.push({
                public_id: item.public_id,
                url: item.url,
                is_primary: item.order === 0,
                order: item.order
            });
        }

        const { error } = await supabase
            .from('products')
            .update({ images })
            .eq('id', productId);

        if (error) {
            throw error;
        }

        return images;
    }

    /**
     * Nettoie les images orphelines
     * Logique : Maintenance pour supprimer les images non utilisées
     */
    async cleanupOrphanImages() {
        // Images sans entity_id depuis plus de 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const { data: orphans } = await supabase
            .from('media')
            .select('*')
            .is('entity_id', null)
            .lt('created_at', yesterday.toISOString());

        let deleted = 0;
        
        if (orphans) {
            for (const orphan of orphans) {
                try {
                    await this.deleteImage(orphan.public_id, orphan.id);
                    deleted++;
                } catch (error) {
                    console.error(`Erreur suppression orpheline ${orphan.id}:`, error);
                }
            }
        }

        return { deleted, total: orphans?.length || 0 };
    }
}

export default new ImageService();