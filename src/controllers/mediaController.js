import { supabase } from '../config/supabase.js';
import imageService from '../services/imageService.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * Contrôleur pour la gestion des médias
 * Gère les uploads, suppressions et récupération d'images
 */

/**
 * Upload d'avatar utilisateur
 * Logique : Un seul avatar, remplace l'ancien automatiquement
 */
export const uploadUserAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }

        const userId = req.user.userId;
        const avatarUrl = req.file.path;
        const publicId = req.file.filename;

        // Récupérer l'ancien avatar
        const { data: user } = await supabase
            .from('users')
            .select('avatar')
            .eq('id', userId)
            .single();

        // Si un avatar existe, le supprimer de Cloudinary
        if (user?.avatar) {
            // Extraire le public_id de l'URL
            const oldPublicId = user.avatar.split('/').pop().split('.')[0];
            await deleteFromCloudinary(oldPublicId);
        }

        // Mettre à jour l'avatar
        const { error } = await supabase
            .from('users')
            .update({ avatar: avatarUrl })
            .eq('id', userId);

        if (error) {
            // Si erreur, supprimer la nouvelle image uploadée
            await deleteFromCloudinary(publicId);
            throw error;
        }

        // Sauvegarder les métadonnées
        await imageService.saveImageMetadata({
            user_id: userId,
            url: avatarUrl,
            public_id: publicId,
            type: 'user_avatar',
            entity_id: userId,
            file_name: req.file.originalname,
            file_size: req.file.size,
            mime_type: req.file.mimetype
        });

        res.status(200).json({
            message: 'Avatar mis à jour avec succès',
            avatar: avatarUrl
        });
    } catch (error) {
        console.error('Erreur upload avatar:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
};

/**
 * Upload images produit
 * Logique : Multiple images, première = principale
 */
export const uploadProductImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }

        const { productId } = req.params;
        const userId = req.user.userId;

        // Vérifier que le produit appartient au vendeur
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        if (!shop) {
            return res.status(403).json({ error: 'Boutique non trouvée' });
        }

        const { data: product } = await supabase
            .from('products')
            .select('id, images')
            .eq('id', productId)
            .eq('shop_id', shop.id)
            .single();

        if (!product) {
            // Nettoyer les images uploadées
            for (const file of req.files) {
                await deleteFromCloudinary(file.filename);
            }
            return res.status(403).json({ error: 'Produit non trouvé ou non autorisé' });
        }

        // Traiter les images
        const newImages = await imageService.processProductImages(
            req.files, 
            productId, 
            userId
        );

        // Combiner avec les images existantes
        const existingImages = product.images || [];
        const allImages = [...existingImages, ...newImages];

        // Limiter à 10 images max
        if (allImages.length > 10) {
            return res.status(400).json({ 
                error: 'Maximum 10 images par produit' 
            });
        }

        // Mettre à jour le produit
        const { error } = await supabase
            .from('products')
            .update({ 
                images: allImages,
                // Mettre à jour l'image principale si c'est la première
                image: allImages[0]?.url || product.image
            })
            .eq('id', productId);

        if (error) {
            throw error;
        }

        res.status(200).json({
            message: 'Images ajoutées avec succès',
            images: allImages
        });
    } catch (error) {
        console.error('Erreur upload images produit:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
};

/**
 * Supprimer une image de produit
 * Logique : Supprime de Cloudinary + met à jour le produit
 */
export const deleteProductImage = async (req, res) => {
    try {
        const { productId, publicId } = req.params;
        const userId = req.user.userId;

        // Vérifications d'autorisation
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        const { data: product } = await supabase
            .from('products')
            .select('id, images')
            .eq('id', productId)
            .eq('shop_id', shop.id)
            .single();

        if (!product) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Filtrer l'image à supprimer
        const updatedImages = product.images.filter(
            img => img.public_id !== publicId
        );

        // Supprimer de Cloudinary
        await deleteFromCloudinary(publicId);

        // Supprimer les métadonnées
        await supabase
            .from('media')
            .delete()
            .eq('public_id', publicId);

        // Réorganiser les images (première = principale)
        updatedImages.forEach((img, index) => {
            img.is_primary = index === 0;
            img.order = index;
        });

        // Mettre à jour le produit
        await supabase
            .from('products')
            .update({ 
                images: updatedImages,
                image: updatedImages[0]?.url || null
            })
            .eq('id', productId);

        res.status(200).json({
            message: 'Image supprimée',
            images: updatedImages
        });
    } catch (error) {
        console.error('Erreur suppression image:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
};

/**
 * Réorganiser les images d'un produit
 * Logique : Change l'ordre et l'image principale
 */
export const reorderProductImages = async (req, res) => {
    try {
        const { productId } = req.params;
        const { images } = req.body; // [{public_id, url, order}]
        const userId = req.user.userId;

        // Vérifications...
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('id', productId)
            .eq('shop_id', shop.id)
            .single();

        if (!product) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Réorganiser
        const reorderedImages = await imageService.reorderProductImages(
            productId, 
            images
        );

        res.status(200).json({
            message: 'Images réorganisées',
            images: reorderedImages
        });
    } catch (error) {
        console.error('Erreur réorganisation:', error);
        res.status(500).json({ error: 'Erreur lors de la réorganisation' });
    }
};

/**
 * Récupérer toutes les images d'un utilisateur
 * Logique : Pour un dashboard de gestion des médias
 */
export const getUserMedia = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type } = req.query; // Filtrer par type

        let query = supabase
            .from('media')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (type) {
            query = query.eq('type', type);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        // Calculer l'espace utilisé
        const totalSize = data.reduce((sum, file) => sum + (file.file_size || 0), 0);

        res.status(200).json({
            media: data,
            count: data.length,
            totalSize: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        });
    } catch (error) {
        console.error('Erreur récupération médias:', error);
        res.status(500).json({ error: 'Erreur récupération médias' });
    }
};

/**
 * Nettoyer les images orphelines (Admin)
 * Logique : Maintenance pour libérer l'espace
 */
export const cleanupOrphanImages = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Réservé aux admins' });
        }

        const result = await imageService.cleanupOrphanImages();

        res.status(200).json({
            message: `Nettoyage terminé : ${result.deleted}/${result.total} images supprimées`,
            ...result
        });
    } catch (error) {
        console.error('Erreur nettoyage:', error);
        res.status(500).json({ error: 'Erreur lors du nettoyage' });
    }
};