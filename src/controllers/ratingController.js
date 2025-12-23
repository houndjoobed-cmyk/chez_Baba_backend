import ratingService from '../services/ratingService.js';

/**
 * Contrôleur pour la gestion des notes
 */

/**
 * Noter un produit
 * Logique : Point d'entrée pour noter un produit
 */
export const rateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { rating } = req.body;
        const userId = req.user.userId;

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ 
                error: 'La note doit être entre 1 et 5' 
            });
        }

        const result = await ratingService.rateProduct(
            userId,
            productId,
            parseInt(rating)
        );

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur notation produit:', error);
        res.status(400).json({ 
            error: error.message || 'Erreur lors de la notation' 
        });
    }
};

/**
 * Noter une boutique
 */
export const rateShop = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { rating } = req.body;
        const userId = req.user.userId;

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ 
                error: 'La note doit être entre 1 et 5' 
            });
        }

        const result = await ratingService.rateShop(
            userId,
            shopId,
            parseInt(rating)
        );

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur notation boutique:', error);
        res.status(400).json({ 
            error: error.message || 'Erreur lors de la notation' 
        });
    }
};

/**
 * Obtenir la note d'un produit par l'utilisateur connecté
 */
export const getUserProductRating = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.userId;

        const rating = await ratingService.getUserProductRating(userId, productId);

        res.status(200).json({ 
            rating: rating || null,
            hasRated: rating !== null 
        });

    } catch (error) {
        console.error('Erreur récupération note:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération' 
        });
    }
};

/**
 * Obtenir la note d'une boutique par l'utilisateur connecté
 */
export const getUserShopRating = async (req, res) => {
    try {
        const { shopId } = req.params;
        const userId = req.user.userId;

        const rating = await ratingService.getUserShopRating(userId, shopId);

        res.status(200).json({ 
            rating: rating || null,
            hasRated: rating !== null 
        });

    } catch (error) {
        console.error('Erreur récupération note boutique:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération' 
        });
    }
};

/**
 * Obtenir la distribution des notes d'un produit
 * Logique : Pour afficher un graphique des notes
 */
export const getProductRatingDistribution = async (req, res) => {
    try {
        const { productId } = req.params;

        const distribution = await ratingService.getProductRatingDistribution(productId);

        res.status(200).json(distribution);

    } catch (error) {
        console.error('Erreur distribution notes:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération' 
        });
    }
};

/**
 * Obtenir la distribution des notes d'une boutique
 */
export const getShopRatingDistribution = async (req, res) => {
    try {
        const { shopId } = req.params;

        const distribution = await ratingService.getShopRatingDistribution(shopId);

        res.status(200).json(distribution);

    } catch (error) {
        console.error('Erreur distribution notes boutique:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération' 
        });
    }
};

/**
 * Obtenir les produits les mieux notés
 * Logique : Pour la page d'accueil ou section "Top produits"
 */
export const getTopRatedProducts = async (req, res) => {
    try {
        const { limit = 10, minRatings = 5 } = req.query;

        const products = await ratingService.getTopRatedProducts(
            parseInt(limit),
            parseInt(minRatings)
        );

        res.status(200).json({ products });

    } catch (error) {
        console.error('Erreur produits mieux notés:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération' 
        });
    }
};

/**
 * Obtenir les boutiques les mieux notées
 */
export const getTopRatedShops = async (req, res) => {
    try {
        const { limit = 10, minRatings = 5 } = req.query;

        const shops = await ratingService.getTopRatedShops(
            parseInt(limit),
            parseInt(minRatings)
        );

        res.status(200).json({ shops });

    } catch (error) {
        console.error('Erreur boutiques mieux notées:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération' 
        });
    }
};

/**
 * Obtenir les statistiques globales (Admin)
 * Logique : Pour le dashboard admin
 */
export const getGlobalRatingStats = async (req, res) => {
    try {
        const stats = await ratingService.getGlobalRatingStats();

        res.status(200).json(stats);

    } catch (error) {
        console.error('Erreur stats globales:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération' 
        });
    }
};

/**
 * Vérifier si l'utilisateur peut noter
 * Logique : Vérifie l'achat avant d'afficher l'interface de notation
 */
export const canUserRate = async (req, res) => {
    try {
        const { type, id } = req.params; // type = 'product' ou 'shop'
        const userId = req.user.userId;

        let canRate = false;
        let hasRated = false;
        let currentRating = null;

        if (type === 'product') {
            canRate = await ratingService.hasUserPurchasedProduct(userId, id);
            currentRating = await ratingService.getUserProductRating(userId, id);
            hasRated = currentRating !== null;
        } else if (type === 'shop') {
            canRate = await ratingService.hasUserPurchasedFromShop(userId, id);
            currentRating = await ratingService.getUserShopRating(userId, id);
            hasRated = currentRating !== null;
        }

        res.status(200).json({
            canRate,
            hasRated,
            currentRating
        });

    } catch (error) {
        console.error('Erreur vérification notation:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la vérification' 
        });
    }
};