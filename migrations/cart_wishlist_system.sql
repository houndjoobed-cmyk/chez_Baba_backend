-- Table pour le panier persistant
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Un produit ne peut être qu'une fois dans le panier d'un utilisateur
    UNIQUE(user_id, product_id)
);

-- Table pour les favoris/wishlist
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    -- Un produit ne peut être qu'une fois dans les favoris
    UNIQUE(user_id, product_id)
);

-- Table pour les paniers abandonnés (tracking marketing)
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cart_content JSONB NOT NULL, -- Snapshot du panier
    total_amount DECIMAL(10,2),
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,
    recovered BOOLEAN DEFAULT FALSE,
    recovered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour sauvegarder temporairement le panier des utilisateurs non connectés
CREATE TABLE IF NOT EXISTS guest_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    cart_content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_product ON carts(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_guest_carts_session ON guest_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_carts_expires ON guest_carts(expires_at);

-- Vue pour obtenir le panier complet avec les détails produits
CREATE OR REPLACE VIEW cart_details_view AS
SELECT 
    c.id,
    c.user_id,
    c.product_id,
    c.quantity,
    c.added_at,
    p.titre as product_name,
    p.description,
    p.prix as unit_price,
    p.stock,
    p.image,
    p.status as product_status,
    (c.quantity * p.prix) as subtotal,
    s.id as shop_id,
    s.nom as shop_name,
    s.logo as shop_logo,
    cat.nom as category_name
FROM carts c
JOIN products p ON c.product_id = p.id
JOIN shops s ON p.shop_id = s.id
JOIN categories cat ON p.category_id = cat.id;

-- Vue pour obtenir les favoris avec détails
CREATE OR REPLACE VIEW wishlist_details_view AS
SELECT 
    w.id,
    w.user_id,
    w.product_id,
    w.added_at,
    p.titre as product_name,
    p.description,
    p.prix,
    p.stock,
    p.image,
    p.rating_average,
    p.rating_count,
    s.nom as shop_name,
    cat.nom as category_name
FROM wishlists w
JOIN products p ON w.product_id = p.id
JOIN shops s ON p.shop_id = s.id
JOIN categories cat ON p.category_id = cat.id;

-- Fonction pour calculer le total du panier
CREATE OR REPLACE FUNCTION calculate_cart_total(p_user_id UUID)
RETURNS TABLE(
    total_items INTEGER,
    unique_products INTEGER,
    total_amount DECIMAL,
    shops_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(c.quantity), 0)::INTEGER as total_items,
        COUNT(DISTINCT c.product_id)::INTEGER as unique_products,
        COALESCE(SUM(c.quantity * p.prix), 0)::DECIMAL as total_amount,
        COUNT(DISTINCT p.shop_id)::INTEGER as shops_count
    FROM carts c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = p_user_id
    AND p.status = 'active'
    AND p.stock > 0;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier et ajuster les quantités selon le stock
CREATE OR REPLACE FUNCTION validate_cart_quantities()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier si la quantité demandée est disponible
    IF NEW.quantity > (SELECT stock FROM products WHERE id = NEW.product_id) THEN
        NEW.quantity := (SELECT stock FROM products WHERE id = NEW.product_id);
        -- Si stock = 0, empêcher l'ajout/mise à jour
        IF NEW.quantity = 0 THEN
            RAISE EXCEPTION 'Produit en rupture de stock';
        END IF;
    END IF;
    
    -- Mettre à jour shop_id
    NEW.shop_id := (SELECT shop_id FROM products WHERE id = NEW.product_id);
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour valider les quantités
CREATE TRIGGER validate_cart_trigger
BEFORE INSERT OR UPDATE ON carts
FOR EACH ROW EXECUTE FUNCTION validate_cart_quantities();

-- Fonction pour nettoyer les paniers expirés des invités
CREATE OR REPLACE FUNCTION cleanup_expired_guest_carts()
RETURNS void AS $$
BEGIN
    DELETE FROM guest_carts WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Fonction pour détecter les paniers abandonnés
CREATE OR REPLACE FUNCTION detect_abandoned_carts()
RETURNS void AS $$
DECLARE
    v_user RECORD;
    v_cart_content JSONB;
    v_total DECIMAL;
BEGIN
    -- Chercher les paniers non modifiés depuis 24h
    FOR v_user IN 
        SELECT DISTINCT user_id 
        FROM carts 
        WHERE updated_at < NOW() - INTERVAL '24 hours'
        AND user_id NOT IN (
            SELECT DISTINCT client_id 
            FROM orders 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        )
    LOOP
        -- Créer un snapshot du panier
        SELECT json_agg(row_to_json(c))::JSONB, SUM(subtotal)
        INTO v_cart_content, v_total
        FROM cart_details_view c
        WHERE c.user_id = v_user.user_id;
        
        -- Sauvegarder comme panier abandonné
        INSERT INTO abandoned_carts (user_id, cart_content, total_amount)
        VALUES (v_user.user_id, v_cart_content, v_total)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;