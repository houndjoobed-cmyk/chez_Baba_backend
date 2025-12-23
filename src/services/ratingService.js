import { supabase } from '../config/supabase.js';

/**
 * Service de gestion des notes
 * Gère les notes des produits et boutiques
 */
class RatingService {
    /**
     * Vérifier si un utilisateur a acheté un produit
     * Logique : On ne peut noter que ce qu'on a acheté
     */
    async hasUserPurchasedProduct(userId, productId) {
        try {
            const { data, error } = await supabase
                .from('order_items')
                .select(`
                    id,
                    orders!inner (
                        client_id,
                        status
                    )
                `)
                .eq('product_id', productId)
                .eq('orders.client_id', userId)
                .eq('orders.status', 'delivered');

            if (error) throw error;

            return data && data.length > 0;
        } catch (error) {
            console.error('Erreur vérification achat:', error);
            return false;
        }
    }

    /**
     * Vérifier si un utilisateur a acheté dans une boutique
     * Logique : On ne peut noter que les boutiques où on a acheté
     */
    async hasUserPurchasedFromShop(userId, shopId) {
        try {
            const { data, error } = await supabase
                .from('order_items')
                .select(`
                    id,
                    orders!inner (
                        client_id,
                        status
                    )
                `)
                .eq('shop_id', shopId)
                .eq('orders.client_id', userId)
                .eq('orders.status', 'delivered');

            if (error) throw error;

            return data && data.length > 0;
        } catch (error) {
            console.error('Erreur vérification achat boutique:', error);
            return false;
        }
    }

