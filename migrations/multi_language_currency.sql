-- Table pour les langues supportées
CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(5) UNIQUE NOT NULL, -- 'fr', 'en', 'yo' (yoruba), 'fon'
    name VARCHAR(50) NOT NULL,
    native_name VARCHAR(50),
    flag_emoji VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les devises supportées
CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) UNIQUE NOT NULL, -- 'XOF', 'EUR', 'USD', 'NGN'
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    symbol_position VARCHAR(10) DEFAULT 'after', -- 'before' ou 'after'
    decimal_places INTEGER DEFAULT 2,
    exchange_rate DECIMAL(10,4) DEFAULT 1, -- Taux par rapport à XOF
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les traductions
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code VARCHAR(5) REFERENCES languages(code) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL, -- 'product.add_to_cart', 'common.welcome'
    value TEXT NOT NULL,
    context VARCHAR(100), -- 'frontend', 'email', 'admin'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(language_code, key, context)
);

-- Table pour les traductions de produits
CREATE TABLE IF NOT EXISTS product_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    language_code VARCHAR(5) REFERENCES languages(code) ON DELETE CASCADE,
    titre VARCHAR(255),
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, language_code)
);

-- Table pour les traductions de catégories
CREATE TABLE IF NOT EXISTS category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    language_code VARCHAR(5) REFERENCES languages(code) ON DELETE CASCADE,
    nom VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category_id, language_code)
);

-- Table pour les traductions de boutiques
CREATE TABLE IF NOT EXISTS shop_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    language_code VARCHAR(5) REFERENCES languages(code) ON DELETE CASCADE,
    description TEXT,
    policies TEXT, -- Conditions de vente traduites
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shop_id, language_code)
);

-- Table pour les préférences utilisateur
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    preferred_language VARCHAR(5) REFERENCES languages(code),
    preferred_currency VARCHAR(3) REFERENCES currencies(code),
    timezone VARCHAR(50) DEFAULT 'Africa/Porto-Novo',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour l'historique des taux de change
CREATE TABLE IF NOT EXISTS exchange_rates_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code VARCHAR(3) REFERENCES currencies(code),
    rate DECIMAL(10,4) NOT NULL,
    source VARCHAR(50), -- 'manual', 'api', 'bank'
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code);
CREATE INDEX IF NOT EXISTS idx_product_translations ON product_translations(product_id, language_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_history ON exchange_rates_history(currency_code, recorded_at DESC);

-- Insérer les langues par défaut
INSERT INTO languages (code, name, native_name, flag_emoji, is_active, is_default) VALUES
('fr', 'Français', 'Français', '🇫🇷', true, true),
('en', 'English', 'English', '🇬🇧', true, false),
('yo', 'Yoruba', 'Èdè Yorùbá', '🇳🇬', true, false),
('fon', 'Fon', 'Fon gbè', '🇧🇯', true, false)
ON CONFLICT (code) DO NOTHING;

-- Insérer les devises par défaut
INSERT INTO currencies (code, name, symbol, symbol_position, decimal_places, exchange_rate, is_active, is_default) VALUES
('XOF', 'Franc CFA', 'FCFA', 'after', 0, 1, true, true),
('EUR', 'Euro', '€', 'before', 2, 655.957, true, false),
('USD', 'US Dollar', '$', 'before', 2, 600.50, true, false),
('NGN', 'Nigerian Naira', '₦', 'before', 2, 1.30, true, false)
ON CONFLICT (code) DO NOTHING;

-- Fonction pour obtenir le prix dans une devise
CREATE OR REPLACE FUNCTION convert_price(
    p_amount DECIMAL,
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
) RETURNS DECIMAL AS $$
DECLARE
    v_from_rate DECIMAL;
    v_to_rate DECIMAL;
    v_decimal_places INTEGER;
    v_result DECIMAL;
BEGIN
    -- Si même devise, retourner le montant
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;
    
    -- Obtenir les taux
    SELECT exchange_rate INTO v_from_rate 
    FROM currencies 
    WHERE code = p_from_currency;
    
    SELECT exchange_rate, decimal_places INTO v_to_rate, v_decimal_places
    FROM currencies 
    WHERE code = p_to_currency;
    
    -- Convertir via XOF (devise de base)
    -- Montant en XOF = montant * taux_from
    -- Montant dans devise cible = montant_XOF / taux_to
    v_result := (p_amount * v_from_rate) / v_to_rate;
    
    RETURN ROUND(v_result, v_decimal_places);
END;
$$ LANGUAGE plpgsql;

-- Vue pour obtenir les produits avec traductions
CREATE OR REPLACE VIEW products_multilingual_view AS
SELECT 
    p.*,
    COALESCE(pt.titre, p.titre) as translated_title,
    COALESCE(pt.description, p.description) as translated_description,
    pt.language_code,
    c.code as currency_code,
    convert_price(p.prix::DECIMAL, 'XOF'::VARCHAR(3), c.code::VARCHAR(3)) as converted_price
FROM products p
LEFT JOIN product_translations pt ON p.id = pt.product_id
CROSS JOIN currencies c
WHERE c.is_active = true;