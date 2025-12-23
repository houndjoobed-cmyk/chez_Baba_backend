import dashboardService from '../services/dashboardService.js';
import { supabase } from '../config/supabase.js';

/**
 * Contrôleur pour les dashboards
 */

/**
 * Dashboard vendeur
 * Logique : Récupère toutes les métriques pour un vendeur
 */
export const getVendorDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Récupérer la boutique du vendeur
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        if (!shop) {
            return res.status(404).json({ 
                error: 'Aucune boutique trouvée pour ce vendeur' 
            });
        }

        const dashboard = await dashboardService.getVendorDashboard(shop.id);

        res.status(200).json(dashboard);

    } catch (error) {
        console.error('Erreur dashboard vendeur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du dashboard' 
        });
    }
};

/**
 * Dashboard admin
 * Logique : Vue d'ensemble de la plateforme
 */
export const getAdminDashboard = async (req, res) => {
    try {
        const dashboard = await dashboardService.getAdminDashboard();

        res.status(200).json(dashboard);

    } catch (error) {
        console.error('Erreur dashboard admin:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du dashboard' 
        });
    }
};

/**
 * Export des données vendeur (CSV)
 * Logique : Permet au vendeur d'exporter ses données
 */
export const exportVendorData = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type, startDate, endDate } = req.query;

        // Validation des paramètres
        if (!type) {
            return res.status(400).json({ error: 'Type requis (orders ou products)' });
        }

        if (type === 'orders') {
            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Les dates de début et fin sont requises' });
            }
            // Validation du format ISO 8601
            if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
                return res.status(400).json({ error: 'Format de date invalide' });
            }
        }

        // Récupérer la boutique
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();

        if (!shop) {
            return res.status(404).json({ 
                error: 'Boutique non trouvée' 
            });
        }

        let exportData;
        
        switch (type) {
            case 'orders': {
                const { data: orders, error } = await supabase
                    .from('order_items')
                    .select(`
                        *,
                        products(titre),
                        orders!inner(
                            created_at,
                            status,
                            users:client_id(nom, email)
                        )
                    `)
                    .eq('shop_id', shop.id)
                    .gte('orders.created_at', startDate)
                    .lte('orders.created_at', endDate);
                
                if (error) {
                    return res.status(500).json({ error: error.message });
                }
                
                exportData = orders || [];
                break;
            }

            case 'products': {
                const { data: products, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('shop_id', shop.id);
                
                if (error) {
                    return res.status(500).json({ error: error.message });
                }
                
                exportData = products || [];
                break;
            }

            default:
                return res.status(400).json({ error: 'Type invalide. Utilisez "orders" ou "products"' });
        }

        // Convertir en CSV
        const csv = convertToCSV(exportData);

        if (!csv) {
            return res.status(200).json({ 
                message: 'Aucune donnée à exporter',
                data: []
            });
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send('\uFEFF' + csv); // BOM pour UTF-8

    } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'export' 
        });
    }
};

/**
 * Convertir des données en CSV
 * FIX : Échappe les guillemets et les virgules
 */
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        // Échappe les guillemets et entoure si contient virgule ou guillemet
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
        Object.values(row).map(escapeCSV).join(',')
    );
    
    return [headers, ...rows].join('\n');
}