    /**
     * Noter un produit
     * Logique : Vérifie l'achat, puis crée ou met à jour la note
     */
    async rateProduct(userId, productId, rating) {
        try {
            // Validation de la note
            if (rating < 1 || rating > 5) {
                throw new Error('La note doit être entre 1 et 5');
            }

            // Vérifier que le produit existe
            const { data: product } = await supabase
                .from('products')
                .select('id, titre')
                .eq('id', productId)
                .single();

            if (!product) {
                throw new Error('Produit non trouvé');
            }

            // Vérifier l'achat (optionnel selon vos besoins)
            const hasPurchased = await this.hasUserPurchasedProduct(userId, productId);
            if (!hasPurchased) {
                throw new Error('Vous devez avoir acheté ce produit pour le noter');
            }

            // Vérifier si une note existe déjà
            const { data: existingRating } = await supabase
                .from('product_ratings')
                .select('*')
                .eq('product_id', productId)
                .eq('user_id', userId)
                .single();

            let result;

            if (existingRating) {
                // Mettre à jour la note existante
                const { data, error } = await supabase
                    .from('product_ratings')
                    .update({ 
                        rating,
                        updated_at: new Date()
                    })
                    .eq('id', existingRating.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Créer une nouvelle note
                const { data, error } = await supabase
                    .from('product_ratings')
                    .insert([{
                        product_id: productId,
                        user_id: userId,
                        rating
                    }])
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            // Récupérer les nouvelles statistiques
            const { data: updatedProduct } = await supabase
                .from('products')
                .select('rating_average, rating_count')
                .eq('id', productId)
                .single();

            return {
                success: true,
                rating: result,
                stats: updatedProduct,
                message: existingRating ? 'Note mise à jour' : 'Produit noté avec succès'
            };

        } catch (error) {
            console.error('Erreur notation produit:', error);
            throw error;
        }
    }

    /**
     * Noter une boutique
     * Logique : Similaire aux produits mais pour les boutiques
     */
    async rateShop(userId, shopId, rating) {
        try {
            // Validation
            if (rating < 1 || rating > 5) {
                throw new Error('La note doit être entre 1 et 5');
            }

            // Vérifier que la boutique existe
            const { data: shop } = await supabase
                .from('shops')
                .select('id, nom')
                .eq('id', shopId)
                .single();

            if (!shop) {
                throw new Error('Boutique non trouvée');
            }

            // Vérifier l'achat
            const hasPurchased = await this.hasUserPurchasedFromShop(userId, shopId);
            if (!hasPurchased) {
                throw new Error('Vous devez avoir acheté dans cette boutique pour la noter');
            }

            // Vérifier si une note existe déjà
            const { data: existingRating } = await supabase
                .from('shop_ratings')
                .select('*')
                .eq('shop_id', shopId)
                .eq('user_id', userId)
                .single();

            let result;

            if (existingRating) {
                // Mettre à jour
                const { data, error } = await supabase
                    .from('shop_ratings')
                    .update({ 
                        rating,
                        updated_at: new Date()
                    })
                    .eq('id', existingRating.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Créer
                const { data, error } = await supabase
                    .from('shop_ratings')
                    .insert([{
                        shop_id: shopId,
                        user_id: userId,
                        rating
                    }])
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            // Récupérer les nouvelles statistiques
            const { data: updatedShop } = await supabase
                .from('shops')
                .select('rating_average, rating_count')
                .eq('id', shopId)
                .single();

            return {
                success: true,
                rating: result,
                stats: updatedShop,
                message: existingRating ? 'Note mise à jour' : 'Boutique notée avec succès'
            };

        } catch (error) {
            console.error('Erreur notation boutique:', error);
            throw error;
        }
    }

    /**
     * Obtenir la note d'un utilisateur pour un produit
     * Logique : Pour afficher la note actuelle de l'utilisateur
     */
    async getUserProductRating(userId, productId) {
        try {
            const { data, error } = await supabase
                .from('product_ratings')
                .select('rating')
                .eq('product_id', productId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // Ignore "not found"
                throw error;
            }

            return data?.rating || null;
        } catch (error) {
            console.error('Erreur récupération note produit:', error);
            return null;
        }
    }

    /**
     * Obtenir la note d'un utilisateur pour une boutique
     */
    async getUserShopRating(userId, shopId) {
        try {
            const { data, error } = await supabase
                .from('shop_ratings')
                .select('rating')
                .eq('shop_id', shopId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data?.rating || null;
        } catch (error) {
            console.error('Erreur récupération note boutique:', error);
            return null;
        }
    }

    /**
     * Obtenir la distribution des notes d'un produit
     * Logique : Pour afficher un histogramme des notes
     */
    async getProductRatingDistribution(productId) {
        try {
            // Initialiser la distribution
            const distribution = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0
            };

            // Récupérer toutes les notes
            const { data: ratings, error } = await supabase
                .from('product_ratings')
                .select('rating')
                .eq('product_id', productId);

            if (error) throw error;

            // Compter les occurrences
            ratings.forEach(r => {
                distribution[r.rating]++;
            });

            // Calculer les pourcentages
            const total = ratings.length;
            const percentages = {};
            
            for (let star = 1; star <= 5; star++) {
                percentages[star] = total > 0 
                    ? Math.round((distribution[star] / total) * 100) 
                    : 0;
            }

            return {
                distribution,
                percentages,
                total
            };

        } catch (error) {
            console.error('Erreur distribution notes:', error);
            return {
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                total: 0
            };
        }
    }

    /**
     * Obtenir la distribution des notes d'une boutique
     */
    async getShopRatingDistribution(shopId) {
        try {
            const distribution = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0
            };

            const { data: ratings, error } = await supabase
                .from('shop_ratings')
                .select('rating')
                .eq('shop_id', shopId);

            if (error) throw error;

            ratings.forEach(r => {
                distribution[r.rating]++;
            });

            const total = ratings.length;
            const percentages = {};
            
            for (let star = 1; star <= 5; star++) {
                percentages[star] = total > 0 
                    ? Math.round((distribution[star] / total) * 100) 
                    : 0;
            }

            return {
                distribution,
                percentages,
                total
            };

        } catch (error) {
            console.error('Erreur distribution notes boutique:', error);
            return {
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                total: 0
            };
        }
    }

    /**
     * Obtenir les produits les mieux notés
     * Logique : Pour une section "Meilleures ventes"
     */
    async getTopRatedProducts(limit = 10, minRatingCount = 5) {
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    categories (nom),
                    shops (nom, logo)
                `)
                .eq('status', 'active')
                .gte('rating_count', minRatingCount)
                .order('rating_average', { ascending: false })
                .order('rating_count', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erreur produits mieux notés:', error);
            return [];
        }
    }

    /**
     * Obtenir les boutiques les mieux notées
     */
    async getTopRatedShops(limit = 10, minRatingCount = 5) {
        try {
            const { data, error } = await supabase
                .from('shops')
                .select('*')
                .eq('status', 'active')
                .gte('rating_count', minRatingCount)
                .order('rating_average', { ascending: false })
                .order('rating_count', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erreur boutiques mieux notées:', error);
            return [];
        }
    }

    /**
     * Calculer le score de confiance d'une note moyenne
     * Logique : Une moyenne de 5 étoiles avec 2 avis vaut moins qu'une moyenne de 4.5 avec 100 avis
     */
    calculateConfidenceScore(average, count) {
        // Méthode bayésienne simplifiée
        const C = 3; // Moyenne globale attendue
        const m = 10; // Nombre minimum de votes pour avoir du poids
        
        // Score = (average * count + C * m) / (count + m)
        const score = (average * count + C * m) / (count + m);
        
        return Math.round(score * 100) / 100; // Arrondir à 2 décimales
    }

    /**
     * Obtenir les statistiques globales de notation
     * Logique : Pour un dashboard admin
     */
    async getGlobalRatingStats() {
        try {
            // Statistiques produits
            const { data: productStats } = await supabase
                .from('products')
                .select('rating_average, rating_count')
                .eq('status', 'active')
                .gt('rating_count', 0);

            // Statistiques boutiques
            const { data: shopStats } = await supabase
                .from('shops')
                .select('rating_average, rating_count')
                .eq('status', 'active')
                .gt('rating_count', 0);

            // Calculer les moyennes globales
            const productAvg = productStats?.length > 0
                ? productStats.reduce((sum, p) => sum + p.rating_average, 0) / productStats.length
                : 0;

            const shopAvg = shopStats?.length > 0
                ? shopStats.reduce((sum, s) => sum + s.rating_average, 0) / shopStats.length
                : 0;

            const totalRatings = 
                (productStats?.reduce((sum, p) => sum + p.rating_count, 0) || 0) +
                (shopStats?.reduce((sum, s) => sum + s.rating_count, 0) || 0);

            return {
                products: {
                    averageRating: Math.round(productAvg * 100) / 100,
                    totalProducts: productStats?.length || 0,
                    totalRatings: productStats?.reduce((sum, p) => sum + p.rating_count, 0) || 0
                },
                shops: {
                    averageRating: Math.round(shopAvg * 100) / 100,
                    totalShops: shopStats?.length || 0,
                    totalRatings: shopStats?.reduce((sum, s) => sum + s.rating_count, 0) || 0
                },
                global: {
                    totalRatings
                }
            };

        } catch (error) {
            console.error('Erreur stats globales:', error);
            return null;
        }
    }
}

export default new RatingService();