# Chez Baba Backend

Ce projet est l'API Backend pour la plateforme e-commerce "Chez Baba". Il est construit avec **Node.js**, **Express**, et utilise **Supabase** comme base de données.

## 📂 Architecture du Projet

Le code source est organisé dans le dossier `src/` selon le modèle MVC (Modèle-Vue-Contrôleur) adapté aux API REST.

### Structure détaillée

```text
src/
├── config/         # Configuration des services externes
├── controllers/    # Logique métier (Ce que fait l'application)
├── middleware/     # Sécurité et traitements intermédiaires
├── routes/         # Définition des URLs (Points d'entrée)
├── utils/          # Fonctions utilitaires partagées
└── app.js          # Point d'entrée principal du serveur
```

### Rôle de chaque fichier

#### 1. Point d'entrée
- **`src/app.js`** : Fichier principal qui initialise le serveur Express, configure les middlewares globaux (CORS, parsing JSON) et regroupe toutes les routes.

#### 2. Configuration (`src/config/`)
- **`supabase.js`** : Initialise la connexion à la base de données Supabase.

#### 3. Contrôleurs (`src/controllers/`)
C'est le "cerveau" de l'application. Chaque fichier gère la logique pour une entité spécifique.
- **`authController.js`** : Gestion de l'inscription et la connexion (Clients et Vendeurs).
- **`shopController.js`** : Création, gestion et validation des boutiques.
- **`productController.js`** : Ajout, modification, suppression et affichage des produits.
- **`orderController.js`** : Gestion du cycle de vie des commandes (création, confirmation, livraison).
- **`categoryController.js`** : Gestion des catégories de produits.

#### 4. Routes (`src/routes/`)
Définit les URLs et quelle fonction du contrôleur appeler.
- **`authRoutes.js`** : `/api/auth/...`
- **`shopRoutes.js`** : `/api/shops/...`
- **`productRoutes.js`** : `/api/products/...`
- **`orderRoutes.js`** : `/api/orders/...`
- **`categoryRoutes.js`** : `/api/categories/...`

#### 5. Middleware (`src/middleware/`)
- **`auth.js`** : Vérifie la présence et la validité du Token JWT. Utilisé pour protéger les routes (ex: seul un vendeur connecté peut créer un produit).

#### 6. Utilitaires (`src/utils/`)
- **`jwt.js`** : Fonctions d'aide pour générer les tokens d'authentification.

---

## 🚀 Installation et Démarrage

### Pré-requis
- Node.js installé
- Compte Supabase (URL et Clé API)

### Configuration
Créez un fichier `.env` à la racine :
```env
PORT=5000
SUPABASE_URL=votre_url_supabase
SUPABASE_KEY=votre_cle_anon_public
JWT_SECRET=votre_secret_jwt
```

### Commandes
```bash
# Installer les dépendances
npm install

# Lancer en mode développement (avec redémarrage automatique - nodemon)
npm run dev

# Lancer en mode production
npm start
```

---

## 📚 Documentation API
Pour les détails techniques des requêtes (URLs, JSON body, Réponses), consultez le fichier **[API_DOCS.md](./API_DOCS.md)**.
