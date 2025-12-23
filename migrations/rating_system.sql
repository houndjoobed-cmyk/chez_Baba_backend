-- Table pour les notes de produits
CREATE TABLE IF NOT EXISTS product_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Un utilisateur ne peut noter qu'une fois un produit
    UNIQUE(product_id, user_id)
);

-- Table pour les notes de boutiques
CREATE TABLE IF NOT EXISTS shop_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Un utilisateur ne peut noter qu'une fois une boutique
    UNIQUE(shop_id, user_id)
);

-- Ajouter les colonnes de statistiques aux produits
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_sum INTEGER DEFAULT 0;

-- Ajouter les colonnes de statistiques aux boutiques
ALTER TABLE shops
    ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_sum INTEGER DEFAULT 0;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user ON product_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_ratings_shop ON shop_ratings(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_ratings_user ON shop_ratings(user_id);

-- Fonction pour mettre à jour les statistiques de notation d'un produit
CREATE OR REPLACE FUNCTION update_product_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_sum INTEGER;
    v_avg DECIMAL(3,2);
BEGIN
    -- Calculer les nouvelles statistiques
    SELECT 
        COUNT(*),
        COALESCE(SUM(rating), 0),
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(AVG(rating::DECIMAL), 2)
            ELSE 0
        END
    INTO v_count, v_sum, v_avg
    FROM product_ratings
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);
    
    -- Mettre à jour la table products
    UPDATE products
    SET 
        rating_count = v_count,
        rating_sum = v_sum,
        rating_average = v_avg,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les statistiques de notation d'une boutique
CREATE OR REPLACE FUNCTION update_shop_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_sum INTEGER;
    v_avg DECIMAL(3,2);
BEGIN
    -- Calculer les nouvelles statistiques
    SELECT 
        COUNT(*),
        COALESCE(SUM(rating), 0),
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(AVG(rating::DECIMAL), 2)
            ELSE 0
        END
    INTO v_count, v_sum, v_avg
    FROM shop_ratings
    WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id);
    
    -- Mettre à jour la table shops
    UPDATE shops
    SET 
        rating_count = v_count,
        rating_sum = v_sum,
        rating_average = v_avg,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.shop_id, OLD.shop_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour automatiquement les statistiques
CREATE TRIGGER update_product_rating_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON product_ratings
FOR EACH ROW EXECUTE FUNCTION update_product_rating_stats();

CREATE TRIGGER update_shop_rating_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON shop_ratings
FOR EACH ROW EXECUTE FUNCTION update_shop_rating_stats();

-- Vue pour obtenir facilement les produits les mieux notés
CREATE OR REPLACE VIEW top_rated_products AS
SELECT 
    p.*,
    c.nom as category_name,
    s.nom as shop_name
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN shops s ON p.shop_id = s.id
WHERE p.status = 'active' 
    AND p.rating_count >= 5  -- Au moins 5 notes pour être considéré
ORDER BY p.rating_average DESC, p.rating_count DESC;

-- Vue pour obtenir facilement les boutiques les mieux notées
CREATE OR REPLACE VIEW top_rated_shops AS
SELECT 
    s.*
FROM shops s
WHERE s.status = 'active' 
    AND s.rating_count >= 5  -- Au moins 5 notes pour être considéré
ORDER BY s.rating_average DESC, s.rating_count DESC;