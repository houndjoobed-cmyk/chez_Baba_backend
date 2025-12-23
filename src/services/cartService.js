import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service de gestion du panier et des favoris
 * Gère la persistance, synchronisation et validation
 */
class CartService {
    
    /**
     * GESTION DU PANIER
     */
    
    /**
     * Ajouter un produit au panier
     * Logique : Vérifie le stock, ajoute ou met à jour la quantité
     */
    async addToCart(userId, productId, quantity = 1) {
        try {
            // 1. Vérifier que le produit existe et est disponible
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*, shops!inner(status)')
                .eq('id', productId)
                .eq('status', 'active')
                .single();

            if (productError || !product) {
                throw new Error('Produit non disponible');
            }

            if (product.stock < quantity) {
                throw new Error(`Stock insuffisant. Disponible: ${product.stock}`);
            }

            if (product.shops.status !== 'active') {
                throw new Error('La boutique de ce produit n\'est pas active');
            }

            // 2. Vérifier si le produit est déjà dans le panier
            const { data: existingItem } = await supabase
                .from('carts')
                .select('*')
                .eq('user_id', userId)
                .eq('product_id', productId)
                .single();

            let result;

            if (existingItem) {
                // 3a. Mettre à jour la quantité
                const newQuantity = existingItem.quantity + quantity;
                
                if (newQuantity > product.stock) {
                    throw new Error(`Stock insuffisant. Maximum: ${product.stock}`);
                }

                const { data, error } = await supabase
                    .from('carts')
                    .update({ 
                        quantity: newQuantity,
                        updated_at: new Date()
                    })
                    .eq('id', existingItem.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // 3b. Ajouter au panier
                const { data, error } = await supabase
                    .from('carts')
                    .insert([{
                        user_id: userId,
                        product_id: productId,
                        shop_id: product.shop_id,
                        quantity: quantity
                    }])
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            // 4. Retourner le panier mis à jour
            const updatedCart = await this.getCart(userId);
            
            return {
                success: true,
                message: 'Produit ajouté au panier',
                item: result,
                cart: updatedCart
            };

        } catch (error) {
            console.error('Erreur ajout panier:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour la quantité d'un produit
     * Logique : Validation du stock et mise à jour
     */
    async updateQuantity(userId, productId, quantity) {
        try {
            if (quantity < 1) {
                // Si quantité = 0, supprimer du panier
                return await this.removeFromCart(userId, productId);
            }

            // Vérifier le stock
            const { data: product } = await supabase
                .from('products')
                .select('stock')
                .eq('id', productId)
                .single();

            if (!product) {
                throw new Error('Produit non trouvé');
            }

            if (quantity > product.stock) {
                throw new Error(`Stock insuffisant. Disponible: ${product.stock}`);
            }

            // Mettre à jour
            const { data, error } = await supabase
                .from('carts')
                .update({ 
                    quantity,
                    updated_at: new Date()
                })
                .eq('user_id', userId)
                .eq('product_id', productId)
                .select()
                .single();

            if (error) throw error;

            const updatedCart = await this.getCart(userId);

            return {
                success: true,
                message: 'Quantité mise à jour',
                cart: updatedCart
            };

        } catch (error) {
            console.error('Erreur mise à jour quantité:', error);
            throw error;
        }
    }

    /**
     * Retirer un produit du panier
     * Logique : Suppression simple
     */
    async removeFromCart(userId, productId) {
        try {
            const { error } = await supabase
                .from('carts')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', productId);

            if (error) throw error;

            const updatedCart = await this.getCart(userId);

            return {
                success: true,
                message: 'Produit retiré du panier',
                cart: updatedCart
            };

        } catch (error) {
            console.error('Erreur suppression panier:', error);
            throw error;
        }
    }

    /**
     * Vider complètement le panier
     * Logique : Suppression de tous les items
     */
    async clearCart(userId) {
        try {
            // Sauvegarder d'abord comme panier abandonné si non vide
            const currentCart = await this.getCart(userId);
            if (currentCart.items.length > 0) {
                await this.saveAsAbandonedCart(userId, currentCart);
            }

            const { error } = await supabase
                .from('carts')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

            return {
                success: true,
                message: 'Panier vidé'
            };

        } catch (error) {
            console.error('Erreur vidage panier:', error);
            throw error;
        }
    }

    /**
     * Obtenir le panier complet avec détails
     * Logique : Join avec produits et calcul des totaux
     */
    async getCart(userId) {
        try {
            // Utiliser la vue pour obtenir les détails
            const { data: items, error } = await supabase
                .from('cart_details_view')
                .select('*')
                .eq('user_id', userId)
                .order('added_at', { ascending: false });

            if (error) throw error;

            // Calculer les totaux
            const totals = await this.calculateCartTotals(userId);

            // Grouper par boutique pour l'affichage
            const itemsByShop = this.groupItemsByShop(items || []);

            return {
                items: items || [],
                itemsByShop,
                summary: {
                    totalItems: totals.total_items || 0,
                    uniqueProducts: totals.unique_products || 0,
                    totalAmount: totals.total_amount || 0,
                    shopsCount: totals.shops_count || 0
                }
            };

        } catch (error) {
            console.error('Erreur récupération panier:', error);
            throw error;
        }
    }

    /**
     * Calculer les totaux du panier
     * Logique : Utilise la fonction SQL pour performance
     */
    async calculateCartTotals(userId) {
        try {
            const { data, error } = await supabase
                .rpc('calculate_cart_total', { p_user_id: userId });

            if (error) throw error;

            return data[0] || {
                total_items: 0,
                unique_products: 0,
                total_amount: 0,
                shops_count: 0
            };

        } catch (error) {
            console.error('Erreur calcul totaux:', error);
            return {
                total_items: 0,
                unique_products: 0,
                total_amount: 0,
                shops_count: 0
            };
        }
    }

    /**
     * Grouper les items par boutique
     * Logique : Facilite l'affichage et le checkout par vendeur
     */
    groupItemsByShop(items) {
        const grouped = {};

        items.forEach(item => {
            const shopId = item.shop_id;
            
            if (!grouped[shopId]) {
                grouped[shopId] = {
                    shopId: shopId,
                    shopName: item.shop_name,
                    shopLogo: item.shop_logo,
                    items: [],
                    subtotal: 0
                };
            }

            grouped[shopId].items.push(item);
            grouped[shopId].subtotal += item.subtotal;
        });

        return Object.values(grouped);
    }

    /**
     * Valider le panier avant commande
     * Logique : Vérifie stock, prix, disponibilité
     */
    async validateCart(userId) {
        try {
            const cart = await this.getCart(userId);
            const issues = [];
            const validItems = [];

            for (const item of cart.items) {
                // Vérifier le stock actuel
                const { data: product } = await supabase
                    .from('products')
                    .select('stock, prix, status')
                    .eq('id', item.product_id)
                    .single();

                if (!product || product.status !== 'active') {
                    issues.push({
                        productId: item.product_id,
                        productName: item.product_name,
                        issue: 'Produit non disponible'
                    });
                    continue;
                }

                if (product.stock < item.quantity) {
                    issues.push({
                        productId: item.product_id,
                        productName: item.product_name,
                        issue: `Stock insuffisant (disponible: ${product.stock})`
                    });
                    
                    // Ajuster la quantité automatiquement
                    if (product.stock > 0) {
                        await this.updateQuantity(userId, item.product_id, product.stock);
                    } else {
                        await this.removeFromCart(userId, item.product_id);
                    }
                    continue;
                }

                if (product.prix !== item.unit_price) {
                    issues.push({
                        productId: item.product_id,
                        productName: item.product_name,
                        issue: 'Prix modifié',
                        oldPrice: item.unit_price,
                        newPrice: product.prix
                    });
                }

                validItems.push(item);
            }

            return {
                isValid: issues.length === 0,
                issues,
                validItems,
                canCheckout: validItems.length > 0
            };

        } catch (error) {
            console.error('Erreur validation panier:', error);
            throw error;
        }
    }

    /**
     * GESTION DES FAVORIS
     */

    /**
     * Ajouter aux favoris
     * Logique : Un produit ne peut être ajouté qu'une fois
     */
    async addToWishlist(userId, productId) {
        try {
            // Vérifier que le produit existe
            const { data: product } = await supabase
                .from('products')
                .select('id, titre')
                .eq('id', productId)
                .single();

            if (!product) {
                throw new Error('Produit non trouvé');
            }

            // Ajouter aux favoris
            const { data, error } = await supabase
                .from('wishlists')
                .insert([{
                    user_id: userId,
                    product_id: productId
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Violation contrainte unique
                    throw new Error('Produit déjà dans les favoris');
                }
                throw error;
            }

            return {
                success: true,
                message: 'Produit ajouté aux favoris',
                item: data
            };

        } catch (error) {
            console.error('Erreur ajout favoris:', error);
            throw error;
        }
    }

    /**
     * Retirer des favoris
     */
    async removeFromWishlist(userId, productId) {
        try {
            const { error } = await supabase
                .from('wishlists')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', productId);

            if (error) throw error;

            return {
                success: true,
                message: 'Produit retiré des favoris'
            };

        } catch (error) {
            console.error('Erreur suppression favoris:', error);
            throw error;
        }
    }

    /**
     * Obtenir la liste des favoris
     */
    async getWishlist(userId) {
        try {
            const { data, error } = await supabase
                .from('wishlist_details_view')
                .select('*')
                .eq('user_id', userId)
                .order('added_at', { ascending: false });

            if (error) throw error;

            return {
                items: data || [],
                count: data?.length || 0
            };

        } catch (error) {
            console.error('Erreur récupération favoris:', error);
            throw error;
        }
    }

    /**
     * Déplacer un produit des favoris vers le panier
     */
    async moveToCart(userId, productId) {
        try {
            // Ajouter au panier
            await this.addToCart(userId, productId, 1);
            
            // Retirer des favoris
            await this.removeFromWishlist(userId, productId);

            return {
                success: true,
                message: 'Produit déplacé vers le panier'
            };

        } catch (error) {
            console.error('Erreur déplacement vers panier:', error);
            throw error;
        }
    }

    /**
     * GESTION DES PANIERS INVITÉS
     */

    /**
     * Créer/Mettre à jour un panier invité
     * Logique : Pour les utilisateurs non connectés
     */
    async saveGuestCart(sessionId, cartItems) {
        try {
            const cartContent = {
                items: cartItems,
                updatedAt: new Date()
            };

            const { data, error } = await supabase
                .from('guest_carts')
                .upsert([{
                    session_id: sessionId,
                    cart_content: cartContent,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
                }])
                .select()
                .single();

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('Erreur sauvegarde panier invité:', error);
            throw error;
        }
    }

    /**
     * Récupérer un panier invité
     */
    async getGuestCart(sessionId) {
        try {
            const { data, error } = await supabase
                .from('guest_carts')
                .select('cart_content')
                .eq('session_id', sessionId)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // Not found
                    return { items: [] };
                }
                throw error;
            }

            return data.cart_content;

        } catch (error) {
            console.error('Erreur récupération panier invité:', error);
            return { items: [] };
        }
    }

    /**
     * Fusionner panier invité avec panier utilisateur
     * Logique : Appelé après connexion
     */
    async mergeGuestCart(userId, sessionId) {
        try {
            // Récupérer le panier invité
            const guestCart = await this.getGuestCart(sessionId);
            
            if (!guestCart.items || guestCart.items.length === 0) {
                return { merged: 0 };
            }

            let mergedCount = 0;

            // Ajouter chaque item au panier utilisateur
            for (const item of guestCart.items) {
                try {
                    await this.addToCart(userId, item.productId, item.quantity);
                    mergedCount++;
                } catch (error) {
                    console.error(`Erreur fusion item ${item.productId}:`, error);
                }
            }

            // Supprimer le panier invité
            await supabase
                .from('guest_carts')
                .delete()
                .eq('session_id', sessionId);

            return {
                merged: mergedCount,
                message: `${mergedCount} produit(s) fusionné(s) avec votre panier`
            };

        } catch (error) {
            console.error('Erreur fusion paniers:', error);
            return { merged: 0 };
        }
    }

    /**
     * GESTION DES PANIERS ABANDONNÉS
     */

    /**
     * Sauvegarder un panier comme abandonné
     * Logique : Pour relance marketing
     */
    async saveAsAbandonedCart(userId, cart) {
        try {
            const { data, error } = await supabase
                .from('abandoned_carts')
                .insert([{
                    user_id: userId,
                    cart_content: cart,
                    total_amount: cart.summary?.totalAmount || 0
                }])
                .select()
                .single();

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('Erreur sauvegarde panier abandonné:', error);
        }
    }

    /**
     * Récupérer les paniers abandonnés non relancés
     * Logique : Pour campagne email
     */
    async getAbandonedCartsToRemind() {
        try {
            const { data, error } = await supabase
                .from('abandoned_carts')
                .select(`
                    *,
                    users!inner(email, nom)
                `)
                .eq('reminder_sent', false)
                .eq('recovered', false)
                .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Erreur récupération paniers abandonnés:', error);
            return [];
        }
    }

    /**
     * Marquer un panier abandonné comme relancé
     */
    async markReminderSent(abandonedCartId) {
        try {
            await supabase
                .from('abandoned_carts')
                .update({
                    reminder_sent: true,
                    reminder_sent_at: new Date()
                })
                .eq('id', abandonedCartId);

        } catch (error) {
            console.error('Erreur marquage relance:', error);
        }
    }

    /**
     * Marquer un panier comme récupéré
     */
    async markCartRecovered(userId) {
        try {
            await supabase
                .from('abandoned_carts')
                .update({
                    recovered: true,
                    recovered_at: new Date()
                })
                .eq('user_id', userId)
                .eq('recovered', false);

        } catch (error) {
            console.error('Erreur marquage récupération:', error);
        }
    }

    /**
     * Nettoyer les vieux paniers
     * Logique : Maintenance périodique
     */
    async cleanupOldCarts() {
        try {
            // Supprimer les paniers invités expirés
            await supabase.rpc('cleanup_expired_guest_carts');

            // Supprimer les paniers abandonnés de plus de 30 jours
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            await supabase
                .from('abandoned_carts')
                .delete()
                .lt('created_at', thirtyDaysAgo.toISOString());

            return {
                success: true,
                message: 'Nettoyage effectué'
            };

        } catch (error) {
            console.error('Erreur nettoyage:', error);
            throw error;
        }
    }
}

export default new CartService();