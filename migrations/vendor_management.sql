-- Table pour les plans d'abonnement vendeur
CREATE TABLE IF NOT EXISTS vendor_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'free', 'basic', 'premium', 'enterprise'
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL, -- 30, 365, etc.
    
    -- Limites du plan
    max_products INTEGER DEFAULT 10,
    max_images_per_product INTEGER DEFAULT 3,
    commission_rate DECIMAL(5,2) DEFAULT 10.00, -- Pourcentage de commission
    
    -- Fonctionnalités
    features JSONB DEFAULT '{}',
    -- Ex: {"analytics": true, "priority_support": false, "featured_products": 0}
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les abonnements vendeur
CREATE TABLE IF NOT EXISTS vendor_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES vendor_plans(id),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'pending'
    
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    
    -- Paiement
    payment_method VARCHAR(50), -- 'card', 'mobile_money', 'bank_transfer'
    last_payment_date TIMESTAMP,
    next_payment_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour l'historique des paiements vendeur
CREATE TABLE IF NOT EXISTS vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES vendor_subscriptions(id),
    
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'subscription', 'commission', 'penalty'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(255),
    
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les commissions marketplace
CREATE TABLE IF NOT EXISTS marketplace_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    order_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'collected', 'paid'
    collected_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les virements aux vendeurs
CREATE TABLE IF NOT EXISTS vendor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'XOF',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    -- Détails bancaires
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_name VARCHAR(100),
    
    -- Traitement
    processed_at TIMESTAMP,
    reference VARCHAR(255),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour le solde vendeur
CREATE TABLE IF NOT EXISTS vendor_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
    
    available_balance DECIMAL(10,2) DEFAULT 0, -- Disponible pour retrait
    pending_balance DECIMAL(10,2) DEFAULT 0, -- En attente (commandes non livrées)
    total_earned DECIMAL(12,2) DEFAULT 0, -- Total gagné historique
    total_withdrawn DECIMAL(12,2) DEFAULT 0, -- Total retiré
    
    last_payout_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les informations bancaires vendeur
CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50), -- 'savings', 'current'
    
    swift_code VARCHAR(20),
    iban VARCHAR(50),
    
    is_verified BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(shop_id, account_number)
);

-- Table pour les factures vendeur
CREATE TABLE IF NOT EXISTS vendor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'subscription', 'commission', 'monthly_statement'
    
    period_start DATE,
    period_end DATE,
    
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'overdue'
    due_date DATE,
    paid_date DATE,
    
    invoice_url TEXT, -- Lien vers PDF
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_shop ON vendor_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_status ON vendor_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_shop ON vendor_payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_commissions_shop ON marketplace_commissions(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_shop ON vendor_payouts(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_shop ON vendor_invoices(shop_id);

-- Insérer les plans par défaut
INSERT INTO vendor_plans (name, code, price, duration_days, max_products, commission_rate, features) VALUES
('Gratuit', 'free', 0, 30, 10, 15.00, '{"analytics": false, "priority_support": false, "featured_products": 0}'),
('Basic', 'basic', 5000, 30, 50, 12.00, '{"analytics": true, "priority_support": false, "featured_products": 2}'),
('Premium', 'premium', 15000, 30, 200, 10.00, '{"analytics": true, "priority_support": true, "featured_products": 5}'),
('Enterprise', 'enterprise', 50000, 30, -1, 7.00, '{"analytics": true, "priority_support": true, "featured_products": 10, "custom_domain": true}')
ON CONFLICT (code) DO NOTHING;

-- Fonction pour calculer les commissions d'une commande
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_shop_id UUID;
    v_commission_rate DECIMAL;
    v_commission_amount DECIMAL;
BEGIN
    -- Pour chaque boutique dans la commande
    FOR v_shop_id IN 
        SELECT DISTINCT shop_id 
        FROM order_items 
        WHERE order_id = NEW.id
    LOOP
        -- Obtenir le taux de commission
        SELECT COALESCE(vp.commission_rate, 10.00)
        INTO v_commission_rate
        FROM shops s
        LEFT JOIN vendor_subscriptions vs ON s.id = vs.shop_id AND vs.status = 'active'
        LEFT JOIN vendor_plans vp ON vs.plan_id = vp.id
        WHERE s.id = v_shop_id;
        
        -- Calculer le montant de la commande pour cette boutique
        SELECT SUM(quantite * prix_unitaire)
        INTO v_commission_amount
        FROM order_items
        WHERE order_id = NEW.id AND shop_id = v_shop_id;
        
        -- Créer l'entrée de commission
        INSERT INTO marketplace_commissions (
            order_id, shop_id, order_amount, 
            commission_rate, commission_amount
        ) VALUES (
            NEW.id, v_shop_id, v_commission_amount,
            v_commission_rate, v_commission_amount * v_commission_rate / 100
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer les commissions
CREATE TRIGGER calculate_commission_trigger
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION calculate_order_commission();

-- Fonction pour mettre à jour le solde vendeur
CREATE OR REPLACE FUNCTION update_vendor_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_amount DECIMAL;
BEGIN
    -- Si la commande est livrée, déplacer de pending à available
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        SELECT order_amount - commission_amount
        INTO v_amount
        FROM marketplace_commissions
        WHERE order_id = NEW.id;
        
        UPDATE vendor_balances
        SET 
            pending_balance = pending_balance - v_amount,
            available_balance = available_balance + v_amount,
            total_earned = total_earned + v_amount
        WHERE shop_id IN (
            SELECT DISTINCT shop_id 
            FROM order_items 
            WHERE order_id = NEW.id
        );
    END IF;
    
    -- Si la commande est confirmée, ajouter à pending
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        SELECT order_amount - commission_amount
        INTO v_amount
        FROM marketplace_commissions
        WHERE order_id = NEW.id;
        
        UPDATE vendor_balances
        SET pending_balance = pending_balance + v_amount
        WHERE shop_id IN (
            SELECT DISTINCT shop_id 
            FROM order_items 
            WHERE order_id = NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le solde
CREATE TRIGGER update_balance_trigger
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_vendor_balance();