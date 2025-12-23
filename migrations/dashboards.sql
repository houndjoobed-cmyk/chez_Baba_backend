-- Table pour stocker les statistiques calculées des vendeurs
CREATE TABLE IF NOT EXISTS vendor_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Statistiques du jour
    orders_today INTEGER DEFAULT 0,
    revenue_today DECIMAL(10,2) DEFAULT 0,
    products_sold_today INTEGER DEFAULT 0,
    
    -- Statistiques du mois
    orders_month INTEGER DEFAULT 0,
    revenue_month DECIMAL(10,2) DEFAULT 0,
    products_sold_month INTEGER DEFAULT 0,
    
    -- Statistiques totales
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_products_sold INTEGER DEFAULT 0,
    
    -- Performance
    average_order_value DECIMAL(10,2) DEFAULT 0,
    best_selling_product JSONB DEFAULT '{}', -- {id, name, quantity}
    
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shop_id, date)
);

-- Table pour stocker les statistiques admin
CREATE TABLE IF NOT EXISTS admin_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    
    -- Utilisateurs
    total_users INTEGER DEFAULT 0,
    total_vendors INTEGER DEFAULT 0,
    total_clients INTEGER DEFAULT 0,
    new_users_today INTEGER DEFAULT 0,
    
    -- Boutiques
    total_shops INTEGER DEFAULT 0,
    active_shops INTEGER DEFAULT 0,
    pending_shops INTEGER DEFAULT 0,
    
    -- Produits
    total_products INTEGER DEFAULT 0,
    active_products INTEGER DEFAULT 0,
    
    -- Commandes
    orders_today INTEGER DEFAULT 0,
    revenue_today DECIMAL(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vue pour obtenir rapidement les stats vendeur actuelles
CREATE OR REPLACE VIEW vendor_dashboard_view AS
SELECT 
    s.id as shop_id,
    s.nom as shop_name,
    s.status,
    s.rating_average,
    s.rating_count,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT CASE WHEN p.stock > 0 THEN p.id END) as products_in_stock,
    COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) as products_out_of_stock
FROM shops s
LEFT JOIN products p ON p.shop_id = s.id
GROUP BY s.id;

-- Vue pour obtenir rapidement les stats admin
CREATE OR REPLACE VIEW admin_dashboard_view AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'vendor') as total_vendors,
    (SELECT COUNT(*) FROM users WHERE role = 'client') as total_clients,
    (SELECT COUNT(*) FROM shops WHERE status = 'active') as active_shops,
    (SELECT COUNT(*) FROM shops WHERE status = 'pending') as pending_shops,
    (SELECT COUNT(*) FROM products WHERE status = 'active') as active_products,
    (SELECT COUNT(*) FROM orders) as total_orders;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vendor_stats_shop_date ON vendor_stats(shop_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_admin_stats_date ON admin_stats(date DESC);