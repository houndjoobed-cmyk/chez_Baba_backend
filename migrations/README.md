# Migrations de la base de données

Ce dossier contient les scripts de migration SQL pour la base de données Supabase.

## Comment exécuter une migration

### Option 1 : Via l'interface Supabase (Recommandé)

1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Allez dans **SQL Editor** dans le menu de gauche
3. Cliquez sur **New Query**
4. Copiez le contenu du fichier de migration (par exemple `add_vendor_fields.sql`)
5. Collez-le dans l'éditeur SQL
6. Cliquez sur **Run** pour exécuter la migration

### Option 2 : Via Supabase CLI

```bash
# Si vous avez installé Supabase CLI
supabase db push
```

## Migrations disponibles

### `add_vendor_fields.sql`
**Date:** 2025-12-08  
**Description:** Ajoute les colonnes `adresse`, `telephone` et `ville` à la table `users` pour les vendeurs.

**Colonnes ajoutées:**
- `adresse` (TEXT) : Adresse complète du vendeur
- `telephone` (VARCHAR(20)) : Numéro de téléphone du vendeur
- `ville` (VARCHAR(100)) : Ville du vendeur

**Note:** Ces champs sont requis lors de l'inscription d'un utilisateur avec le rôle `vendor`.

## Vérification après migration

Après avoir exécuté la migration, vous pouvez vérifier que les colonnes ont été ajoutées avec cette requête SQL :

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

## Rollback

Si vous devez annuler cette migration, utilisez ce script :

```sql
-- Supprimer les colonnes ajoutées
ALTER TABLE users DROP COLUMN IF EXISTS adresse;
ALTER TABLE users DROP COLUMN IF EXISTS telephone;
ALTER TABLE users DROP COLUMN IF EXISTS ville;
```

⚠️ **Attention:** Le rollback supprimera toutes les données stockées dans ces colonnes.
