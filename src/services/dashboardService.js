import { supabase } from '../config/supabase.js';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from 'date-fns';

/**
 * Service de génération des dashboards
 * Centralise tous les calculs de statistiques
 */
class DashboardService {
    
    /**
     * DASHBOARD VENDEUR
     */
    
    /**
     * Obtenir le dashboard complet d'un vendeur
     * Logique : Agrège toutes les métriques importantes pour un vendeur
     */
    async getVendorDashboard(shopId) {
        try {
            const today = new Date();
            const startToday = startOfDay(today);
            const endToday = endOfDay(today);
            const startMonth = startOfMonth(today);
            const endMonth = endOfMonth(today);
            const last30Days = subDays(today, 30);

            // 1. Informations de base de la boutique
            const { data: shop } = await supabase
                .from('shops')
                .select(`
                    *,
                    products:products(count)
                `)
                .eq('id', shopId)
                .single();

            if (!shop) {
                throw new Error('Boutique non trouvée');
            }

            // 2. Statistiques des commandes aujourd'hui
            const { data: todayOrders } = await supabase
                .from('order_items')
                .select(`
                    quantite,
                    prix_unitaire,
                    orders!inner(
                        id,
                        created_at,
                        status
                    )
                `)
                .eq('shop_id', shopId)
                .gte('orders.created_at', startToday.toISOString())
                .lte('orders.created_at', endToday.toISOString());

            const todayStats = this.calculateOrderStats(todayOrders || []);

            // 3. Statistiques du mois
            const { data: monthOrders } = await supabase
                .from('order_items')
                .select(`
                    quantite,
                    prix_unitaire,
                    orders!inner(
                        id,
                        created_at,
                        status
                    )
                `)
                .eq('shop_id', shopId)
                .gte('orders.created_at', startMonth.toISOString())
                .lte('orders.created_at', endMonth.toISOString());

            const monthStats = this.calculateOrderStats(monthOrders || []);

            // 4. Statistiques totales
            const { data: allOrders } = await supabase
                .from('order_items')
                .select(`
                    quantite,
                    prix_unitaire,
                    orders!inner(id, status)
                `)
                .eq('shop_id', shopId);

            const totalStats = this.calculateOrderStats(allOrders || []);

            // 5. Commandes récentes
            const { data: recentOrders } = await supabase
                .from('order_items')
                .select(`
                    *,
                    products(titre, image),
                    orders!inner(
                        id,
                        created_at,
                        status,
                        users:client_id(nom, email)
                    )
                `)
                .eq('shop_id', shopId)
                .order('orders.created_at', { ascending: false })
                .limit(10);

            // 6. Produits les plus vendus
            const { data: topProducts } = await supabase
                .rpc('get_top_selling_products', { 
                    p_shop_id: shopId,
                    p_limit: 5 
                });

            // 7. Produits avec stock faible
            const { data: lowStockProducts } = await supabase
                .from('products')
                .select('id, titre, stock, image')
                .eq('shop_id', shopId)
                .lte('stock', 5)
                .gt('stock', 0)
                .order('stock', { ascending: true })
                .limit(5);

            // 8. Graphique des revenus (30 derniers jours)
            const revenueChart = await this.getRevenueChart(shopId, 30);

            // 9. Répartition par statut de commande
            const orderStatusDistribution = await this.getOrderStatusDistribution(shopId);

            // 10. Statistiques de performance
            const performanceStats = {
                averageOrderValue: totalStats.totalOrders > 0 
                    ? (totalStats.totalRevenue / totalStats.totalOrders).toFixed(2)
                    : 0,
                conversionRate: await this.calculateConversionRate(shopId),
                customerSatisfaction: shop.rating_average || 0,
                totalReviews: shop.rating_count || 0
            };

            // 11. Comparaison avec la période précédente
            const comparison = await this.getComparison(shopId, monthStats);

            return {
                shop: {
                    id: shop.id,
                    name: shop.nom,
                    status: shop.status,
                    logo: shop.logo,
                    totalProducts: shop.products[0]?.count || 0
                },
                today: {
                    orders: todayStats.totalOrders,
                    revenue: todayStats.totalRevenue,
                    productsSold: todayStats.totalProducts
                },
                month: {
                    orders: monthStats.totalOrders,
                    revenue: monthStats.totalRevenue,
                    productsSold: monthStats.totalProducts
                },
                total: {
                    orders: totalStats.totalOrders,
                    revenue: totalStats.totalRevenue,
                    productsSold: totalStats.totalProducts
                },
                performance: performanceStats,
                comparison,
                recentOrders: this.formatRecentOrders(recentOrders),
                topProducts: topProducts || [],
                lowStockProducts: lowStockProducts || [],
                revenueChart,
                orderStatusDistribution
            };

        } catch (error) {
            console.error('Erreur dashboard vendeur:', error);
            throw error;
        }
    }

