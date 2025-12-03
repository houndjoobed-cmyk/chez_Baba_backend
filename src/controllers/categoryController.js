import { supabase } from '../config/supabase.js';

// 📌 Récupérer toutes les catégories
export const getAllCategories = async (req, res) => {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('nom', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ categories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer une catégorie par ID
export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: category, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !category) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        res.status(200).json({ category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer les produits d'une catégorie
export const getProductsByCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: products, error } = await supabase
            .from('products')
            .select(`
        *,
        shops:shop_id (nom, logo),
        categories:category_id (nom, slug)
      `)
            .eq('category_id', id)
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