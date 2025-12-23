import cartService from '../services/cartService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Contrôleur pour la gestion du panier et des favoris
 */

/**
 * Ajouter au panier
 * Logique : Point d'entrée API pour ajouter un produit
 */
export const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const userId = req.user.userId;

        if (!productId) {
            return res.status(400).json({ 
                error: 'ID du produit requis' 
            });
        }

        if (quantity < 1 || quantity > 99) {
            return res.status(400).json({ 
                error: 'Quantité invalide (1-99)' 
            });
        }

        const result = await cartService.addToCart(userId, productId, quantity);

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur ajout panier:', error);
        res.status(400).json({ 
            error: error.message || 'Erreur lors de l\'ajout au panier' 
        });
    }
};

/**
 * Mettre à jour la quantité
 */
export const updateCartQuantity = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        const userId = req.user.userId;

        if (quantity < 0 || quantity > 99) {
            return res.status(400).json({ 
                error: 'Quantité invalide (0-99)' 
            });
        }

        const result = await cartService.updateQuantity(userId, productId, quantity);

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur mise à jour quantité:', error);
        res.status(400).json({ 
            error: error.message || 'Erreur lors de la mise à jour' 
        });
    }
};

/**
 * Retirer du panier
 */
export const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.userId;

        const result = await cartService.removeFromCart(userId, productId);

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur suppression panier:', error);
        res.status(400).json({ 
            error: error.message || 'Erreur lors de la suppression' 
        });
    }
};

/**
 * Obtenir le panier
 */
export const getCart = async (req, res) => {
    try {
        const userId = req.user.userId;

        const cart = await cartService.getCart(userId);

        res.status(200).json(cart);

    } catch (error) {
        console.error('Erreur récupération panier:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du panier' 
        });
    }
};

/**
 * Vider le panier
 */
export const clearCart = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await cartService.clearCart(userId);

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur vidage panier:', error);
        res.status(500).json({ 
            error: 'Erreur lors du vidage du panier' 
        });
    }
};

/**
 * Valider le panier avant checkout
 */
export const validateCart = async (req, res) => {
    try {
        const userId = req.user.userId;

        const validation = await cartService.validateCart(userId);

        res.status(200).json(validation);

    } catch (error) {
        console.error('Erreur validation panier:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la validation' 
        });
    }
};

/**
 * FAVORIS / WISHLIST
 */

/**
 * Ajouter aux favoris
 */
export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.userId;

        if (!productId) {
            return res.status(400).json({ 
                error: 'ID du produit requis' 
            });
        }

        const result = await cartService.addToWishlist(userId, productId);

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur ajout favoris:', error);
        res.status(400).json({ 
            error: error.message || 'Erreur lors de l\'ajout aux favoris' 
        });
    }
};

/**
 * Retirer des favoris
 */
export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.userId;

        const result = await cartService.removeFromWishlist(userId, productId);

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur suppression favoris:', error);
        res.status(400).json({ 
            error: error.message || 'Erreur lors de la suppression' 
        });
    }
};

/**
 * Obtenir les favoris
 */
export const getWishlist = async (req, res) => {
    try {
        const userId = req.user.userId;

        const wishlist = await cartService.getWishlist(userId);

        res.status(200).json(wishlist);

    } catch (error) {
        console.error('Erreur récupération favoris:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des favoris' 
        });
    }
};

/**
 * Déplacer des favoris vers le panier
 */
export const moveToCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.userId;

        const result = await cartService.moveToCart(userId, productId);

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur déplacement vers panier:', error);
        res.status(400).json({ 
            error: error.message || 'Erreur lors du déplacement' 
        });
    }
};

/**
 * PANIER INVITÉ
 */

/**
 * Sauvegarder panier invité
 * Logique : Pour les utilisateurs non connectés
 */
export const saveGuestCart = async (req, res) => {
    try {
        const { items } = req.body;
        let sessionId = req.headers['x-session-id'];

        if (!sessionId) {
            sessionId = uuidv4();
        }

        const result = await cartService.saveGuestCart(sessionId, items || []);

        res.status(200).json({
            success: true,
            sessionId,
            cart: result.cart_content
        });

    } catch (error) {
        console.error('Erreur sauvegarde panier invité:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la sauvegarde' 
        });
    }
};

/**
 * Récupérer panier invité
 */
export const getGuestCart = async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];

        if (!sessionId) {
            return res.status(200).json({ items: [] });
        }

        const cart = await cartService.getGuestCart(sessionId);

        res.status(200).json(cart);

    } catch (error) {
        console.error('Erreur récupération panier invité:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération' 
        });
    }
};

/**
 * Fusionner paniers après connexion
 */
export const mergeCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        const sessionId = req.headers['x-session-id'];

        if (!sessionId) {
            return res.status(200).json({ 
                merged: 0,
                message: 'Pas de panier invité à fusionner' 
            });
        }

        const result = await cartService.mergeGuestCart(userId, sessionId);

        res.status(200).json(result);

    } catch (error) {
        console.error('Erreur fusion paniers:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la fusion' 
        });
    }
};