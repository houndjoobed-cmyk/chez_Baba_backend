import { supabase } from '../config/supabase.js';
import { createLogger } from '../utils/logger.js';
import redis from '../config/redis.js';

const logger = createLogger('CartService');

/**
 * Service de gestion du panier - Version améliorée
 * 
 * Utilise les RPC functions pour éviter les race conditions
 * Implémente le caching avec Redis
 * Gestion d'erreurs complète avec logging
 */
export class CartServiceImproved {
    
    /**
     * Ajouter un produit au panier - Version SÉCURISÉE
     * Utilise la RPC function atomique pour éviter les race conditions
     */
    static async addToCart(userId, productId, quantity = 1) {
        const startTime = Date.now();
        
        try {
            logger.info('Adding to cart', { userId, productId, quantity });
            
            // Valider les entrées
            if (!userId || !productId) {
                throw new Error('userId and productId are required');
            }
            
            if (quantity <= 0 || quantity > 10000) {
                throw new Error('Quantity must be between 1 and 10000');
            }
            
            // Appeler la RPC function atomique
            const { data, error } = await supabase.rpc('add_to_cart_atomic', {
                p_user_id: userId,
                p_product_id: productId,
                p_quantity: quantity
            });
            
            if (error) {
                logger.error('RPC error', error, { userId, productId });
                throw new Error(error.message);
            }
            
            if (!data.success) {
                logger.warn('RPC returned failure', null, { 
                    userId, 
                    productId, 
                    error: data.error 
                });
                
                // Traduire les erreurs RPC
                if (data.error === 'insufficient_stock') {
                    throw {
                        message: `Stock insuffisant. Disponible: ${data.available}`,
                        code: 'INSUFFICIENT_STOCK',
                        available: data.available,
                        status: 400
                    };
                }
                
                throw {
                    message: data.error || 'Failed to add to cart',
                    code: data.error,
                    status: 400
                };
            }
            
            // Invalider le cache du panier
            await this.invalidateCartCache(userId);
            
            logger.info('Added to cart successfully', {
                userId,
                productId,
                cartId: data.cart_id,
                duration: Date.now() - startTime
            });
            
            return {
                success: true,
                cartId: data.cart_id,
                message: 'Product added to cart'
            };
            
        } catch (error) {
            logger.error('Error adding to cart', error, { userId, productId });
            throw error;
        }
    }

