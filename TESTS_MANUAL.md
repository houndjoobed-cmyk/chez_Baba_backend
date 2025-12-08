# Tests manuels - Inscription des vendeurs

## 🧪 Tests à effectuer

### Test 1 : Inscription d'un client (sans les nouveaux champs)
**Devrait réussir** ✅

**Requête :**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Client Test",
    "email": "client@test.com",
    "motdepasse": "password123",
    "role": "client"
  }'
```

**Résultat attendu :** Status 201, inscription réussie

---

### Test 2 : Inscription d'un vendeur avec tous les champs
**Devrait réussir** ✅

**Requête :**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Vendeur Test",
    "email": "vendeur@test.com",
    "motdepasse": "password123",
    "role": "vendor",
    "adresse": "123 Rue de Test, Quartier Example",
    "telephone": "+229 97 12 34 56",
    "ville": "Cotonou"
  }'
```

**Résultat attendu :** 
- Status 201
- Réponse contient `adresse`, `telephone`, `ville`

---

### Test 3 : Inscription d'un vendeur SANS adresse
**Devrait échouer** ❌

**Requête :**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Vendeur Test 2",
    "email": "vendeur2@test.com",
    "motdepasse": "password123",
    "role": "vendor",
    "telephone": "+229 97 12 34 56",
    "ville": "Cotonou"
  }'
```

**Résultat attendu :** 
- Status 400
- Message : "Pour les vendeurs, l'adresse, le téléphone et la ville sont requis"

---

### Test 4 : Inscription d'un vendeur SANS téléphone
**Devrait échouer** ❌

**Requête :**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Vendeur Test 3",
    "email": "vendeur3@test.com",
    "motdepasse": "password123",
    "role": "vendor",
    "adresse": "123 Rue de Test",
    "ville": "Cotonou"
  }'
```

**Résultat attendu :** 
- Status 400
- Message : "Pour les vendeurs, l'adresse, le téléphone et la ville sont requis"

---

### Test 5 : Inscription d'un vendeur SANS ville
**Devrait échouer** ❌

**Requête :**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Vendeur Test 4",
    "email": "vendeur4@test.com",
    "motdepasse": "password123",
    "role": "vendor",
    "adresse": "123 Rue de Test",
    "telephone": "+229 97 12 34 56"
  }'
```

**Résultat attendu :** 
- Status 400
- Message : "Pour les vendeurs, l'adresse, le téléphone et la ville sont requis"

---

### Test 6 : Récupération du profil vendeur
**Devrait réussir** ✅

**Requête :**
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer {TOKEN_DU_VENDEUR}"
```

**Résultat attendu :** 
- Status 200
- Profil contient `adresse`, `telephone`, `ville`

---

### Test 7 : Email déjà utilisé
**Devrait échouer** ❌

**Requête :** (Utiliser le même email qu'au Test 2)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Autre Vendeur",
    "email": "vendeur@test.com",
    "motdepasse": "password123",
    "role": "vendor",
    "adresse": "456 Autre Rue",
    "telephone": "+229 97 00 00 00",
    "ville": "Porto-Novo"
  }'
```

**Résultat attendu :** 
- Status 400
- Message : "Cet email est déjà utilisé"

---

## 📝 Checklist de validation

- [ ] Test 1 : Client sans nouveaux champs → ✅ Réussi
- [ ] Test 2 : Vendeur avec tous les champs → ✅ Réussi
- [ ] Test 3 : Vendeur sans adresse → ❌ Échoué avec bon message
- [ ] Test 4 : Vendeur sans téléphone → ❌ Échoué avec bon message
- [ ] Test 5 : Vendeur sans ville → ❌ Échoué avec bon message
- [ ] Test 6 : Profil vendeur → ✅ Contient les nouveaux champs
- [ ] Test 7 : Email déjà utilisé → ❌ Échoué avec bon message

---

## 🔧 Commandes utiles

### Vérifier que le serveur tourne
```bash
curl http://localhost:5000/api/categories
```

### Vérifier les colonnes de la table users (via Supabase SQL Editor)
```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

### Voir tous les utilisateurs vendeurs (via Supabase SQL Editor)
```sql
SELECT id, nom, email, role, adresse, telephone, ville, created_at
FROM users
WHERE role = 'vendor';
```

---

## 📊 Résultats attendus

Tous les tests doivent passer pour valider l'implémentation :
- ✅ 3 tests doivent réussir (Tests 1, 2, 6)
- ❌ 4 tests doivent échouer avec les bons messages d'erreur (Tests 3, 4, 5, 7)

---

## 🐛 Debugging

Si un test échoue de manière inattendue :

1. **Vérifier que la migration SQL a été exécutée**
   - Aller sur Supabase Dashboard → SQL Editor
   - Exécuter : `SELECT * FROM information_schema.columns WHERE table_name = 'users';`
   - Vérifier que les colonnes `adresse`, `telephone`, `ville` existent

2. **Vérifier les logs du serveur**
   - Regarder la console où le serveur Node.js tourne
   - Chercher les erreurs Supabase ou de validation

3. **Vérifier le code**
   - `src/controllers/authController.js` → Fonction `register`
   - Vérifier que la validation est bien en place

4. **Tester avec Postman**
   - Plus facile pour voir les réponses détaillées
   - Permet de sauvegarder les requêtes

---

Bon test ! 🚀
