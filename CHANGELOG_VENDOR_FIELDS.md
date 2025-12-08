# Changements effectués - Inscription des vendeurs

## Date : 2025-12-08

## Résumé
Ajout de champs obligatoires lors de l'inscription des vendeurs : **adresse**, **téléphone** et **ville**.

---

## 📝 Modifications apportées

### 1. **Contrôleur d'authentification** (`src/controllers/authController.js`)

#### Fonction `register`
- ✅ Ajout de la récupération des champs `adresse`, `telephone`, `ville` depuis `req.body`
- ✅ Ajout d'une validation spécifique pour les vendeurs (role === 'vendor')
- ✅ Ces 3 champs sont maintenant **obligatoires** pour les vendeurs
- ✅ Les données sont stockées dans la base de données lors de l'inscription
- ✅ Les informations sont retournées dans la réponse pour les vendeurs

#### Fonction `getProfile`
- ✅ Ajout des champs `adresse`, `telephone`, `ville` dans la requête SELECT
- ✅ Ces informations sont maintenant incluses dans le profil utilisateur

### 2. **Documentation API** (`API_DOCS.md`)

#### Section Inscription
- ✅ Ajout d'un exemple de body pour l'inscription d'un **client**
- ✅ Ajout d'un exemple de body pour l'inscription d'un **vendeur** avec les nouveaux champs
- ✅ Ajout d'une note expliquant que ces champs sont obligatoires pour les vendeurs
- ✅ Ajout d'exemples de réponse pour client et vendeur

#### Section Profil utilisateur
- ✅ Ajout d'un exemple de réponse pour un **client**
- ✅ Ajout d'un exemple de réponse pour un **vendeur** avec les champs supplémentaires

### 3. **Migration de base de données** (`migrations/add_vendor_fields.sql`)

- ✅ Création d'un script SQL pour ajouter les colonnes à la table `users`
- ✅ Script sécurisé avec vérification d'existence des colonnes
- ✅ Ajout de commentaires sur les colonnes

**Colonnes ajoutées :**
- `adresse` (TEXT) : Adresse complète du vendeur
- `telephone` (VARCHAR(20)) : Numéro de téléphone
- `ville` (VARCHAR(100)) : Ville du vendeur

### 4. **Documentation des migrations** (`migrations/README.md`)

- ✅ Instructions pour exécuter la migration via l'interface Supabase
- ✅ Instructions pour exécuter la migration via Supabase CLI
- ✅ Script de vérification après migration
- ✅ Script de rollback en cas de besoin

---

## 🚀 Prochaines étapes

### 1. **Exécuter la migration SQL**

Vous devez exécuter le script de migration pour ajouter les colonnes à votre base de données Supabase :

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez le contenu de `migrations/add_vendor_fields.sql`
5. Collez et exécutez le script

### 2. **Tester l'inscription d'un vendeur**

**Endpoint :** `POST /api/auth/register`

**Body :**
```json
{
  "nom": "Test Vendeur",
  "email": "vendeur@test.com",
  "motdepasse": "password123",
  "role": "vendor",
  "adresse": "123 Rue de Test, Quartier Example",
  "telephone": "+229 97 12 34 56",
  "ville": "Cotonou"
}
```

**Réponse attendue :**
```json
{
  "message": "Inscription réussie",
  "user": {
    "id": "uuid",
    "nom": "Test Vendeur",
    "email": "vendeur@test.com",
    "role": "vendor",
    "adresse": "123 Rue de Test, Quartier Example",
    "telephone": "+229 97 12 34 56",
    "ville": "Cotonou"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. **Tester la validation**

Essayez de créer un vendeur **sans** les champs requis pour vérifier que la validation fonctionne :

**Body (invalide) :**
```json
{
  "nom": "Test Vendeur",
  "email": "vendeur2@test.com",
  "motdepasse": "password123",
  "role": "vendor"
}
```

**Réponse attendue :**
```json
{
  "error": "Pour les vendeurs, l'adresse, le téléphone et la ville sont requis"
}
```

### 4. **Vérifier le profil**

**Endpoint :** `GET /api/auth/profile`

**Headers :** `Authorization: Bearer {token_du_vendeur}`

**Réponse attendue :** Le profil doit inclure les champs `adresse`, `telephone` et `ville`.

---

## 📋 Checklist de validation

- [ ] Migration SQL exécutée dans Supabase
- [ ] Vérification que les colonnes existent dans la table `users`
- [ ] Test d'inscription d'un client (sans les nouveaux champs) → ✅ Doit fonctionner
- [ ] Test d'inscription d'un vendeur avec tous les champs → ✅ Doit fonctionner
- [ ] Test d'inscription d'un vendeur sans les champs requis → ❌ Doit échouer avec message d'erreur
- [ ] Test de récupération du profil vendeur → ✅ Doit inclure les nouveaux champs
- [ ] Mise à jour du frontend pour inclure ces champs dans le formulaire d'inscription vendeur

---

## 🔧 Notes techniques

### Validation côté backend
La validation est effectuée uniquement pour le rôle `vendor`. Les clients peuvent s'inscrire sans ces champs.

### Format des données
- **adresse** : Texte libre (pas de limite de longueur)
- **telephone** : Format recommandé : `+229 XX XX XX XX` (20 caractères max)
- **ville** : Texte (100 caractères max)

### Sécurité
- Les mots de passe sont toujours hashés avec bcrypt
- Les tokens JWT sont générés de la même manière
- Aucune information sensible n'est exposée dans les réponses

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez que la migration a bien été exécutée
2. Vérifiez les logs du serveur pour les erreurs
3. Testez avec Postman ou un autre client API
4. Consultez la documentation mise à jour dans `API_DOCS.md`