    /**
     * Calculer les statistiques à partir des commandes
     * Logique : Agrège les totaux depuis un tableau de commandes
     * FIX : N'ajoute les commandes que si l'id existe (pas Math.random())
     */
    calculateOrderStats(orders) {
        let totalOrders = new Set();
        let totalRevenue = 0;
        let totalProducts = 0;

        orders.forEach(item => {
            if (item.orders && item.orders.id) {
                totalOrders.add(item.orders.id);
                totalRevenue += (item.prix_unitaire * item.quantite);
                totalProducts += item.quantite;
            }
        });

        return {
            totalOrders: totalOrders.size,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalProducts
        };
    }

    /**
     * Générer le graphique des revenus
     * Logique : Données pour un graphique ligne des X derniers jours
     */
    async getRevenueChart(shopId, days = 30) {
        const dates = [];
        const revenues = [];
        const orders = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const start = startOfDay(date);
            const end = endOfDay(date);

            const { data } = await supabase
                .from('order_items')
                .select(`
                    quantite,
                    prix_unitaire,
                    orders!inner(id, created_at)
                `)
                .eq('shop_id', shopId)
                .gte('orders.created_at', start.toISOString())
                .lte('orders.created_at', end.toISOString());

            const dayStats = this.calculateOrderStats(data || []);
            
            dates.push(format(date, 'dd/MM'));
            revenues.push(dayStats.totalRevenue);
            orders.push(dayStats.totalOrders);
        }

        return {
            labels: dates,
            datasets: [
                {
                    label: 'Revenus (FCFA)',
                    data: revenues,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.1
                },
                {
                    label: 'Commandes',
                    data: orders,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        };
    }

    /**
     * Répartition des commandes par statut
     * Logique : Pour un graphique camembert
     */
    async getOrderStatusDistribution(shopId) {
        const { data } = await supabase
            .from('order_items')
            .select(`
                orders!inner(status)
            `)
            .eq('shop_id', shopId);

        const distribution = {
            pending: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };

        data?.forEach(item => {
            const status = item.orders.status;
            if (distribution.hasOwnProperty(status)) {
                distribution[status]++;
            }
        });

        return {
            labels: ['En attente', 'Confirmées', 'Expédiées', 'Livrées', 'Annulées'],
            data: [
                distribution.pending,
                distribution.confirmed,
                distribution.shipped,
                distribution.delivered,
                distribution.cancelled
            ],
            colors: ['#FFC107', '#2196F3', '#9C27B0', '#4CAF50', '#F44336']
        };
    }

    /**
     * Calculer le taux de conversion
     * Logique : % de produits qui ont été achetés
     * FIX : Pas de colonne 'views', on utilise le nombre de produits
     */
    async calculateConversionRate(shopId) {
        const { count: totalProducts } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shopId);

        const { count: totalOrderItems } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shopId);

        if (!totalProducts || totalProducts === 0) return 0;

