-- Table pour stocker toutes les images uploadées
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    url VARCHAR(500) NOT NULL, -- URL Cloudinary
    public_id VARCHAR(255) NOT NULL, -- ID Cloudinary pour suppression
    type VARCHAR(50), -- 'product', 'shop_logo', 'user_avatar'
    entity_id UUID, -- ID du produit/shop/user associé
    file_name VARCHAR(255),
    file_size INTEGER, -- Taille en bytes
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_media_entity ON media(entity_id, type);
CREATE INDEX idx_media_user ON media(user_id);

-- Modifier la table products pour supporter plusieurs images
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
-- Structure: [{"url": "...", "public_id": "...", "is_primary": true}]

-- Modifier la table shops pour la galerie
ALTER TABLE shops ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]';

-- Modifier la table users pour l'avatar
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);