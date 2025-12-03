import { supabase } from '../config/supabase.js';

// 📌 Créer un produit (vendeur uniquement)
export const createProduct = async (req, res) => {
    try {
        const { titre, description, prix, stock, image, category_id } = req.body;
        const userId = req.user.userId;

        // Validation
        if (!titre || !prix) {
            return res.status(400).json({ error: 'Le titre et le prix sont requis' });
        }

        if (!category_id) {
            return res.status(400).json({ error: 'La catégorie est requise' });
        }

        if (prix < 0) {
            return res.status(400).json({ error: 'Le prix doit être positif' });
        }

        // Vérifie que la catégorie existe
        const { data: category, error: catError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', category_id)
            .single();

        if (catError || !category) {
            return res.status(400).json({ error: 'Catégorie invalide' });
        }

        // Récupère la boutique du vendeur
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('id, status')
            .eq('owner_id', userId)
            .single();

        if (shopError || !shop) {
            return res.status(404).json({ error: 'Vous devez d\'abord créer une boutique' });
        }

        if (shop.status !== 'active') {
            return res.status(403).json({ error: 'Votre boutique doit être approuvée pour ajouter des produits' });
        }

        // Crée le produit
        const { data, error } = await supabase
            .from('products')
            .insert([
                {
                    shop_id: shop.id,
                    category_id,
                    titre,
                    description: description || '',
                    prix: parseFloat(prix),
                    stock: stock || 0,
                    image: image || '',
                    status: 'active'
                }
            ])
            .select(`
        *,
        categories:category_id (nom, slug)
      `)
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Produit créé avec succès',
            product: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 📌 Récupérer tous les produits d'une boutique
export const getProductsByShop = async (req, res) => {
    try {
        const { shopId } = req.params;

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('shop_id', shopId)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer tous les produits actifs (pour les clients)
export const getAllProducts = async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
        *,
        shops:shop_id (nom, logo),
        categories:category_id (nom, slug)
      `)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer un produit par son ID
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: product, error } = await supabase
            .from('products')
            .select(`
        *,
        shops:shop_id (id, nom, logo, description),
        categories:category_id (nom, slug)
      `)
            .eq('id', id)
            .single();

        if (error || !product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        res.status(200).json({ product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer les produits de MA boutique (vendeur)
export const getMyProducts = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Récupère l'ID de la boutique du vendeur
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        if (!shop) {
            return res.status(404).json({ error: 'Vous n\'avez pas de boutique' });
        }

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('shop_id', shop.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Modifier un produit (propriétaire uniquement)
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { titre, description, prix, stock, image, status, category_id } = req.body;
        const userId = req.user.userId;

        // Récupère la boutique du vendeur
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        if (!shop) {
            return res.status(403).json({ error: 'Vous n\'avez pas de boutique' });
        }

        // Vérifie que le produit appartient à sa boutique
        const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .eq('shop_id', shop.id)
            .single();

        if (!product) {
            return res.status(403).json({ error: 'Vous ne pouvez pas modifier ce produit' });
        }

        // Si category_id est fourni, vérifie qu'elle existe
        if (category_id) {
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id')
                .eq('id', category_id)
                .single();

            if (catError || !category) {
                return res.status(400).json({ error: 'Catégorie invalide' });
            }
        }

        // Mise à jour
        const updateData = {};
        if (titre) updateData.titre = titre;
        if (description !== undefined) updateData.description = description;
        if (prix !== undefined) updateData.prix = parseFloat(prix);
        if (stock !== undefined) updateData.stock = parseInt(stock);
        if (image !== undefined) updateData.image = image;
        if (status) updateData.status = status;
        if (category_id) updateData.category_id = category_id;

        const { data, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', id)
            .select(`
        *,
        categories:category_id (nom, slug)
      `)
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Produit mis à jour',
            product: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 📌 Supprimer un produit (propriétaire uniquement)
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Récupère la boutique du vendeur
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        if (!shop) {
            return res.status(403).json({ error: 'Vous n\'avez pas de boutique' });
        }

        // Vérifie que le produit appartient à sa boutique
        const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .eq('shop_id', shop.id)
            .single();

        if (!product) {
            return res.status(403).json({ error: 'Vous ne pouvez pas supprimer ce produit' });
        }

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ message: 'Produit supprimé' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};