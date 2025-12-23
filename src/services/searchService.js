import Fuse from 'fuse.js';
import { supabase } from '../config/supabase.js';
import Redis from 'ioredis';
import geolib from 'geolib';

/**
 * Service de recherche avancée
 * Combine recherche full-text, filtres et géolocalisation
 */
class SearchService {
    constructor() {
        // Redis pour le cache (optionnel)
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            // Désactiver si Redis n'est pas disponible
            lazyConnect: true,
            enableOfflineQueue: false
        });

        // Configuration Fuse.js pour recherche fuzzy
        this.fuseOptions = {
            // Seuil de correspondance (0 = parfait, 1 = tout correspond)
            threshold: 0.3,
            // Distance de recherche (nombre de caractères)
            distance: 100,
            // Inclure le score de correspondance
            includeScore: true,
            // Champs à rechercher avec leur poids
            keys: [
                { name: 'titre', weight: 0.4 },        // 40% d'importance
                { name: 'description', weight: 0.2 },  // 20%
                { name: 'brand', weight: 0.2 },        // 20%
                { name: 'tags', weight: 0.1 },         // 10%
                { name: 'category.nom', weight: 0.1 }  // 10%
            ],
            // Options avancées
            minMatchCharLength: 2,     // Min 2 caractères pour matcher
            shouldSort: true,           // Trier par score
            findAllMatches: true,       // Trouver toutes les correspondances
            ignoreLocation: false,      // Considérer la position dans le texte
            useExtendedSearch: true     // Permettre des opérateurs de recherche
        };
    }

    /**
     * Recherche principale avec tous les filtres
     * Logique : Combine plusieurs stratégies de recherche
     */
    async searchProducts({
        query = '',           // Terme de recherche
        category = null,       // ID catégorie
        minPrice = null,       // Prix minimum
        maxPrice = null,       // Prix maximum
        brand = null,          // Marque
        shopId = null,         // ID boutique
        tags = [],            // Tags produit
        inStock = null,        // En stock uniquement
        sortBy = 'relevance', // Tri (relevance, price_asc, price_desc, newest, popular)
        page = 1,             // Pagination
        limit = 20,           // Résultats par page
        userLocation = null,   // {lat, lng} pour tri par distance
        radius = null         // Rayon en km
    }) {
        try {
            // 1. Vérifier le cache Redis
            const cacheKey = this.generateCacheKey(arguments[0]);
            const cached = await this.getFromCache(cacheKey);
            
            if (cached) {
                console.log('✅ Résultats depuis cache');
                return cached;
            }

            // 2. Construire la requête de base
            let dbQuery = supabase
                .from('products')
                .select(`
                    *,
                    categories!inner (id, nom, slug),
                    shops!inner (id, nom, logo, latitude, longitude)
                `)
                .eq('status', 'active');

            // 3. Appliquer les filtres
            if (category) {
                dbQuery = dbQuery.eq('category_id', category);
            }

            if (minPrice !== null) {
                dbQuery = dbQuery.gte('prix', minPrice);
            }

            if (maxPrice !== null) {
                dbQuery = dbQuery.lte('prix', maxPrice);
            }

            if (brand) {
                dbQuery = dbQuery.ilike('brand', `%${brand}%`);
            }

            if (shopId) {
                dbQuery = dbQuery.eq('shop_id', shopId);
            }

            if (inStock) {
                dbQuery = dbQuery.gt('stock', 0);
            }

            if (tags.length > 0) {
                // PostgreSQL array overlap operator
                dbQuery = dbQuery.overlaps('tags', tags);
            }

            // 4. Recherche full-text si query présent
            if (query && query.trim() !== '') {
                // Utiliser la recherche PostgreSQL full-text
                const searchQuery = query
                    .trim()
                    .split(' ')
                    .filter(word => word.length > 2)
                    .join(' & '); // Opérateur AND

                dbQuery = dbQuery.textSearch('search_vector', searchQuery, {
                    type: 'websearch',
                    config: 'french'
                });
            }

            // 5. Exécuter la requête
            const { data: products, error } = await dbQuery;

            if (error) {
                console.error('Erreur recherche DB:', error);
                throw error;
            }

            // 6. Filtrer par géolocalisation si nécessaire
            let filteredProducts = products;
            
            if (userLocation && radius) {
                filteredProducts = this.filterByDistance(
                    products,
                    userLocation,
                    radius
                );
            }

            // 7. Si recherche textuelle, améliorer avec Fuse.js
            if (query && query.trim() !== '') {
                filteredProducts = this.enhanceWithFuzzySearch(
                    filteredProducts,
                    query
                );
            }

            // 8. Appliquer le tri
            const sortedProducts = this.sortProducts(
                filteredProducts,
                sortBy,
                userLocation
            );

            // 9. Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

            // 10. Préparer la réponse
            const response = {
                products: paginatedProducts,
                pagination: {
                    page,
                    limit,
                    total: sortedProducts.length,
                    totalPages: Math.ceil(sortedProducts.length / limit),
                    hasMore: endIndex < sortedProducts.length
                },
                filters: {
                    query,
                    category,
                    minPrice,
                    maxPrice,
                    brand,
                    tags,
                    sortBy
                },
                suggestions: await this.getSuggestions(query),
                facets: await this.getFacets(filteredProducts)
            };

            // 11. Mettre en cache
            await this.saveToCache(cacheKey, response, 300); // 5 minutes

            // 12. Enregistrer dans l'historique
            await this.saveSearchHistory({
                query,
                filters: response.filters,
                resultsCount: response.pagination.total
            });

            return response;

        } catch (error) {
            console.error('Erreur recherche:', error);
            throw error;
        }
    }

    /**
     * Recherche fuzzy avec Fuse.js
     * Logique : Trouve des correspondances même avec des fautes de frappe
     */
    enhanceWithFuzzySearch(products, query) {
        const fuse = new Fuse(products, this.fuseOptions);
        const results = fuse.search(query);
        
        // Fuse retourne [{item: product, score: 0.x}, ...]
        return results.map(result => ({
            ...result.item,
            relevanceScore: 1 - result.score // Inverser pour avoir 1 = meilleur
        }));
    }

    /**
     * Filtrage par distance géographique
     * Logique : Utilise Haversine formula pour calculer les distances
     */
    filterByDistance(products, userLocation, radiusKm) {
        return products.filter(product => {
            if (!product.shops?.latitude || !product.shops?.longitude) {
                return false;
            }

            const distance = geolib.getDistance(
                { 
                    latitude: userLocation.lat, 
                    longitude: userLocation.lng 
                },
                { 
                    latitude: product.shops.latitude, 
                    longitude: product.shops.longitude 
                }
            );

            // Convertir mètres en km
            const distanceKm = distance / 1000;
            
            // Ajouter la distance au produit pour tri
            product.distance = distanceKm;
            
            return distanceKm <= radiusKm;
        });
    }

    /**
     * Tri des résultats
     * Logique : Différentes stratégies selon le critère
     */
    sortProducts(products, sortBy, userLocation = null) {
        const sorted = [...products];

        switch (sortBy) {
            case 'price_asc':
                return sorted.sort((a, b) => a.prix - b.prix);
                
            case 'price_desc':
                return sorted.sort((a, b) => b.prix - a.prix);
                
            case 'newest':
                return sorted.sort((a, b) => 
                    new Date(b.created_at) - new Date(a.created_at)
                );
                
            case 'popular':
                // Combiner vues et ventes
                return sorted.sort((a, b) => {
                    const scoreA = (a.views || 0) + (a.sales_count || 0) * 10;
                    const scoreB = (b.views || 0) + (b.sales_count || 0) * 10;
                    return scoreB - scoreA;
                });
                
            case 'distance':
                if (userLocation) {
                    return sorted.sort((a, b) => 
                        (a.distance || 999999) - (b.distance || 999999)
                    );
                }
                return sorted;
                
            case 'relevance':
            default:
                // Utiliser le score de pertinence si disponible
                return sorted.sort((a, b) => 
                    (b.relevanceScore || 0) - (a.relevanceScore || 0)
                );
        }
    }

    /**
     * Obtenir les facettes (compteurs pour filtres)
     * Logique : Aide l'UI à afficher combien de produits par filtre
     */
    async getFacets(products) {
        const facets = {
            categories: {},
            brands: {},
            priceRanges: {
                '0-10000': 0,
                '10000-50000': 0,
                '50000-100000': 0,
                '100000+': 0
            },
            inStock: 0,
            shops: {}
        };

        products.forEach(product => {
            // Catégories
            const catName = product.categories?.nom;
            if (catName) {
                facets.categories[catName] = (facets.categories[catName] || 0) + 1;
            }

            // Marques
            if (product.brand) {
                facets.brands[product.brand] = (facets.brands[product.brand] || 0) + 1;
            }

            // Gammes de prix
            if (product.prix < 10000) {
                facets.priceRanges['0-10000']++;
            } else if (product.prix < 50000) {
                facets.priceRanges['10000-50000']++;
            } else if (product.prix < 100000) {
                facets.priceRanges['50000-100000']++;
            } else {
                facets.priceRanges['100000+']++;
            }

            // Stock
            if (product.stock > 0) {
                facets.inStock++;
            }

            // Boutiques
            const shopName = product.shops?.nom;
            if (shopName) {
                facets.shops[shopName] = (facets.shops[shopName] || 0) + 1;
            }
        });

        return facets;
    }

    /**
     * Obtenir des suggestions de recherche
     * Logique : Basé sur l'historique et les recherches populaires
     */
    async getSuggestions(query) {
        if (!query || query.length < 2) {
            return [];
        }

        try {
            // 1. Suggestions depuis la table dédiée
            const { data: suggestions } = await supabase
                .from('search_suggestions')
                .select('suggestion, weight')
                .ilike('term', `${query}%`)
                .order('weight', { ascending: false })
                .limit(5);

            // 2. Recherches populaires similaires
            const { data: popular } = await supabase
                .from('popular_searches')
                .select('term, count')
                .ilike('term', `%${query}%`)
                .order('count', { ascending: false })
                .limit(5);

            // 3. Produits populaires correspondants
            const { data: products } = await supabase
                .from('products')
                .select('titre')
                .ilike('titre', `%${query}%`)
                .order('sales_count', { ascending: false })
                .limit(5);

            // Combiner et dédupliquer
            const allSuggestions = [
                ...suggestions.map(s => s.suggestion),
                ...popular.map(p => p.term),
                ...products.map(p => p.titre)
            ];

            // Retourner unique
            return [...new Set(allSuggestions)].slice(0, 10);

        } catch (error) {
            console.error('Erreur suggestions:', error);
            return [];
        }
    }

    /**
     * Recherche par autocomplétion
     * Logique : Recherche instantanée pendant la frappe
     */
    async autocomplete(query) {
        if (query.length < 2) {
            return [];
        }

        const cacheKey = `autocomplete:${query}`;
        const cached = await this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            // Recherche rapide sur les titres uniquement
            const { data } = await supabase
                .from('products')
                .select('id, titre, image, prix')
                .ilike('titre', `${query}%`)
                .eq('status', 'active')
                .limit(10);

            await this.saveToCache(cacheKey, data, 60); // Cache 1 minute
            
            return data;
        } catch (error) {
            console.error('Erreur autocomplétion:', error);
            return [];
        }
    }

    /**
     * Recherche par similarité (produits similaires)
     * Logique : Trouve des produits avec caractéristiques similaires
     */
    async findSimilarProducts(productId, limit = 10) {
        try {
            // Récupérer le produit source
            const { data: sourceProduct } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (!sourceProduct) {
                return [];
            }

            // Rechercher des produits similaires
            let query = supabase
                .from('products')
                .select(`
                    *,
                    categories (nom),
                    shops (nom, logo)
                `)
                .eq('status', 'active')
                .neq('id', productId); // Exclure le produit source

            // Même catégorie
            query = query.eq('category_id', sourceProduct.category_id);

            // Gamme de prix similaire (±30%)
            const priceLower = sourceProduct.prix * 0.7;
            const priceUpper = sourceProduct.prix * 1.3;
            query = query.gte('prix', priceLower).lte('prix', priceUpper);

            // Même marque si disponible
            if (sourceProduct.brand) {
                query = query.eq('brand', sourceProduct.brand);
            }

            const { data: similarProducts } = await query.limit(limit * 2);

            // Calculer un score de similarité
            const scored = similarProducts.map(product => {
                let score = 0;
                
                // Points pour même marque
                if (product.brand === sourceProduct.brand) score += 3;
                
                // Points pour prix proche
                const priceDiff = Math.abs(product.prix - sourceProduct.prix);
                const pricePercent = priceDiff / sourceProduct.prix;
                if (pricePercent < 0.1) score += 3;
                else if (pricePercent < 0.2) score += 2;
                else if (pricePercent < 0.3) score += 1;
                
                // Points pour tags communs
                if (sourceProduct.tags && product.tags) {
                    const commonTags = sourceProduct.tags.filter(tag => 
                        product.tags.includes(tag)
                    );
                    score += commonTags.length;
                }
                
                return { ...product, similarityScore: score };
            });

            // Trier par score et retourner les meilleurs
            return scored
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, limit);

        } catch (error) {
            console.error('Erreur produits similaires:', error);
            return [];
        }
    }

    /**
     * Sauvegarder l'historique de recherche
     * Logique : Analyse des tendances et amélioration des suggestions
     */
    async saveSearchHistory({ query, filters, resultsCount }) {
        try {
            // Sauvegarder dans l'historique
            await supabase.from('search_history').insert({
                query,
                filters,
                results_count: resultsCount
            });

            // Mettre à jour les recherches populaires
            if (query && query.trim()) {
                const { data: existing } = await supabase
                    .from('popular_searches')
                    .select('*')
                    .eq('term', query.toLowerCase())
                    .single();

                if (existing) {
                    // Incrémenter le compteur
                    await supabase
                        .from('popular_searches')
                        .update({ 
                            count: existing.count + 1,
                            last_searched: new Date()
                        })
                        .eq('id', existing.id);
                } else {
                    // Créer nouvelle entrée
                    await supabase
                        .from('popular_searches')
                        .insert({ 
                            term: query.toLowerCase(),
                            count: 1 
                        });
                }
            }
        } catch (error) {
            console.error('Erreur sauvegarde historique:', error);
        }
    }

    /**
     * Gestion du cache Redis
     * Logique : Accélère les recherches répétées
     */
    async getFromCache(key) {
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            // Redis non disponible, continuer sans cache
            return null;
        }
    }

    async saveToCache(key, data, ttl = 300) {
        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
        } catch (error) {
            // Redis non disponible, continuer sans cache
        }
    }

    generateCacheKey(params) {
        // Créer une clé unique basée sur les paramètres
        return `search:${JSON.stringify(params)}`;
    }

    /**
     * Nettoyer le cache
     * Logique : Appelé lors de mise à jour de produits
     */
    async clearCache(pattern = 'search:*') {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } catch (error) {
            console.error('Erreur clear cache:', error);
        }
    }
}

export default new SearchService();