import { supabase } from '../config/supabase.js';

// 📌 Créer une boutique (réservé aux vendeurs)
export const createShop = async (req, res) => {
    try {
        const { nom, description, logo } = req.body;
        const userId = req.user.userId;

        // Validation
        if (!nom) {
            return res.status(400).json({ error: 'Le nom de la boutique est requis' });
        }

        // Vérifie si l'utilisateur a déjà une boutique
        const { data: existingShop } = await supabase
            .from('shops')
            .select('*')
            .eq('owner_id', userId)
            .single();

        if (existingShop) {
            return res.status(400).json({ error: 'Vous avez déjà une boutique' });
        }

        // Crée la boutique
        const { data, error } = await supabase
            .from('shops')
            .insert([
                {
                    owner_id: userId,
                    nom,
                    description: description || '',
                    logo: logo || '',
                    status: 'pending' // En attente de validation par admin
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Boutique créée avec succès (en attente de validation)',
            shop: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer la boutique du vendeur connecté
export const getMyShop = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: shop, error } = await supabase
            .from('shops')
            .select('*')
            .eq('owner_id', userId)
            .single();

        if (error || !shop) {
            return res.status(404).json({ error: 'Vous n\'avez pas encore de boutique' });
        }

        res.status(200).json({ shop });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer toutes les boutiques (pour l'admin ou les clients)
export const getAllShops = async (req, res) => {
    try {
        const { data: shops, error } = await supabase
            .from('shops')
            .select('*')
            .eq('status', 'active') // Seulement les boutiques actives
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ shops });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer une boutique par son ID
export const getShopById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: shop, error } = await supabase
            .from('shops')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !shop) {
            return res.status(404).json({ error: 'Boutique non trouvée' });
        }

        res.status(200).json({ shop });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Modifier une boutique (propriétaire uniquement)
export const updateShop = async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, description, logo } = req.body;
        const userId = req.user.userId;

        // Vérifie que la boutique appartient à l'utilisateur
        const { data: shop } = await supabase
            .from('shops')
            .select('*')
            .eq('id', id)
            .eq('owner_id', userId)
            .single();

        if (!shop) {
            return res.status(403).json({ error: 'Vous ne pouvez pas modifier cette boutique' });
        }

        // Mise à jour
        const { data, error } = await supabase
            .from('shops')
            .update({
                nom: nom || shop.nom,
                description: description || shop.description,
                logo: logo || shop.logo
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Boutique mise à jour',
            shop: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Supprimer une boutique (propriétaire ou admin)
export const deleteShop = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Si pas admin, vérifie que c'est bien sa boutique
        if (userRole !== 'admin') {
            const { data: shop } = await supabase
                .from('shops')
                .select('*')
                .eq('id', id)
                .eq('owner_id', userId)
                .single();

            if (!shop) {
                return res.status(403).json({ error: 'Vous ne pouvez pas supprimer cette boutique' });
            }
        }

        const { error } = await supabase
            .from('shops')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ message: 'Boutique supprimée' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Approuver une boutique (admin uniquement)
export const approveShop = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('shops')
            .update({ status: 'active' })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Boutique approuvée',
            shop: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Récupérer toutes les boutiques en attente (admin uniquement)
export const getPendingShops = async (req, res) => {
    try {
        const { data: shops, error } = await supabase
            .from('shops')
            .select(`
        *,
        users:owner_id (nom, email)
      `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({
            message: `${shops.length} boutique(s) en attente d'approbation`,
            shops
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Bloquer une boutique (admin uniquement)
export const blockShop = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('shops')
            .update({ status: 'blocked' })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Boutique bloquée',
            shop: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};