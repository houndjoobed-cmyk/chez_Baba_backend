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


# 📖 Documentation API - Chez Baba Marketplace


## 🔑 Authentification
L'API utilise JWT (JSON Web Tokens) pour l'authentification.

### Headers requis pour les routes protégées:
```
Authorization: Bearer <token>
```

## 📋 Table des matières

- [Authentification](#authentification)
- [Utilisateurs](#utilisateurs)
- [Produits](#produits)
- [Panier & Favoris](#panier--favoris)
- [Commandes](#commandes)
- [Boutiques](#boutiques)
- [Recherche & Filtres](#recherche--filtres)
- [Évaluations](#évaluations)
- [Médias](#médias)
- [Dashboard](#dashboard)
- [Internationalisation](#internationalisation)
- [Gestion Vendeurs](#gestion-vendeurs)
- [Health & Monitoring](#health--monitoring)

---

## 🔐 Authentification

### Inscription
```http
POST /api/auth/register
```

**Body:**
```json
{
  "nom": "John Doe",
  "email": "john@example.com",
  "telephone": "+22990123456",
  "password": "Password123!",
  "role": "client|vendor"
}
```

**Response (201):**
```json
{
  "message": "Compte créé avec succès. Vérifiez votre email.",
  "userId": "uuid",
  "email": "john@example.com"
}
```

### Connexion
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "nom": "John Doe",
    "email": "john@example.com",
    "role": "client",
    "email_verified": true
  }
}
```

### Connexion Google OAuth
```http
POST /api/auth/google
```

**Body:**
```json
{
  "idToken": "google_id_token"
}
```

**Response (200):**
```json
{
  "token": "jwt_token",
  "user": {...},
  "isNewUser": false
}
```

### Vérification Email
```http
POST /api/auth/verify-email
```

**Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

### Réinitialisation mot de passe
```http
POST /api/auth/forgot-password
```

**Body:**
```json
{
  "email": "john@example.com"
}
```
```http
POST /api/auth/reset-password
```

**Body:**
```json
{
  "token": "reset_token",
  "newPassword": "NewPassword123!"
}
```

### Activer 2FA
```http
POST /api/auth/enable-2fa
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "secret": "base32_secret",
  "qrCode": "data:image/png;base64,..."
}
```

---

## 👤 Utilisateurs

### Profil utilisateur
```http
GET /api/users/profile
Authorization: Bearer <token>
```

### Mettre à jour profil
```http
PUT /api/users/profile
Authorization: Bearer <token>
```

**Body:**
```json
{
  "nom": "John Updated",
  "telephone": "+22990123456",
  "adresse": "Cotonou, Bénin"
}
```

### Préférences utilisateur
```http
GET /api/users/preferences
Authorization: Bearer <token>
```
```http
PUT /api/users/preferences
Authorization: Bearer <token>
```

**Body:**
```json
{
  "preferred_language": "fr",
  "preferred_currency": "XOF",
  "timezone": "Africa/Porto-Novo",
  "date_format": "DD/MM/YYYY"
}
```

---

## 📦 Produits

### Liste des produits
```http
GET /api/products
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `category` - ID de catégorie
- `minPrice` - Prix minimum
- `maxPrice` - Prix maximum
- `shop` - ID de boutique
- `sort` - `price_asc|price_desc|newest|popular`
- `inStock` - `true|false`

**Response (200):**
```json
{
  "products": [
    {
      "id": "uuid",
      "titre": "Produit 1",
      "description": "Description",
      "prix": 1500,
      "prix_formaté": "1 500 FCFA",
      "stock": 10,
      "images": ["url1", "url2"],
      "category": {
        "id": "uuid",
        "nom": "Catégorie"
      },
      "shop": {
        "id": "uuid",
        "nom": "Boutique",
        "logo": "url"
      },
      "rating_average": 4.5,
      "rating_count": 23,
      "views": 150
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Détail produit
```http
GET /api/products/:id
```

### Créer produit (Vendeur)
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (FormData):**
- `titre` - Nom du produit
- `description` - Description
- `prix` - Prix en FCFA
- `stock` - Quantité en stock
- `category_id` - ID catégorie
- `images[]` - Fichiers images (max 5)

### Mettre à jour produit
```http
PUT /api/products/:id
Authorization: Bearer <token>
```

### Supprimer produit
```http
DELETE /api/products/:id
Authorization: Bearer <token>
```

### Produits similaires
```http
GET /api/products/:id/similar
```

---

## 🛒 Panier & Favoris

### Obtenir le panier
```http
GET /api/cart
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Produit",
      "quantity": 2,
      "unit_price": 1000,
      "subtotal": 2000,
      "image": "url",
      "stock": 10,
      "shop_name": "Boutique"
    }
  ],
  "itemsByShop": [
    {
      "shopId": "uuid",
      "shopName": "Boutique",
      "items": [...],
      "subtotal": 2000
    }
  ],
  "summary": {
    "totalItems": 2,
    "uniqueProducts": 1,
    "totalAmount": 2000,
    "shopsCount": 1
  }
}
```

### Ajouter au panier
```http
POST /api/cart/add
Authorization: Bearer <token>
```

**Body:**
```json
{
  "productId": "uuid",
  "quantity": 2
}
```

### Mettre à jour quantité
```http
PUT /api/cart/update/:productId
Authorization: Bearer <token>
```

**Body:**
```json
{
  "quantity": 3
}
```

### Retirer du panier
```http
DELETE /api/cart/remove/:productId
Authorization: Bearer <token>
```

### Vider le panier
```http
DELETE /api/cart/clear
Authorization: Bearer <token>
```

### Valider le panier
```http
GET /api/cart/validate
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "isValid": true,
  "issues": [],
  "validItems": [...],
  "canCheckout": true
}
```

### Favoris - Liste
```http
GET /api/cart/wishlist
Authorization: Bearer <token>
```

### Favoris - Ajouter
```http
POST /api/cart/wishlist/add
Authorization: Bearer <token>
```

**Body:**
```json
{
  "productId": "uuid"
}
```

### Favoris - Retirer
```http
DELETE /api/cart/wishlist/remove/:productId
Authorization: Bearer <token>
```

### Déplacer vers panier
```http
POST /api/cart/wishlist/move-to-cart/:productId
Authorization: Bearer <token>
```

### Panier invité (non connecté)
```http
POST /api/cart/guest/save
```

**Headers:**
```
X-Session-Id: session_id (optionnel)
```

**Body:**
```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 1
    }
  ]
}
```
```http
GET /api/cart/guest
X-Session-Id: session_id
```

### Fusionner paniers après connexion
```http
POST /api/cart/merge
Authorization: Bearer <token>
X-Session-Id: session_id
```

---

## 📋 Commandes

### Créer commande
```http
POST /api/orders
Authorization: Bearer <token>
```

**Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "prix_unitaire": 1000
    }
  ],
  "adresse_livraison": "Adresse complète",
  "telephone_livraison": "+22990123456",
  "mode_paiement": "cash|mobile_money|card",
  "notes": "Instructions spéciales"
}
```

### Liste commandes utilisateur
```http
GET /api/orders/my-orders
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - `pending|confirmed|delivered|cancelled`
- `page` - Pagination
- `limit` - Items par page

### Détail commande
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

### Annuler commande
```http
PUT /api/orders/:id/cancel
Authorization: Bearer <token>
```

### Commandes vendeur
```http
GET /api/orders/vendor
Authorization: Bearer <token>
```

### Mettre à jour statut (Vendeur)
```http
PUT /api/orders/:id/status
Authorization: Bearer <token>
```

**Body:**
```json
{
  "status": "confirmed|delivered"
}
```

---

## 🏪 Boutiques

### Liste des boutiques
```http
GET /api/shops
```

**Query Parameters:**
- `status` - `active|pending|blocked`
- `category` - Filtre par catégorie produits
- `search` - Recherche par nom
- `lat` & `lng` - Géolocalisation
- `radius` - Rayon en km (défaut: 10)

### Détail boutique
```http
GET /api/shops/:id
```

### Créer boutique (Vendeur)
```http
POST /api/shops
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (FormData):**
- `nom` - Nom de la boutique
- `description` - Description
- `telephone` - Téléphone
- `adresse` - Adresse physique
- `logo` - Fichier logo
- `latitude` - Coordonnée GPS
- `longitude` - Coordonnée GPS

### Mettre à jour boutique
```http
PUT /api/shops/:id
Authorization: Bearer <token>
```

### Produits d'une boutique
```http
GET /api/shops/:id/products
```

---

## 🔍 Recherche & Filtres

### Recherche produits
```http
GET /api/search/products
```

**Query Parameters:**
- `q` - Terme de recherche
- `category` - ID catégorie
- `minPrice` - Prix min
- `maxPrice` - Prix max
- `brand` - Marque
- `tags` - Tags (séparés par virgule)
- `inStock` - En stock uniquement
- `shop` - ID boutique
- `lat` & `lng` - Géolocalisation
- `radius` - Rayon en km
- `sort` - `relevance|price_asc|price_desc|newest|popular|distance`
- `page` - Pagination
- `limit` - Items par page

**Response (200):**
```json
{
  "products": [...],
  "facets": {
    "categories": [
      {
        "id": "uuid",
        "name": "Catégorie",
        "count": 25
      }
    ],
    "priceRanges": [
      {
        "min": 0,
        "max": 1000,
        "count": 15
      }
    ],
    "brands": [...],
    "shops": [...]
  },
  "pagination": {...},
  "totalResults": 150
}
```

### Autocomplétion
```http
GET /api/search/autocomplete
```

**Query Parameters:**
- `q` - Terme (min 2 caractères)
- `limit` - Nombre de suggestions (défaut: 5)

**Response (200):**
```json
{
  "suggestions": [
    "terme suggéré 1",
    "terme suggéré 2"
  ]
}
```

### Suggestions de recherche
```http
GET /api/search/suggestions
```

### Recherches populaires
```http
GET /api/search/popular
```

### Historique de recherche
```http
GET /api/search/history
Authorization: Bearer <token>
```
```http
DELETE /api/search/history
Authorization: Bearer <token>
```

### Recherche avancée
```http
POST /api/search/advanced
```

**Body:**
```json
{
  "query": "terme",
  "filters": {
    "categories": ["uuid1", "uuid2"],
    "priceRange": {
      "min": 1000,
      "max": 10000
    },
    "attributes": {
      "color": ["rouge", "bleu"],
      "size": ["M", "L"]
    },
    "location": {
      "lat": 6.3654,
      "lng": 2.4183,
      "radius": 5
    }
  },
  "sort": "relevance",
  "page": 1,
  "limit": 20
}
```

---

## ⭐ Évaluations

### Noter un produit
```http
POST /api/ratings/product/:productId
Authorization: Bearer <token>
```

**Body:**
```json
{
  "rating": 4,
  "comment": "Très bon produit!"
}
```

### Noter une boutique
```http
POST /api/ratings/shop/:shopId
Authorization: Bearer <token>
```

### Obtenir note utilisateur
```http
GET /api/ratings/product/:productId/user
Authorization: Bearer <token>
```

### Distribution des notes
```http
GET /api/ratings/product/:productId/distribution
```

**Response (200):**
```json
{
  "distribution": {
    "1": 2,
    "2": 3,
    "3": 10,
    "4": 25,
    "5": 40
  },
  "percentages": {
    "1": 2.5,
    "2": 3.75,
    "3": 12.5,
    "4": 31.25,
    "5": 50
  },
  "total": 80,
  "average": 4.3
}
```

### Top produits notés
```http
GET /api/ratings/top/products
```

**Query Parameters:**
- `limit` - Nombre de produits (défaut: 10)
- `minRatings` - Nombre minimum d'évaluations (défaut: 5)

---

## 🖼️ Médias

### Upload avatar utilisateur
```http
POST /api/media/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (FormData):**
- `avatar` - Fichier image (max 1MB)

### Upload images produit
```http
POST /api/media/product/:productId
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (FormData):**
- `images[]` - Fichiers images (max 5, 5MB chacun)

### Supprimer image produit
```http
DELETE /api/media/product/:productId/:publicId
Authorization: Bearer <token>
```

### Réorganiser images produit
```http
PUT /api/media/product/:productId/reorder
Authorization: Bearer <token>
```

**Body:**
```json
{
  "imageOrder": ["publicId1", "publicId2", "publicId3"]
}
```

### Mes médias
```http
GET /api/media/my-media
Authorization: Bearer <token>
```

---

## 📊 Dashboard

### Dashboard Vendeur
```http
GET /api/dashboard/vendor
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "shop": {
    "id": "uuid",
    "name": "Ma Boutique",
    "status": "active",
    "totalProducts": 45
  },
  "today": {
    "orders": 5,
    "revenue": 25000,
    "productsSold": 12
  },
  "month": {
    "orders": 150,
    "revenue": 750000,
    "productsSold": 320
  },
  "total": {
    "orders": 1500,
    "revenue": 7500000,
    "productsSold": 3200
  },
  "performance": {
    "averageOrderValue": 5000,
    "conversionRate": 3.5,
    "customerSatisfaction": 4.5,
    "totalReviews": 234
  },
  "comparison": {
    "revenueGrowth": "+15.5",
    "ordersGrowth": "+12.3"
  },
  "recentOrders": [...],
  "topProducts": [...],
  "lowStockProducts": [...],
  "revenueChart": {
    "labels": ["01/01", "02/01", ...],
    "datasets": [...]
  }
}
```

### Dashboard Admin
```http
GET /api/dashboard/admin
Authorization: Bearer <token>
```

### Export données vendeur
```http
GET /api/dashboard/vendor/export
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` - `orders|products|customers`
- `startDate` - Date début (YYYY-MM-DD)
- `endDate` - Date fin
- `format` - `csv|excel`

---

## 🌍 Internationalisation

### Langues disponibles
```http
GET /api/i18n/languages
```

**Response (200):**
```json
{
  "languages": [
    {
      "code": "fr",
      "name": "Français",
      "native_name": "Français",
      "flag_emoji": "🇫🇷",
      "is_default": true
    },
    {
      "code": "en",
      "name": "English",
      "native_name": "English",
      "flag_emoji": "🇬🇧"
    },
    {
      "code": "yo",
      "name": "Yoruba",
      "native_name": "Èdè Yorùbá",
      "flag_emoji": "🇳🇬"
    }
  ]
}
```

### Devises disponibles
```http
GET /api/i18n/currencies
```

### Traductions interface
```http
GET /api/i18n/translations
```

**Query Parameters:**
- `language` - Code langue (défaut: fr)
- `context` - `frontend|email|admin`

### Convertir prix
```http
GET /api/i18n/convert
```

**Query Parameters:**
- `amount` - Montant
- `from` - Devise source (défaut: XOF)
- `to` - Devise cible

**Response (200):**
```json
{
  "original": 1000,
  "converted": 1.52,
  "formatted": "1,52 €",
  "from_currency": "XOF",
  "to_currency": "EUR"
}
```

### Détecter locale
```http
GET /api/i18n/detect-locale
```

### Produits localisés
```http
GET /api/i18n/products
```

**Query Parameters:**
- `language` - Code langue
- `currency` - Code devise
- `category` - ID catégorie

### Traduire produit (Vendeur)
```http
POST /api/i18n/product/:productId/translate
Authorization: Bearer <token>
```

**Body:**
```json
{
  "language": "en",
  "titre": "Product Title",
  "description": "Product Description",
  "tags": ["tag1", "tag2"],
  "auto": false
}
```

---

## 💼 Gestion Vendeurs

### Plans disponibles
```http
GET /api/vendor/plans
```

### Souscrire à un plan
```http
POST /api/vendor/subscribe
Authorization: Bearer <token>
```

**Body:**
```json
{
  "planId": "uuid",
  "paymentMethod": "mobile_money"
}
```

### Mon abonnement
```http
GET /api/vendor/subscription
Authorization: Bearer <token>
```

### Mon solde
```http
GET /api/vendor/balance
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "available_balance": 150000,
  "pending_balance": 25000,
  "total_earned": 500000,
  "total_withdrawn": 325000,
  "last_payout_date": "2024-01-15",
  "recent_payouts": [...]
}
```

### Demander un virement
```http
POST /api/vendor/payout/request
Authorization: Bearer <token>
```

**Body:**
```json
{
  "amount": 100000,
  "bankAccountId": "uuid"
}
```

### Comptes bancaires
```http
GET /api/vendor/bank-accounts
Authorization: Bearer <token>
```
```http
POST /api/vendor/bank-accounts
Authorization: Bearer <token>
```

**Body:**
```json
{
  "bank_name": "Ecobank",
  "account_number": "1234567890",
  "account_name": "John Doe",
  "account_type": "savings"
}
```

### Factures
```http
GET /api/vendor/invoices
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - `paid|unpaid|overdue`
- `type` - `subscription|commission`

### Statistiques financières
```http
GET /api/vendor/stats/financial
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` - Date début
- `endDate` - Date fin

---

## 🔧 Health & Monitoring

### Health Check
```http
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00Z",
  "uptime": 86400,
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    }
  }
}
```

### Readiness
```http
GET /ready
```

### Liveness
```http
GET /live
```

### Metrics (Prometheus)
```http
GET /metrics
```

---

## 🔴 Codes d'erreur

| Code | Description |
|------|------------|
| 400 | Bad Request - Données invalides |
| 401 | Unauthorized - Token manquant ou invalide |
| 403 | Forbidden - Accès interdit |
| 404 | Not Found - Ressource non trouvée |
| 409 | Conflict - Conflit (ex: email déjà utilisé) |
| 422 | Unprocessable Entity - Validation échouée |
| 429 | Too Many Requests - Rate limit atteint |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## 📋 Rate Limiting

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| Auth (login/register) | 5 | 15 min |
| Mot de passe oublié | 3 | 1 heure |
| API générale | 100 | 15 min |
| Upload fichiers | 10 | 1 heure |
| Export données | 5 | 1 heure |

## 🔒 Headers de sécurité

Toutes les réponses incluent :
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

## 📝 Changelog

| Version | Date | Changements |
|---------|------|------------|
| 2.0.0 | 2024-01-20 | Ajout système de notation, panier, i18n |
| 1.5.0 | 2024-01-15 | Google OAuth, 2FA |
| 1.0.0 | 2024-01-01 | Version initiale |