    /**
     * Récupérer le panier avec caching
     */
    static async getCart(userId) {
        try {
            logger.info('Fetching cart', { userId });
            
            // 1. Vérifier le cache
            const cacheKey = `cart:${userId}`;
            const cachedCart = await redis.get(cacheKey);
            
            if (cachedCart) {
                logger.info('Cart from cache', { userId });
                return JSON.parse(cachedCart);
            }
            
            // 2. Récupérer de la base de données
            const { data, error } = await supabase
                .from('carts')
                .select(`
                    *,
                    products!inner(
                        id,
                        name,
                        price,
                        description,
                        images,
                        stock,
                        sku,
                        shops!inner(
                            id,
                            name,
                            slug,
                            logo
                        )
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // 3. Calculer les totaux
            const cartData = {
                items: data || [],
                subtotal: (data || []).reduce((sum, item) => 
                    sum + (item.products.price * item.quantity), 0
                ),
                itemCount: (data || []).reduce((sum, item) => 
                    sum + item.quantity, 0
                ),
                lastUpdated: new Date().toISOString()
            };
            
            // 4. Mettre en cache pour 30 minutes
            await redis.setex(cacheKey, 1800, JSON.stringify(cartData));
            
            logger.info('Cart fetched successfully', { userId, items: data?.length });
            return cartData;
            
        } catch (error) {
            logger.error('Error fetching cart', error, { userId });
            throw error;
        }
    }

    /**
     * Mettre à jour la quantité d'un produit
     */
    static async updateCartItem(userId, productId, quantity) {
        try {
            if (quantity <= 0) {
                // Supprimer l'article
                return this.removeFromCart(userId, productId);
            }
            
            logger.info('Updating cart item', { userId, productId, quantity });
            
            // Vérifier le stock avant de mettre à jour
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('stock')
                .eq('id', productId)
                .single();
            
            if (productError || !product) {
                throw new Error('Product not found');
            }
            
            if (product.stock < quantity) {
                throw {
                    message: `Stock insuffisant. Disponible: ${product.stock}`,
                    code: 'INSUFFICIENT_STOCK',
                    available: product.stock,
                    status: 400
                };
            }
            
            // Mettre à jour
            const { data, error } = await supabase
                .from('carts')
                .update({ quantity, updated_at: new Date() })
                .eq('user_id', userId)
                .eq('product_id', productId)
                .select()
                .single();
            
            if (error) throw error;
            
            // Invalider le cache
            await this.invalidateCartCache(userId);
            
            logger.info('Cart item updated', { userId, productId, quantity });
            return data;
            
        } catch (error) {
            logger.error('Error updating cart item', error, { userId, productId });
            throw error;
        }
    }

    /**
     * Supprimer un produit du panier
     */
    static async removeFromCart(userId, productId) {
        try {
            logger.info('Removing from cart', { userId, productId });
            
            const { error } = await supabase
                .from('carts')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', productId);
            
            if (error) throw error;
            
            // Invalider le cache
            await this.invalidateCartCache(userId);
            
            logger.info('Removed from cart', { userId, productId });
            return { success: true };
            
        } catch (error) {
            logger.error('Error removing from cart', error, { userId, productId });
            throw error;
        }
    }

    /**
     * Vider le panier
     */
    static async clearCart(userId) {
        try {
            logger.info('Clearing cart', { userId });
            
            const { error } = await supabase
                .from('carts')
                .delete()
                .eq('user_id', userId);
            
            if (error) throw error;
            
            // Invalider le cache
            await this.invalidateCartCache(userId);
            
            logger.info('Cart cleared', { userId });
            return { success: true };
            
        } catch (error) {
            logger.error('Error clearing cart', error, { userId });
            throw error;
        }
    }

    /**
     * Invalider le cache du panier
     */
    static async invalidateCartCache(userId) {
        try {
            const cacheKey = `cart:${userId}`;
            await redis.del(cacheKey);
            logger.info('Cart cache invalidated', { userId });
        } catch (error) {
            logger.warn('Error invalidating cache', error, { userId });
            // Ne pas lever l'erreur, juste log
        }
    }

    /**
     * Ajouter à la wishlist
     */
    static async addToWishlist(userId, productId) {
        try {
            logger.info('Adding to wishlist', { userId, productId });
            
            // Vérifier si le produit existe
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('id', productId)
                .single();
            
            if (productError || !product) {
                throw new Error('Product not found');
            }
            
            // Ajouter à la wishlist
            const { data, error } = await supabase
                .from('wishlists')
                .insert([{
                    user_id: userId,
                    product_id: productId
                }])
                .select()
                .single();
            
            if (error && error.code !== '23505') { // 23505 = duplicate key
                throw error;
            }
            
            // Invalider le cache wishlist
            await redis.del(`wishlist:${userId}`);
            
            logger.info('Added to wishlist', { userId, productId });
            return { success: true };
            
        } catch (error) {
            logger.error('Error adding to wishlist', error, { userId, productId });
            throw error;
        }
    }

    /**
     * Récupérer la wishlist
     */
    static async getWishlist(userId) {
        try {
            // Vérifier le cache
            const cachedWishlist = await redis.get(`wishlist:${userId}`);
            if (cachedWishlist) {
                return JSON.parse(cachedWishlist);
            }
            
            // Récupérer de la base
            const { data, error } = await supabase
                .from('wishlists')
                .select('products!inner(*)')
                .eq('user_id', userId);
            
            if (error) throw error;
            
            const wishlist = (data || []).map(item => item.products);
            
            // Cacher 1 heure
            await redis.setex(`wishlist:${userId}`, 3600, JSON.stringify(wishlist));
            
            return wishlist;
            
        } catch (error) {
            logger.error('Error fetching wishlist', error, { userId });
            throw error;
        }
    }

    /**
     * Supprimer de la wishlist
     */
    static async removeFromWishlist(userId, productId) {
        try {
            logger.info('Removing from wishlist', { userId, productId });
            
            const { error } = await supabase
                .from('wishlists')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', productId);
            
            if (error) throw error;
            
            // Invalider le cache
            await redis.del(`wishlist:${userId}`);
            
            logger.info('Removed from wishlist', { userId, productId });
            return { success: true };
            
        } catch (error) {
            logger.error('Error removing from wishlist', error, { userId, productId });
            throw error;
        }
    }
}

export default CartServiceImproved;
