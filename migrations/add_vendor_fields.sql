-- Migration: Ajout des champs pour les vendeurs
-- Date: 2025-12-08
-- Description: Ajoute les colonnes adresse, telephone et ville à la table users pour les vendeurs

-- Ajouter la colonne adresse si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'adresse'
    ) THEN
        ALTER TABLE users ADD COLUMN adresse TEXT;
    END IF;
END $$;

-- Ajouter la colonne telephone si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'telephone'
    ) THEN
        ALTER TABLE users ADD COLUMN telephone VARCHAR(20);
    END IF;
END $$;

-- Ajouter la colonne ville si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'ville'
    ) THEN
        ALTER TABLE users ADD COLUMN ville VARCHAR(100);
    END IF;
END $$;

-- Commentaires sur les colonnes
COMMENT ON COLUMN users.adresse IS 'Adresse complète du vendeur (requis pour role=vendor)';
COMMENT ON COLUMN users.telephone IS 'Numéro de téléphone du vendeur (requis pour role=vendor)';
COMMENT ON COLUMN users.ville IS 'Ville du vendeur (requis pour role=vendor)';
