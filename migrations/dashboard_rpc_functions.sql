-- ============================================
-- FONCTIONS RPC POUR LE DASHBOARD
-- À exécuter dans Supabase
-- ============================================

-- Fonction pour obtenir les produits les plus vendus d'une boutique
CREATE OR REPLACE FUNCTION get_top_selling_products(p_shop_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    quantity_sold BIGINT,
    revenue DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.product_id,
        p.titre::TEXT,
        SUM(oi.quantite)::BIGINT as quantity_sold,
        SUM(oi.quantite * oi.prix_unitaire)::DECIMAL as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.shop_id = p_shop_id
    GROUP BY oi.product_id, p.titre
    ORDER BY SUM(oi.quantite) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction pour obtenir les meilleures boutiques par revenus
CREATE OR REPLACE FUNCTION get_top_shops_by_revenue(p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
    shop_id UUID,
    shop_name TEXT,
    total_revenue DECIMAL,
    order_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.nom::TEXT,
        SUM(oi.quantite * oi.prix_unitaire)::DECIMAL as total_revenue,
        COUNT(DISTINCT oi.order_id)::BIGINT as order_count
    FROM order_items oi
    JOIN shops s ON oi.shop_id = s.id
    WHERE s.status = 'active'
    GROUP BY s.id, s.nom
    ORDER BY SUM(oi.quantite * oi.prix_unitaire) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction pour obtenir les meilleures catégories
CREATE OR REPLACE FUNCTION get_top_categories(p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
    category_id UUID,
    category_name TEXT,
    order_count BIGINT,
    revenue DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.nom::TEXT,
        COUNT(DISTINCT oi.order_id)::BIGINT as order_count,
        SUM(oi.quantite * oi.prix_unitaire)::DECIMAL as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.id, c.nom
    ORDER BY COUNT(DISTINCT oi.order_id) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
