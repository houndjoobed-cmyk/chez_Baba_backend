# 📚 Documentation API E-commerce Backend

## 🔗 URL de base
```
Développement: http://localhost:5000/api
Production: https://chez-baba-backend.onrender.com
```

---

## 🔐 Authentification

Toutes les routes protégées nécessitent un token JWT dans le header :
```
Authorization: Bearer {token}
```

Le token est retourné lors de l'inscription ou de la connexion.

---

## 📋 Table des matières

1. [Authentification](#authentification)
2. [Catégories](#catégories)
3. [Boutiques](#boutiques)
4. [Produits](#produits)
5. [Commandes](#commandes)

---

# 🔐 1. AUTHENTIFICATION

## Inscription
**POST** `/auth/register`

**Body (Client):**
```json
{
  "nom": "Jean Dupont",
  "email": "jean@example.com",
  "motdepasse": "password123",
  "role": "client"
}
```

**Body (Vendeur):**
```json
{
  "nom": "Marie Vendeur",
  "email": "marie@example.com",
  "motdepasse": "password123",
  "role": "vendor",
  "adresse": "Rue de la Paix, Maison 45",
  "telephone": "+229 97 12 34 56",
  "ville": "Cotonou"
}
```

**Note:** Pour les vendeurs (`role: "vendor"`), les champs `adresse`, `telephone` et `ville` sont **obligatoires**.

**Réponse (Client):**
```json
{
  "message": "Inscription réussie",
  "user": {
    "id": "uuid",
    "nom": "Jean Dupont",
    "email": "jean@example.com",
    "role": "client"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Réponse (Vendeur):**
```json
{
  "message": "Inscription réussie",
  "user": {
    "id": "uuid",
    "nom": "Marie Vendeur",
    "email": "marie@example.com",
    "role": "vendor",
    "adresse": "Rue de la Paix, Maison 45",
    "telephone": "+229 97 12 34 56",
    "ville": "Cotonou"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Connexion
**POST** `/auth/login`

**Body:**
```json
{
  "email": "jean@example.com",
  "motdepasse": "password123"
}
```

**Réponse:** (identique à l'inscription)

---

## Profil utilisateur
**GET** `/auth/profile`

**Headers:** `Authorization: Bearer {token}`

**Réponse (Client):**
```json
{
  "user": {
    "id": "uuid",
    "nom": "Jean Dupont",
    "email": "jean@example.com",
    "role": "client",
    "created_at": "2024-12-02T10:30:00"
  }
}
```

**Réponse (Vendeur):**
```json
{
  "user": {
    "id": "uuid",
    "nom": "Marie Vendeur",
    "email": "marie@example.com",
    "role": "vendor",
    "adresse": "Rue de la Paix, Maison 45",
    "telephone": "+229 97 12 34 56",
    "ville": "Cotonou",
    "created_at": "2024-12-02T10:30:00"
  }
}
```

---

# 📂 2. CATÉGORIES

## Liste des catégories
**GET** `/categories`

**Réponse:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "nom": "Téléphones & Accessoires",
      "slug": "telephones-accessoires",
      "description": "Smartphones, coques, écouteurs, chargeurs"
    },
    ...
  ]
}
```

**Catégories disponibles:**
- Téléphones & Accessoires
- Ordinateurs & Bureau
- Electronique
- Quincaillerie
- Maison & Jardin
- Jeux & Jouets
- Modes & Vêtements
- Batiments travaux public
- Véhicules
- Sports & Loisirs
- Santé & Beauté

---

## Détails d'une catégorie
**GET** `/categories/{id}`

---

## Produits d'une catégorie
**GET** `/categories/{id}/products`

**Réponse:**
```json
{
  "products": [
    {
      "id": "uuid",
      "titre": "iPhone 15 Pro",
      "description": "...",
      "prix": 450000,
      "stock": 10,
      "image": "url",
      "status": "active",
      "shops": {
        "nom": "TechShop Bénin",
        "logo": "url"
      },
      "categories": {
        "nom": "Téléphones & Accessoires",
        "slug": "telephones-accessoires"
      }
    },
    ...
  ]
}
```

---

# 🏪 3. BOUTIQUES

## Liste des boutiques actives
**GET** `/shops`

**Réponse:**
```json
{
  "shops": [
    {
      "id": "uuid",
      "owner_id": "uuid",
      "nom": "TechShop Bénin",
      "description": "Vente d'électronique...",
      "logo": "url",
      "status": "active",
      "created_at": "2024-12-02T10:30:00"
    },
    ...
  ]
}
```

---

## Détails d'une boutique
**GET** `/shops/{id}`

---

## Créer une boutique (Vendeur uniquement)
**POST** `/shops/create`

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "nom": "Ma Boutique",
  "description": "Description de ma boutique",
  "logo": "https://example.com/logo.png"
}
```

**Réponse:**
```json
{
  "message": "Boutique créée avec succès (en attente de validation)",
  "shop": {
    "id": "uuid",
    "nom": "Ma Boutique",
    "status": "pending",
    ...
  }
}
```

---

## Ma boutique (Vendeur)
**GET** `/shops/my/shop`

**Headers:** `Authorization: Bearer {token}`

---

## Modifier ma boutique (Vendeur)
**PUT** `/shops/update/{id}`

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "nom": "Nouveau nom",
  "description": "Nouvelle description",
  "logo": "nouvelle-url"
}
```

---

## Boutiques en attente (Admin)
**GET** `/shops/admin/pending`

**Headers:** `Authorization: Bearer {token}` (Admin)

---

## Approuver une boutique (Admin)
**PUT** `/shops/approve/{id}`

**Headers:** `Authorization: Bearer {token}` (Admin)

---

# 🛍️ 4. PRODUITS

## Liste de tous les produits
**GET** `/products`

**Réponse:**
```json
{
  "products": [
    {
      "id": "uuid",
      "shop_id": "uuid",
      "category_id": "uuid",
      "titre": "iPhone 15 Pro",
      "description": "Smartphone Apple...",
      "prix": 450000,
      "stock": 10,
      "image": "url",
      "status": "active",
      "created_at": "2024-12-02T10:30:00",
      "shops": {
        "nom": "TechShop Bénin",
        "logo": "url"
      },
      "categories": {
        "nom": "Téléphones & Accessoires",
        "slug": "telephones-accessoires"
      }
    },
    ...
  ]
}
```

---

## Produits d'une boutique
**GET** `/products/shop/{shopId}`

---

## Détails d'un produit
**GET** `/products/{id}`

---

## Mes produits (Vendeur)
**GET** `/products/my/products`

**Headers:** `Authorization: Bearer {token}`

---

## Créer un produit (Vendeur)
**POST** `/products/create`

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "titre": "iPhone 15 Pro",
  "description": "Smartphone Apple dernière génération",
  "prix": 450000,
  "stock": 10,
  "image": "https://example.com/iphone15.jpg",
  "category_id": "uuid-de-la-categorie"
}
```

**Note:** La boutique du vendeur doit être "active" pour créer des produits.

---

## Modifier un produit (Vendeur)
**PUT** `/products/update/{id}`

**Headers:** `Authorization: Bearer {token}`

**Body:** (tous les champs sont optionnels)
```json
{
  "titre": "Nouveau titre",
  "prix": 420000,
  "stock": 8,
  "category_id": "uuid"
}
```

---

## Supprimer un produit (Vendeur)
**DELETE** `/products/delete/{id}`

**Headers:** `Authorization: Bearer {token}`

---

# 🛒 5. COMMANDES

## Créer une commande (Client)
**POST** `/orders/create`

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "items": [
    {
      "product_id": "uuid-produit-1",
      "quantite": 2
    },
    {
      "product_id": "uuid-produit-2",
      "quantite": 1
    }
  ],
  "adresse_livraison": "Cotonou, Akpakpa, Rue de la Paix, Maison 45",
  "telephone": "+229 97 12 34 56",
  "notes": "Livrer le matin entre 9h et 12h"
}
```

**Réponse:**
```json
{
  "message": "Commande créée avec succès",
  "order": {
    "id": "uuid",
    "client_id": "uuid",
    "total": 1750000,
    "status": "pending",
    "payment_method": "manual",
    "adresse_livraison": "...",
    "telephone": "+229 97 12 34 56",
    "notes": "...",
    "created_at": "2024-12-02T10:30:00",
    "items": [...]
  }
}
```

**Notes:**
- Le total est calculé automatiquement
- Le stock est vérifié et mis à jour automatiquement
- Status initial : "pending"

---

## Mes commandes (Client)
**GET** `/orders/my/orders`

**Headers:** `Authorization: Bearer {token}`

**Réponse:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "total": 1750000,
      "status": "pending",
      "created_at": "2024-12-02T10:30:00",
      "order_items": [
        {
          "quantite": 2,
          "prix_unitaire": 450000,
          "products": {
            "titre": "iPhone 15 Pro",
            "image": "url"
          },
          "shops": {
            "nom": "TechShop Bénin"
          }
        },
        ...
      ]
    },
    ...
  ]
}
```

---

## Détails d'une commande
**GET** `/orders/{id}`

**Headers:** `Authorization: Bearer {token}`

**Permissions:**
- Client : Peut voir uniquement ses commandes
- Vendeur : Peut voir les commandes contenant ses produits
- Admin : Peut voir toutes les commandes

---

## Commandes de ma boutique (Vendeur)
**GET** `/orders/shop/orders`

**Headers:** `Authorization: Bearer {token}`

**Réponse:** Liste des commandes contenant les produits de la boutique du vendeur

---

## Confirmer une commande (Vendeur)
**PUT** `/orders/{id}/confirm`

**Headers:** `Authorization: Bearer {token}`

**Réponse:**
```json
{
  "message": "Commande confirmée",
  "order": {
    "id": "uuid",
    "status": "confirmed",
    ...
  }
}
```

---

## Marquer comme livrée (Vendeur)
**PUT** `/orders/{id}/deliver`

**Headers:** `Authorization: Bearer {token}`

**Réponse:**
```json
{
  "message": "Commande marquée comme livrée",
  "order": {
    "id": "uuid",
    "status": "delivered",
    ...
  }
}
```

---

## Annuler une commande
**PUT** `/orders/{id}/cancel`

**Headers:** `Authorization: Bearer {token}`

**Permissions:**
- Client : Peut annuler ses commandes
- Vendeur : Peut annuler les commandes contenant ses produits
- Admin : Peut annuler toutes les commandes

**Notes:**
- Impossible d'annuler une commande déjà livrée
- Le stock des produits est automatiquement restauré

---

## Toutes les commandes (Admin)
**GET** `/orders/admin/all`

**Headers:** `Authorization: Bearer {token}` (Admin)

---

# 📊 STATUTS

## Statuts des boutiques
- `pending` : En attente d'approbation
- `active` : Boutique approuvée et active
- `blocked` : Boutique bloquée par l'admin

## Statuts des produits
- `active` : Produit visible
- `inactive` : Produit masqué

## Statuts des commandes
- `pending` : Commande créée, en attente de confirmation
- `confirmed` : Commande confirmée par le vendeur
- `delivered` : Commande livrée
- `cancelled` : Commande annulée

---

# ⚠️ CODES D'ERREUR

- `400` : Requête invalide (données manquantes ou incorrectes)
- `401` : Non authentifié (token manquant ou invalide)
- `403` : Accès refusé (permissions insuffisantes)
- `404` : Ressource non trouvée
- `500` : Erreur serveur

**Format des erreurs:**
```json
{
  "error": "Message d'erreur explicite"
}
```

---

# 🔄 WORKFLOW TYPIQUE

## Pour un client :
1. Inscription/Connexion → Récupère le token
2. Voir les catégories → `GET /categories`
3. Voir les produits → `GET /products` ou `GET /categories/{id}/products`
4. Voir détails produit → `GET /products/{id}`
5. Passer commande → `POST /orders/create`
6. Suivre ses commandes → `GET /orders/my/orders`

## Pour un vendeur :
1. Inscription en tant que vendeur
2. Créer sa boutique → `POST /shops/create`
3. Attendre l'approbation de l'admin
4. Ajouter des produits → `POST /products/create`
5. Voir ses commandes → `GET /orders/shop/orders`
6. Gérer les commandes → Confirmer/Livrer

## Pour un admin :
1. Voir boutiques en attente → `GET /shops/admin/pending`
2. Approuver boutiques → `PUT /shops/approve/{id}`
3. Voir toutes les commandes → `GET /orders/admin/all`

---

# 💡 CONSEILS D'INTÉGRATION

## 1. Stockage du token
```javascript
// Après connexion/inscription
localStorage.setItem('token', response.token);
localStorage.setItem('user', JSON.stringify(response.user));

// Pour les requêtes
const token = localStorage.getItem('token');
headers: {
  'Authorization': `Bearer ${token}`
}
```

## 2. Gestion des erreurs
```javascript
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error);
  }
  
  return data;
} catch (error) {
  console.error('Erreur:', error.message);
  // Afficher un message à l'utilisateur
}
```

## 3. Formatage des prix
Les prix sont en FCFA (nombres entiers). Exemple : `450000` = 450 000 FCFA

```javascript
const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
};
```

## 4. Gestion du panier
Le panier est géré côté frontend. Lors du checkout, envoyer un tableau d'objets avec `product_id` et `quantite`.

---

# 🔧 VARIABLES D'ENVIRONNEMENT

Dans le frontend, créer un fichier `.env` :

```
REACT_APP_API_URL=http://localhost:5000/api
```

En production :
```
REACT_APP_API_URL=https://votre-backend.com/api
```

---

# 📞 CONTACT

Pour toute question sur l'API, contactez l'équipe backend.

**Version:** 1.0.0  
**Dernière mise à jour:** Décembre 2024