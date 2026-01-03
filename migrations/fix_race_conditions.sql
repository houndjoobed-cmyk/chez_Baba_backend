-- ============================================
-- MIGRATION: Corriger les race conditions
-- ============================================

-- 1. FONCTION ATOMIQUE POUR AJOUTER AU PANIER
CREATE OR REPLACE FUNCTION add_to_cart_atomic(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS JSON AS $$
DECLARE
    v_product_stock INTEGER;
    v_shop_id UUID;
    v_cart_id UUID;
BEGIN
    BEGIN
        -- 1. Vérifier le produit ET le stock de manière atomique (LOCK)
        SELECT p.stock, p.shop_id INTO v_product_stock, v_shop_id
        FROM products p
        WHERE p.id = p_product_id
        FOR UPDATE; -- Verrouiller la ligne produit
        
        -- 2. Vérifications
        IF v_product_stock IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'product_not_found'
            );
        END IF;
        
        IF v_product_stock < p_quantity THEN
            RETURN json_build_object(
                'success', false,
                'error', 'insufficient_stock',
                'available', v_product_stock,
                'requested', p_quantity
            );
        END IF;
        
        -- 3. Ajouter ou mettre à jour le panier
        INSERT INTO carts (user_id, product_id, shop_id, quantity, added_at, updated_at)
        VALUES (p_user_id, p_product_id, v_shop_id, p_quantity, NOW(), NOW())
        ON CONFLICT (user_id, product_id) DO UPDATE
        SET quantity = carts.quantity + EXCLUDED.quantity,
            updated_at = NOW()
        RETURNING id INTO v_cart_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Added to cart',
            'cart_id', v_cart_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. FONCTION ATOMIQUE POUR CRÉER UNE COMMANDE
CREATE OR REPLACE FUNCTION create_order_atomic(
    p_user_id UUID,
    p_products JSONB,
    p_shipping_address TEXT,
    p_payment_method TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_order_id UUID;
    v_product_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_price DECIMAL;
    v_total_amount DECIMAL := 0;
    v_product_count INTEGER := 0;
BEGIN
    BEGIN
        -- 1. Valider les données d'entrée
        IF p_products IS NULL OR jsonb_array_length(p_products) = 0 THEN
            RAISE EXCEPTION 'Empty product list';
        END IF;
        
        -- 2. Créer la commande
        INSERT INTO orders (
            client_id,
            status,
            payment_method,
            adresse_livraison,
            notes,
            created_at
        ) VALUES (
            p_user_id,
            'pending',
            p_payment_method,
            p_shipping_address,
            p_notes,
            NOW()
        ) RETURNING id INTO v_order_id;
        
        -- 3. Traiter chaque produit
        FOR v_product_item IN SELECT jsonb_array_elements(p_products) LOOP
            v_product_id := (v_product_item->>'product_id')::UUID;
            v_quantity := (v_product_item->>'quantite')::INTEGER;
            v_price := (v_product_item->>'prix_unitaire')::DECIMAL;
            
            -- Valider les données du produit
            IF v_quantity <= 0 THEN
                RAISE EXCEPTION 'Invalid quantity for product %', v_product_id;
            END IF;
            
            -- Vérifier et décrémenter le stock ATOMIQUEMENT
            UPDATE products 
            SET stock = stock - v_quantity
            WHERE id = v_product_id
            AND stock >= v_quantity
            AND status = 'active';
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
            END IF;
            
            -- Ajouter l'item à la commande
            INSERT INTO order_items (
                order_id,
                product_id,
                quantite,
                prix_unitaire,
                shop_id
            ) VALUES (
                v_order_id,
                v_product_id,
                v_quantity,
                v_price,
                (SELECT shop_id FROM products WHERE id = v_product_id)
            );
            
            v_total_amount := v_total_amount + (v_quantity * v_price);
            v_product_count := v_product_count + 1;
        END LOOP;
        
        -- 4. Mettre à jour le montant total de la commande
        UPDATE orders
        SET total = v_total_amount
        WHERE id = v_order_id;
        
        -- 5. Vider le panier de l'utilisateur
        DELETE FROM carts WHERE user_id = p_user_id;
        
        -- 6. Retourner le succès
        RETURN json_build_object(
            'success', true,
            'order_id', v_order_id,
            'total_amount', v_total_amount,
            'item_count', v_product_count
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback automatique de la transaction
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- 3. INDEX POUR OPTIMISER LES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_carts_user_product ON carts(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock) WHERE stock > 0;

-- 4. TRIGGER POUR VALIDER LA COHÉRENCE
CREATE OR REPLACE FUNCTION validate_order_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que la quantité est positive
    IF NEW.quantite <= 0 THEN
        RAISE EXCEPTION 'Quantite must be positive';
    END IF;
    
    -- Vérifier que le prix est positif
    IF NEW.prix_unitaire < 0 THEN
        RAISE EXCEPTION 'Prix cannot be negative';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_order_items ON order_items;
CREATE TRIGGER trigger_validate_order_items
BEFORE INSERT OR UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION validate_order_items();

-- 5. TRIGGER POUR VÉRIFIER LA COHÉRENCE DU STOCK
CREATE OR REPLACE FUNCTION check_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative for product %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_product_stock ON products;
CREATE TRIGGER trigger_check_product_stock
BEFORE UPDATE ON products
FOR EACH ROW
WHEN (NEW.stock != OLD.stock)
EXECUTE FUNCTION check_product_stock();

-- 6. FONCTION POUR RÉSERVER LE STOCK (Sans décrémenter)
CREATE OR REPLACE FUNCTION reserve_stock(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS JSON AS $$
DECLARE
    v_stock INTEGER;
BEGIN
    SELECT stock INTO v_stock
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;
    
    IF v_stock IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Product not found');
    END IF;
    
    IF v_stock < p_quantity THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient stock',
            'available', v_stock
        );
    END IF;
    
    -- Créer une réservation
    INSERT INTO stock_reservations (product_id, quantite, expires_at)
    VALUES (p_product_id, p_quantity, NOW() + INTERVAL '30 minutes');
    
    RETURN json_build_object('success', true, 'message', 'Stock reserved');
END;
$$ LANGUAGE plpgsql;

-- 7. TABLE POUR LES RÉSERVATIONS DE STOCK
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantite INTEGER NOT NULL CHECK (quantite > 0),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_expires ON stock_reservations(product_id, expires_at);

-- 8. FONCTION POUR NETTOYER LES RÉSERVATIONS EXPIRÉES
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $$
BEGIN
    DELETE FROM stock_reservations
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Exécuter chaque heure via cron
-- SELECT cron.schedule('cleanup-reservations', '0 * * * *', 'SELECT cleanup_expired_reservations()');
