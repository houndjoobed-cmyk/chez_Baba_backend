import searchService from '../services/searchService.js';
import { supabase } from '../config/supabase.js';

/**
 * Contrôleur pour les endpoints de recherche
 */

/**
 * Recherche principale de produits
 * Logique : Point d'entrée pour toutes les recherches
 */
export const searchProducts = async (req, res) => {
    try {
        // Extraction des paramètres depuis query string
        const {
            q,              // query
            category,
            min_price,
            max_price,
            brand,
            shop,
            tags,
            in_stock,
            sort,
            page,
            limit,
            lat,
            lng,
            radius
        } = req.query;

        // Parser les paramètres
        const searchParams = {
            query: q || '',
            category: category || null,
            minPrice: min_price ? parseFloat(min_price) : null,
            maxPrice: max_price ? parseFloat(max_price) : null,
            brand: brand || null,
            shopId: shop || null,
            tags: tags ? tags.split(',') : [],
            inStock: in_stock === 'true',
            sortBy: sort || 'relevance',
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        };

        // Ajouter la géolocalisation si fournie
        if (lat && lng) {
            searchParams.userLocation = {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            };
            searchParams.radius = radius ? parseFloat(radius) : 10; // 10km par défaut
        }

        // Effectuer la recherche
        const results = await searchService.searchProducts(searchParams);

        // Tracker l'utilisateur si connecté
        if (req.user) {
            await supabase.from('search_history').insert({
                user_id: req.user.userId,
                query: searchParams.query,
                filters: searchParams,
                results_count: results.pagination.total
            });
        }

        res.status(200).json(results);

    } catch (error) {
        console.error('Erreur recherche produits:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la recherche',
            message: error.message 
        });
    }
};

/**
 * Autocomplétion pendant la frappe
 * Logique : Résultats instantanés pour améliorer l'UX
 */
export const autocomplete = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(200).json([]);
        }

        const suggestions = await searchService.autocomplete(q);
        
        res.status(200).json(suggestions);

    } catch (error) {
        console.error('Erreur autocomplétion:', error);
        res.status(500).json([]);
    }
};

/**
 * Obtenir des suggestions de recherche
 * Logique : Aide l'utilisateur avec des termes populaires
 */
export const getSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        
        const suggestions = await searchService.getSuggestions(q || '');
        
        res.status(200).json({ suggestions });

    } catch (error) {
        console.error('Erreur suggestions:', error);
        res.status(500).json({ suggestions: [] });
    }
};

/**
 * Produits similaires
 * Logique : Recommandations basées sur un produit
 */
export const getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit } = req.query;

        const similar = await searchService.findSimilarProducts(
            productId, 
            parseInt(limit) || 10
        );

        res.status(200).json({ products: similar });

    } catch (error) {
        console.error('Erreur produits similaires:', error);
        res.status(500).json({ products: [] });
    }
};

/**
 * Recherches populaires
 * Logique : Affiche les tendances de recherche
 */
export const getPopularSearches = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const { data: searches, error } = await supabase
            .from('popular_searches')
            .select('term, count')
            .order('count', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        res.status(200).json({ searches });

    } catch (error) {
        console.error('Erreur recherches populaires:', error);
        res.status(500).json({ searches: [] });
    }
};

/**
 * Historique de recherche utilisateur
 * Logique : Permet de retrouver ses recherches précédentes
 */
export const getUserSearchHistory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 20 } = req.query;

        const { data: history, error } = await supabase
            .from('search_history')
            .select('query, filters, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        res.status(200).json({ history });

    } catch (error) {
        console.error('Erreur historique recherche:', error);
        res.status(500).json({ history: [] });
    }
};

/**
 * Effacer l'historique de recherche
 * Logique : Respect de la vie privée
 */
export const clearSearchHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { error } = await supabase
            .from('search_history')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;

        res.status(200).json({ 
            message: 'Historique de recherche effacé' 
        });

    } catch (error) {
        console.error('Erreur suppression historique:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la suppression' 
        });
    }
};

/**
 * Recherche de boutiques
 * Logique : Recherche spécifique aux boutiques avec géolocalisation
 */
export const searchShops = async (req, res) => {
    try {
        const { q, lat, lng, radius = 10 } = req.query;

        let query = supabase
            .from('shops')
            .select('*')
            .eq('status', 'active');

        // Recherche textuelle
        if (q) {
            query = query.or(`nom.ilike.%${q}%,description.ilike.%${q}%`);
        }

        const { data: shops, error } = await query;

        if (error) throw error;

        let results = shops;

        // Filtrer par distance si coordonnées fournies
        if (lat && lng) {
            const userLocation = { 
                lat: parseFloat(lat), 
                lng: parseFloat(lng) 
            };
            
            results = shops
                .map(shop => {
                    if (shop.latitude && shop.longitude) {
                        const distance = geolib.getDistance(
                            userLocation,
                            { lat: shop.latitude, lng: shop.longitude }
                        ) / 1000; // Convertir en km

                        return { ...shop, distance };
                    }
                    return { ...shop, distance: null };
                })
                .filter(shop => 
                    shop.distance === null || 
                    shop.distance <= parseFloat(radius)
                )
                .sort((a, b) => {
                    if (a.distance === null) return 1;
                    if (b.distance === null) return -1;
                    return a.distance - b.distance;
                });
        }

        res.status(200).json({ shops: results });

    } catch (error) {
        console.error('Erreur recherche boutiques:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la recherche de boutiques' 
        });
    }
};

/**
 * Recherche avancée avec filtres multiples
 * Logique : Endpoint pour recherche complexe
 */
export const advancedSearch = async (req, res) => {
    try {
        const { body } = req;

        // Validation des paramètres complexes
        const searchParams = {
            query: body.query || '',
            category: body.category,
            minPrice: body.filters?.price?.min,
            maxPrice: body.filters?.price?.max,
            brand: body.filters?.brand,
            shopId: body.filters?.shop,
            tags: body.filters?.tags || [],
            inStock: body.filters?.inStock,
            sortBy: body.sort || 'relevance',
            page: body.pagination?.page || 1,
            limit: body.pagination?.limit || 20,
            userLocation: body.location,
            radius: body.radius
        };

        const results = await searchService.searchProducts(searchParams);

        res.status(200).json(results);

    } catch (error) {
        console.error('Erreur recherche avancée:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la recherche avancée' 
        });
    }
};

/**
 * Tracking de clic sur résultat de recherche
 * Logique : Améliore les futures recherches
 */
export const trackSearchClick = async (req, res) => {
    try {
        const { searchId, productId } = req.body;

        await supabase
            .from('search_history')
            .update({ clicked_product_id: productId })
            .eq('id', searchId);

        // Incrémenter les vues du produit
        const { data: product } = await supabase
            .from('products')
            .select('views')
            .eq('id', productId)
            .single();

        if (product) {
            await supabase
                .from('products')
                .update({ views: (product.views || 0) + 1 })
                .eq('id', productId);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Erreur tracking:', error);
        res.status(200).json({ success: false });
    }
};