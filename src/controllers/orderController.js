import { supabase } from '../config/supabase.js';

// 📌 Créer une commande (client)
export const createOrder = async (req, res) => {
    try {
        const { items, adresse_livraison, telephone, notes } = req.body;
        const userId = req.user.userId;

        // Validation
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Le panier est vide' });
        }

        if (!adresse_livraison || !telephone) {
            return res.status(400).json({ error: 'Adresse et téléphone sont requis' });
        }

        let total = 0;
        const orderItems = [];

        // Vérifie chaque produit et calcule le total
        for (const item of items) {
            const { product_id, quantite } = item;

            if (!product_id || !quantite || quantite <= 0) {
                return res.status(400).json({ error: 'Données invalides pour un produit' });
            }

            // Récupère le produit
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id, shop_id, titre, prix, stock, status')
                .eq('id', product_id)
                .single();

            if (productError || !product) {
                return res.status(404).json({ error: `Produit ${product_id} non trouvé` });
            }

            if (product.status !== 'active') {
                return res.status(400).json({ error: `Le produit "${product.titre}" n'est plus disponible` });
            }

            if (product.stock < quantite) {
                return res.status(400).json({
                    error: `Stock insuffisant pour "${product.titre}". Disponible: ${product.stock}`
                });
            }

            const sousTotal = product.prix * quantite;
            total += sousTotal;

            orderItems.push({
                product_id: product.id,
                shop_id: product.shop_id,
                quantite,
                prix_unitaire: product.prix
            });
        }

        // Crée la commande
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([
                {
                    client_id: userId,
                    total,
                    status: 'pending',
                    payment_method: 'manual',
                    adresse_livraison,
                    telephone,
                    notes: notes || ''
                }
            ])
            .select()
            .single();

        if (orderError) {
            return res.status(500).json({ error: orderError.message });
        }

        // Ajoute les articles de commande
        const itemsWithOrderId = orderItems.map(item => ({
            ...item,
            order_id: order.id
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsWithOrderId);

        if (itemsError) {
            // Si erreur, supprime la commande créée
            await supabase.from('orders').delete().eq('id', order.id);
            return res.status(500).json({ error: itemsError.message });
        }

        // Met à jour le stock des produits
        for (const item of items) {
            const { product_id, quantite } = item;

            const { data: product } = await supabase
                .from('products')
                .select('stock')
                .eq('id', product_id)
                .single();

            await supabase
                .from('products')
                .update({ stock: product.stock - quantite })
                .eq('id', product_id);
        }

        res.status(201).json({
            message: 'Commande créée avec succès',
            order: {
                ...order,
                items: orderItems
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer toutes les commandes d'un client
export const getMyOrders = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
        *,
        order_items (
          *,
          products (titre, image),
          shops (nom)
        )
      `)
            .eq('client_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer une commande spécifique
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const { data: order, error } = await supabase
            .from('orders')
            .select(`
        *,
        users:client_id (nom, email, role),
        order_items (
          *,
          products (titre, image, description),
          shops (nom, logo)
        )
      `)
            .eq('id', id)
            .single();

        if (error || !order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        // Vérifie les permissions
        if (userRole === 'client' && order.client_id !== userId) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        if (userRole === 'vendor') {
            // Récupère la boutique du vendeur
            const { data: shop } = await supabase
                .from('shops')
                .select('id')
                .eq('owner_id', userId)
                .single();

            if (!shop) {
                return res.status(403).json({ error: 'Vous n\'avez pas de boutique' });
            }

            // Vérifie si la commande contient des produits de sa boutique
            const hasProducts = order.order_items.some(item => item.shop_id === shop.id);

            if (!hasProducts) {
                return res.status(403).json({ error: 'Cette commande ne contient pas vos produits' });
            }

            // Filtre pour montrer seulement ses produits
            order.order_items = order.order_items.filter(item => item.shop_id === shop.id);
        }

        res.status(200).json({ order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer les commandes de MA boutique (vendeur)
export const getShopOrders = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Récupère la boutique du vendeur
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        if (!shop) {
            return res.status(404).json({ error: 'Vous n\'avez pas de boutique' });
        }

        // Récupère toutes les commandes contenant des produits de cette boutique
        const { data: orderItems, error } = await supabase
            .from('order_items')
            .select(`
        *,
        orders (*),
        products (titre, image),
        shops (nom)
      `)
            .eq('shop_id', shop.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Groupe les articles par commande
        const ordersMap = {};

        orderItems.forEach(item => {
            const orderId = item.orders.id;

            if (!ordersMap[orderId]) {
                ordersMap[orderId] = {
                    ...item.orders,
                    items: []
                };
            }

            ordersMap[orderId].items.push({
                id: item.id,
                product_id: item.product_id,
                quantite: item.quantite,
                prix_unitaire: item.prix_unitaire,
                product: item.products,
                shop: item.shops
            });
        });

        const orders = Object.values(ordersMap);

        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Confirmer une commande (vendeur ou admin)
export const confirmOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Si vendeur, vérifie qu'il a des produits dans cette commande
        if (userRole === 'vendor') {
            const { data: shop } = await supabase
                .from('shops')
                .select('id')
                .eq('owner_id', userId)
                .single();

            if (!shop) {
                return res.status(403).json({ error: 'Vous n\'avez pas de boutique' });
            }

            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', id)
                .eq('shop_id', shop.id);

            if (!items || items.length === 0) {
                return res.status(403).json({ error: 'Cette commande ne contient pas vos produits' });
            }
        }

        const { data, error } = await supabase
            .from('orders')
            .update({ status: 'confirmed' })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Commande confirmée',
            order: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Marquer une commande comme livrée (vendeur ou admin)
export const deliverOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Si vendeur, vérifie qu'il a des produits dans cette commande
        if (userRole === 'vendor') {
            const { data: shop } = await supabase
                .from('shops')
                .select('id')
                .eq('owner_id', userId)
                .single();

            if (!shop) {
                return res.status(403).json({ error: 'Vous n\'avez pas de boutique' });
            }

            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', id)
                .eq('shop_id', shop.id);

            if (!items || items.length === 0) {
                return res.status(403).json({ error: 'Cette commande ne contient pas vos produits' });
            }
        }

        const { data, error } = await supabase
            .from('orders')
            .update({ status: 'delivered' })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Commande marquée comme livrée',
            order: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Annuler une commande (client, vendeur ou admin)
export const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Récupère la commande
        const { data: order } = await supabase
            .from('orders')
            .select('*, order_items (*)')
            .eq('id', id)
            .single();

        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        // Vérifie les permissions
        if (userRole === 'client' && order.client_id !== userId) {
            return res.status(403).json({ error: 'Vous ne pouvez pas annuler cette commande' });
        }

        if (order.status === 'delivered') {
            return res.status(400).json({ error: 'Impossible d\'annuler une commande déjà livrée' });
        }

        // Annule la commande
        const { data, error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Remet les produits en stock
        for (const item of order.order_items) {
            const { data: product } = await supabase
                .from('products')
                .select('stock')
                .eq('id', item.product_id)
                .single();

            if (product) {
                await supabase
                    .from('products')
                    .update({ stock: product.stock + item.quantite })
                    .eq('id', item.product_id);
            }
        }

        res.status(200).json({
            message: 'Commande annulée',
            order: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer toutes les commandes (admin uniquement)
export const getAllOrders = async (req, res) => {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
        *,
        users:client_id (nom, email),
        order_items (
          *,
          products (titre),
          shops (nom)
        )
      `)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};