        return parseFloat(((totalOrderItems / totalProducts) * 100).toFixed(2));
    }

    /**
     * Comparer avec la période précédente
     * Logique : Calcul des pourcentages de croissance
     */
    async getComparison(shopId, currentMonthStats) {
        const lastMonth = subDays(startOfMonth(new Date()), 1);
        const startLastMonth = startOfMonth(lastMonth);
        const endLastMonth = endOfMonth(lastMonth);

        const { data: lastMonthOrders } = await supabase
            .from('order_items')
            .select(`
                quantite,
                prix_unitaire,
                orders!inner(id, created_at)
            `)
            .eq('shop_id', shopId)
            .gte('orders.created_at', startLastMonth.toISOString())
            .lte('orders.created_at', endLastMonth.toISOString());

        const lastMonthStats = this.calculateOrderStats(lastMonthOrders || []);

        const revenueGrowth = lastMonthStats.totalRevenue > 0
            ? parseFloat(((currentMonthStats.totalRevenue - lastMonthStats.totalRevenue) / lastMonthStats.totalRevenue * 100).toFixed(1))
            : 0;

        const ordersGrowth = lastMonthStats.totalOrders > 0
            ? parseFloat(((currentMonthStats.totalOrders - lastMonthStats.totalOrders) / lastMonthStats.totalOrders * 100).toFixed(1))
            : 0;

        return {
            revenueGrowth,
            ordersGrowth,
            lastMonth: lastMonthStats
        };
    }

    /**
     * Formater les commandes récentes
     * Logique : Simplifier pour l'affichage
     * FIX : N'initialise le total qu'une fois et le recalcule correctement
     */
    formatRecentOrders(orders) {
        const orderMap = {};

        orders?.forEach(item => {
            const orderId = item.orders.id;
            
            if (!orderMap[orderId]) {
                orderMap[orderId] = {
                    id: orderId,
                    date: item.orders.created_at,
                    status: item.orders.status,
                    client: item.orders.users?.nom || 'Client',
                    email: item.orders.users?.email,
                    total: 0,
                    products: []
                };
            }

            // Ajouter le produit et augmenter le total
            orderMap[orderId].products.push({
                name: item.products?.titre,
                quantity: item.quantite,
                price: item.prix_unitaire
            });
            orderMap[orderId].total += (item.prix_unitaire * item.quantite);
        });

        return Object.values(orderMap).slice(0, 10);
    }

    /**
     * DASHBOARD ADMIN
     */

    /**
     * Obtenir le dashboard admin complet
     * Logique : Vue d'ensemble de toute la plateforme
     */
    async getAdminDashboard() {
        try {
            const today = new Date();
            const startToday = startOfDay(today);
            const endToday = endOfDay(today);

            // 1. Statistiques utilisateurs
            const { data: userStats } = await supabase
                .from('users')
                .select('role, created_at');

            const users = {
                total: userStats?.length || 0,
                clients: userStats?.filter(u => u.role === 'client').length || 0,
                vendors: userStats?.filter(u => u.role === 'vendor').length || 0,
                newToday: userStats?.filter(u => 
                    new Date(u.created_at) >= startToday
                ).length || 0
            };

            // 2. Statistiques boutiques
            const { data: shopStats } = await supabase
                .from('shops')
                .select('status, created_at');

            const shops = {
                total: shopStats?.length || 0,
                active: shopStats?.filter(s => s.status === 'active').length || 0,
                pending: shopStats?.filter(s => s.status === 'pending').length || 0,
                blocked: shopStats?.filter(s => s.status === 'blocked').length || 0
            };

            // 3. Statistiques produits
            const { data: productStats } = await supabase
                .from('products')
                .select('status, stock, created_at');

            const products = {
                total: productStats?.length || 0,
                active: productStats?.filter(p => p.status === 'active').length || 0,
                outOfStock: productStats?.filter(p => p.stock === 0).length || 0
            };

            // 4. Statistiques commandes
            const { data: orderStats } = await supabase
                .from('orders')
                .select('total, created_at, status');

            const orders = {
                total: orderStats?.length || 0,
                todayCount: orderStats?.filter(o => 
                    new Date(o.created_at) >= startToday
                ).length || 0,
                totalRevenue: orderStats?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
                todayRevenue: orderStats
                    ?.filter(o => new Date(o.created_at) >= startToday)
                    ?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
            };

            // 5. Top boutiques par revenus
            const { data: topShops } = await supabase
                .rpc('get_top_shops_by_revenue', { p_limit: 5 });

            // 6. Top catégories
            const { data: topCategories } = await supabase
                .rpc('get_top_categories', { p_limit: 5 });

            // 7. Graphique des revenus (30 jours)
            const revenueChart = await this.getPlatformRevenueChart(30);

            // 8. Graphique d'évolution utilisateurs
            const userGrowthChart = await this.getUserGrowthChart(30);

            // 9. Activité récente
            const recentActivity = await this.getRecentActivity();

            // 10. Métriques de performance
            const performance = {
                averageOrderValue: orders.total > 0 
                    ? parseFloat((orders.totalRevenue / orders.total).toFixed(2))
                    : 0,
                platformRating: await this.getPlatformAverageRating(),
                activeVendorRate: shops.total > 0
                    ? parseFloat(((shops.active / shops.total) * 100).toFixed(1))
                    : 0
            };

            // 11. Alertes et notifications
            const alerts = await this.getAdminAlerts();

            return {
                users,
                shops,
                products,
                orders,
                performance,
                topShops: topShops || [],
                topCategories: topCategories || [],
                revenueChart,
                userGrowthChart,
                recentActivity,
                alerts
            };

        } catch (error) {
            console.error('Erreur dashboard admin:', error);
            throw error;
        }
    }

    /**
     * Graphique des revenus de la plateforme
     * Logique : Total de tous les vendeurs
     */
    async getPlatformRevenueChart(days = 30) {
        const dates = [];
        const revenues = [];
        const orderCounts = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const start = startOfDay(date);
            const end = endOfDay(date);

            const { data } = await supabase
                .from('orders')
                .select('total')
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString());

            const dayRevenue = data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
            const dayOrders = data?.length || 0;

            dates.push(format(date, 'dd/MM'));
            revenues.push(dayRevenue);
            orderCounts.push(dayOrders);
        }

        return {
            labels: dates,
            datasets: [
                {
                    label: 'Revenus (FCFA)',
                    data: revenues,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                },
                {
                    label: 'Commandes',
                    data: orderCounts,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    yAxisID: 'y1'
                }
            ]
        };
    }

    /**
     * Graphique de croissance utilisateurs
     * Logique : Évolution du nombre d'inscrits
     */
    async getUserGrowthChart(days = 30) {
        const dates = [];
        const newUsers = [];
        const cumulativeUsers = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const start = startOfDay(date);
            const end = endOfDay(date);

            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString());

            const { count: totalCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .lte('created_at', end.toISOString());

            dates.push(format(date, 'dd/MM'));
            newUsers.push(count || 0);
            cumulativeUsers.push(totalCount || 0);
        }

        return {
            labels: dates,
            datasets: [
                {
                    label: 'Nouveaux utilisateurs',
                    data: newUsers,
                    type: 'bar',
                    backgroundColor: '#FF9800'
                },
                {
                    label: 'Total cumulé',
                    data: cumulativeUsers,
                    type: 'line',
                    borderColor: '#9C27B0',
                    tension: 0.1
                }
            ]
        };
    }

    /**
     * Obtenir l'activité récente
     * Logique : Flux d'événements pour monitoring
     */
    async getRecentActivity() {
        const activities = [];

        // Nouvelles commandes
        const { data: recentOrders } = await supabase
            .from('orders')
            .select(`
                id,
                created_at,
                total,
                users:client_id(nom)
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        recentOrders?.forEach(order => {
            activities.push({
                type: 'order',
                message: `Nouvelle commande de ${order.users?.nom || 'Client'}`,
                amount: order.total,
                time: order.created_at
            });
        });

        // Nouvelles boutiques
        const { data: recentShops } = await supabase
            .from('shops')
            .select('nom, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        recentShops?.forEach(shop => {
            activities.push({
                type: 'shop',
                message: `Nouvelle boutique: ${shop.nom}`,
                time: shop.created_at
            });
        });

        // Trier par date
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        return activities.slice(0, 10);
    }

    /**
     * Obtenir les alertes admin
     * Logique : Notifications importantes
     */
    async getAdminAlerts() {
        const alerts = [];

        // Boutiques en attente
        const { count: pendingShops } = await supabase
            .from('shops')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (pendingShops > 0) {
            alerts.push({
                type: 'warning',
                message: `${pendingShops} boutique(s) en attente d'approbation`,
                action: '/admin/shops/pending'
            });
        }

        // Produits en rupture
        const { count: outOfStock } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('stock', 0)
            .eq('status', 'active');

        if (outOfStock > 10) {
            alerts.push({
                type: 'info',
                message: `${outOfStock} produits en rupture de stock`,
                action: '/admin/products/out-of-stock'
            });
        }

        return alerts;
    }

    /**
     * Note moyenne de la plateforme
     * Logique : Moyenne de toutes les boutiques
     */
    async getPlatformAverageRating() {
        const { data } = await supabase
            .from('shops')
            .select('rating_average')
            .gt('rating_count', 0);

        if (!data || data.length === 0) return 0;

        const sum = data.reduce((acc, shop) => acc + (shop.rating_average || 0), 0);
        return parseFloat((sum / data.length).toFixed(2));
    }
}

export default new DashboardService();
