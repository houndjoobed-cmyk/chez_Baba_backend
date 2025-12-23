# Guide Frontend - Inscription des vendeurs

## 🎯 Objectif
Ce guide explique comment intégrer le formulaire d'inscription des vendeurs avec les nouveaux champs requis.

---

## 📋 Champs du formulaire

### Pour un **Client** (role: "client")
```javascript
{
  nom: string,        // Requis
  email: string,      // Requis
  motdepasse: string, // Requis
  role: "client"      // Optionnel (par défaut: "client")
}
```

### Pour un **Vendeur** (role: "vendor")
```javascript
{
  nom: string,        // Requis
  email: string,      // Requis
  motdepasse: string, // Requis
  role: "vendor",     // Requis
  adresse: string,    // Requis pour les vendeurs
  telephone: string,  // Requis pour les vendeurs (format: +229 XX XX XX XX)
  ville: string       // Requis pour les vendeurs
}
```

---

## 💻 Exemple de code React

### Composant d'inscription vendeur

```jsx
import { useState } from 'react';

const VendorRegistrationForm = () => {
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    motdepasse: '',
    role: 'vendor',
    adresse: '',
    telephone: '',
    ville: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Succès - Stocker le token et les infos utilisateur
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Rediriger vers le dashboard vendeur
      window.location.href = '/vendor/dashboard';

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="vendor-registration-form">
      <h2>Inscription Vendeur</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="nom">Nom complet *</label>
        <input
          type="text"
          id="nom"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          required
          placeholder="Ex: Jean Dupont"
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Ex: jean@example.com"
        />
      </div>

      <div className="form-group">
        <label htmlFor="motdepasse">Mot de passe *</label>
        <input
          type="password"
          id="motdepasse"
          name="motdepasse"
          value={formData.motdepasse}
          onChange={handleChange}
          required
          minLength={6}
          placeholder="Minimum 6 caractères"
        />
      </div>

      <div className="form-group">
        <label htmlFor="telephone">Téléphone *</label>
        <input
          type="tel"
          id="telephone"
          name="telephone"
          value={formData.telephone}
          onChange={handleChange}
          required
          placeholder="Ex: +229 97 12 34 56"
        />
      </div>

      <div className="form-group">
        <label htmlFor="ville">Ville *</label>
        <input
          type="text"
          id="ville"
          name="ville"
          value={formData.ville}
          onChange={handleChange}
          required
          placeholder="Ex: Cotonou"
        />
      </div>

      <div className="form-group">
        <label htmlFor="adresse">Adresse complète *</label>
        <textarea
          id="adresse"
          name="adresse"
          value={formData.adresse}
          onChange={handleChange}
          required
          rows={3}
          placeholder="Ex: Rue de la Paix, Quartier Akpakpa, Maison 45"
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Inscription en cours...' : 'S\'inscrire comme vendeur'}
      </button>

      <p className="info-text">
        * Tous les champs sont obligatoires pour les vendeurs
      </p>
    </form>
  );
};

export default VendorRegistrationForm;
```

---

## 🎨 Exemple de validation côté frontend

```javascript
const validateVendorForm = (formData) => {
  const errors = {};

  // Validation nom
  if (!formData.nom || formData.nom.trim().length < 2) {
    errors.nom = 'Le nom doit contenir au moins 2 caractères';
  }

  // Validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email || !emailRegex.test(formData.email)) {
    errors.email = 'Email invalide';
  }

  // Validation mot de passe
  if (!formData.motdepasse || formData.motdepasse.length < 6) {
    errors.motdepasse = 'Le mot de passe doit contenir au moins 6 caractères';
  }

  // Validation téléphone
  const phoneRegex = /^\+229\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/;
  if (!formData.telephone || !phoneRegex.test(formData.telephone)) {
    errors.telephone = 'Format de téléphone invalide (Ex: +229 97 12 34 56)';
  }

  // Validation ville
  if (!formData.ville || formData.ville.trim().length < 2) {
    errors.ville = 'La ville est requise';
  }

  // Validation adresse
  if (!formData.adresse || formData.adresse.trim().length < 10) {
    errors.adresse = 'L\'adresse doit être complète (minimum 10 caractères)';
  }

  return errors;
};
```

---

## 📱 Exemple avec React Hook Form

```jsx
import { useForm } from 'react-hook-form';

const VendorRegistrationForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, role: 'vendor' })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      // Succès
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      window.location.href = '/vendor/dashboard';

    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('nom', { required: 'Le nom est requis', minLength: 2 })}
        placeholder="Nom complet"
      />
      {errors.nom && <span>{errors.nom.message}</span>}

      <input
        {...register('email', { 
          required: 'L\'email est requis',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Email invalide'
          }
        })}
        type="email"
        placeholder="Email"
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        {...register('motdepasse', { 
          required: 'Le mot de passe est requis',
          minLength: {
            value: 6,
            message: 'Minimum 6 caractères'
          }
        })}
        type="password"
        placeholder="Mot de passe"
      />
      {errors.motdepasse && <span>{errors.motdepasse.message}</span>}

      <input
        {...register('telephone', { 
          required: 'Le téléphone est requis',
          pattern: {
            value: /^\+229\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/,
            message: 'Format: +229 XX XX XX XX'
          }
        })}
        placeholder="+229 97 12 34 56"
      />
      {errors.telephone && <span>{errors.telephone.message}</span>}

      <input
        {...register('ville', { 
          required: 'La ville est requise',
          minLength: 2
        })}
        placeholder="Ville"
      />
      {errors.ville && <span>{errors.ville.message}</span>}

      <textarea
        {...register('adresse', { 
          required: 'L\'adresse est requise',
          minLength: {
            value: 10,
            message: 'L\'adresse doit être complète'
          }
        })}
        placeholder="Adresse complète"
        rows={3}
      />
      {errors.adresse && <span>{errors.adresse.message}</span>}

      <button type="submit">S'inscrire</button>
    </form>
  );
};
```

---

## 🔄 Réponses de l'API

### ✅ Succès (201 Created)
```json
{
  "message": "Inscription réussie",
  "user": {
    "id": "uuid",
    "nom": "Jean Dupont",
    "email": "jean@example.com",
    "role": "vendor",
    "adresse": "Rue de la Paix, Maison 45",
    "telephone": "+229 97 12 34 56",
    "ville": "Cotonou"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### ❌ Erreur - Champs manquants (400 Bad Request)
```json
{
  "error": "Pour les vendeurs, l'adresse, le téléphone et la ville sont requis"
}
```

### ❌ Erreur - Email déjà utilisé (400 Bad Request)
```json
{
  "error": "Cet email est déjà utilisé"
}
```

---

## 🎯 Checklist d'intégration

- [ ] Créer le formulaire d'inscription vendeur avec tous les champs
- [ ] Ajouter la validation côté frontend
- [ ] Gérer les messages d'erreur de l'API
- [ ] Stocker le token et les infos utilisateur après inscription
- [ ] Rediriger vers le dashboard vendeur après inscription réussie
- [ ] Ajouter un lien vers les conditions générales de vente
- [ ] Tester avec des données valides
- [ ] Tester avec des données invalides (champs manquants)
- [ ] Tester avec un email déjà existant

---

## 📞 Endpoint

**URL:** `POST /api/auth/register`  
**Content-Type:** `application/json`

---

## 💡 Conseils

1. **Format du téléphone:** Utilisez un masque de saisie pour faciliter l'entrée (ex: `+229 XX XX XX XX`)
2. **Ville:** Proposez une liste déroulante avec les villes principales du Bénin
3. **Adresse:** Utilisez un textarea pour permettre une adresse complète
4. **Validation:** Validez côté frontend ET backend pour une meilleure UX
5. **Messages d'erreur:** Affichez des messages clairs et en français

---

## 🌍 Villes principales du Bénin (pour liste déroulante)

```javascript
const villesBenin = [
  'Cotonou',
  'Porto-Novo',
  'Parakou',
  'Abomey-Calavi',
  'Djougou',
  'Bohicon',
  'Kandi',
  'Lokossa',
  'Ouidah',
  'Abomey',
  'Natitingou',
  'Malanville',
  'Savalou',
  'Pobé',
  'Allada'
];
```

---

Bonne intégration ! 🚀

Seconde Partie

# 🎨 Guide d'intégration Frontend - Chez Baba

## 🚀 Configuration initiale

### Installation des dépendances
```bash
npm install axios react-query @tanstack/react-query js-cookie
npm install react-hook-form yup @hookform/resolvers
npm install react-hot-toast react-spinners
npm install @react-oauth/google
npm install i18next react-i18next
```

### Configuration de base

**📄 `src/config/api.js`**
```javascript
import axios from 'axios';
import Cookies from 'js-cookie';

// Créer une instance axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Ajouter la langue et devise
  const language = localStorage.getItem('language') || 'fr';
  const currency = localStorage.getItem('currency') || 'XOF';
  
  config.headers['Accept-Language'] = language;
  config.params = {
    ...config.params,
    lang: language,
    currency: currency
  };
  
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      Cookies.remove('auth_token');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 429) {
      // Rate limiting
      toast.error('Trop de requêtes. Veuillez patienter.');
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## 🔐 Module d'authentification

**📄 `src/hooks/useAuth.js`**
```javascript
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import Cookies from 'js-cookie';
import api from '../config/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('auth_token');
      if (token) {
        const { data } = await api.get('/auth/profile');
        setUser(data);
      }
    } catch (error) {
      Cookies.remove('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      
      // Sauvegarder le token
      Cookies.set('auth_token', data.token, { expires: 7 });
      setUser(data.user);
      
      // Vérifier si email vérifié
      if (!data.user.email_verified) {
        toast.warning('Veuillez vérifier votre email');
        router.push('/verify-email');
      } else {
        // Fusionner le panier invité si existe
        const sessionId = localStorage.getItem('session_id');
        if (sessionId) {
          await api.post('/cart/merge', {}, {
            headers: { 'X-Session-Id': sessionId }
          });
          localStorage.removeItem('session_id');
        }
        
        router.push('/dashboard');
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Erreur de connexion';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const { data } = await api.post('/auth/google', {
          idToken: response.credential
        });
        
        Cookies.set('auth_token', data.token, { expires: 7 });
        setUser(data.user);
        
        if (data.isNewUser) {
          toast.success('Bienvenue sur Chez Baba !');
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
        
      } catch (error) {
        toast.error('Erreur connexion Google');
      }
    }
  });

  const register = async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      
      toast.success('Compte créé ! Vérifiez votre email.');
      router.push('/verify-email');
      
      return { success: true, email: userData.email };
    } catch (error) {
      const message = error.response?.data?.error || 'Erreur inscription';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      const { data } = await api.post('/auth/verify-email', { email, otp });
      
      toast.success('Email vérifié avec succès !');
      router.push('/login');
      
      return { success: true };
    } catch (error) {
      toast.error('Code invalide ou expiré');
      return { success: false };
    }
  };

  const logout = () => {
    Cookies.remove('auth_token');
    setUser(null);
    router.push('/');
    toast.success('Déconnexion réussie');
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.put('/users/profile', data);
      setUser(response.data);
      toast.success('Profil mis à jour');
      return { success: true };
    } catch (error) {
      toast.error('Erreur mise à jour');
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      logout,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**📄 `src/components/LoginForm.jsx`**
```jsx
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../hooks/useAuth';

const schema = yup.object({
  email: yup.string().email('Email invalide').required('Email requis'),
  password: yup.string().min(8, 'Minimum 8 caractères').required('Mot de passe requis')
});

export default function LoginForm() {
  const { login, loginWithGoogle } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    await login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          type="email"
          placeholder="Email"
          {...register('email')}
          className={errors.email ? 'error' : ''}
        />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <input
          type="password"
          placeholder="Mot de passe"
          {...register('password')}
        />
        {errors.password && <span>{errors.password.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Connexion...' : 'Se connecter'}
      </button>

      <button type="button" onClick={loginWithGoogle}>
        <img src="/google-icon.svg" alt="Google" />
        Continuer avec Google
      </button>
    </form>
  );
}
```

---

## 🛒 Module Panier

**📄 `src/hooks/useCart.js`**
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../config/api';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Récupérer le panier
  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      if (user) {
        const { data } = await api.get('/cart');
        return data;
      } else {
        // Panier local pour invité
        const sessionId = localStorage.getItem('session_id') || '';
        const { data } = await api.get('/cart/guest', {
          headers: { 'X-Session-Id': sessionId }
        });
        return data;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Ajouter au panier
  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity = 1 }) => {
      if (user) {
        return await api.post('/cart/add', { productId, quantity });
      } else {
        // Gérer panier invité
        let sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem('session_id', sessionId);
        }
        
        const currentCart = cart?.items || [];
        const newItems = [...currentCart];
        const existingIndex = newItems.findIndex(i => i.productId === productId);
        
        if (existingIndex >= 0) {
          newItems[existingIndex].quantity += quantity;
        } else {
          newItems.push({ productId, quantity });
        }
        
        return await api.post('/cart/guest/save', { items: newItems }, {
          headers: { 'X-Session-Id': sessionId }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Produit ajouté au panier');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Erreur ajout panier');
    }
  });

  // Mettre à jour quantité
  const updateQuantity = useMutation({
    mutationFn: async ({ productId, quantity }) => {
      return await api.put(`/cart/update/${productId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
    }
  });

  // Retirer du panier
  const removeFromCart = useMutation({
    mutationFn: async (productId) => {
      return await api.delete(`/cart/remove/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Produit retiré');
    }
  });

  // Vider le panier
  const clearCart = useMutation({
    mutationFn: async () => {
      return await api.delete('/cart/clear');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Panier vidé');
    }
  });

  // Valider le panier
  const validateCart = async () => {
    try {
      const { data } = await api.get('/cart/validate');
      if (!data.isValid) {
        data.issues.forEach(issue => {
          toast.warning(`${issue.productName}: ${issue.issue}`);
        });
      }
      return data;
    } catch (error) {
      toast.error('Erreur validation panier');
      return null;
    }
  };

  return {
    cart,
    isLoading,
    addToCart: addToCart.mutate,
    updateQuantity: updateQuantity.mutate,
    removeFromCart: removeFromCart.mutate,
    clearCart: clearCart.mutate,
    validateCart
  };
};
```

**📄 `src/components/Cart.jsx`**
```jsx
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/formatters';

export default function Cart() {
  const { cart, isLoading, updateQuantity, removeFromCart } = useCart();

  if (isLoading) return <div>Chargement...</div>;
  if (!cart?.items?.length) return <div>Panier vide</div>;

  return (
    <div className="cart">
      {cart.itemsByShop?.map(shop => (
        <div key={shop.shopId} className="shop-group">
          <h3>{shop.shopName}</h3>
          
          {shop.items.map(item => (
            <div key={item.id} className="cart-item">
              <img src={item.image} alt={item.product_name} />
              
              <div className="item-details">
                <h4>{item.product_name}</h4>
                <p>{formatPrice(item.unit_price)}</p>
              </div>
              
              <div className="quantity-controls">
                <button onClick={() => updateQuantity({
                  productId: item.product_id,
                  quantity: item.quantity - 1
                })}>-</button>
                
                <span>{item.quantity}</span>
                
                <button onClick={() => updateQuantity({
                  productId: item.product_id,
                  quantity: item.quantity + 1
                })}>+</button>
              </div>
              
              <div className="subtotal">
                {formatPrice(item.subtotal)}
              </div>
              
              <button onClick={() => removeFromCart(item.product_id)}>
                Supprimer
              </button>
            </div>
          ))}
          
          <div className="shop-total">
            Sous-total: {formatPrice(shop.subtotal)}
          </div>
        </div>
      ))}
      
      <div className="cart-summary">
        <p>Articles: {cart.summary.totalItems}</p>
        <p>Boutiques: {cart.summary.shopsCount}</p>
        <h3>Total: {formatPrice(cart.summary.totalAmount)}</h3>
        
        <button className="checkout-btn">
          Passer la commande
        </button>
      </div>
    </div>
  );
}
```

---

## 🔍 Module de recherche

**📄 `src/hooks/useSearch.js`**
```javascript
import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import api from '../config/api';

export const useSearch = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: null,
    minPrice: null,
    maxPrice: null,
    inStock: true,
    sort: 'relevance'
  });

  // Recherche principale
  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['search', searchTerm, filters],
    queryFn: async () => {
      const params = {
        q: searchTerm,
        ...filters,
        page: router.query.page || 1,
        limit: 20
      };
      
      const { data } = await api.get('/search/products', { params });
      return data;
    },
    enabled: searchTerm.length > 0,
    keepPreviousData: true
  });

  // Autocomplétion
  const [suggestions, setSuggestions] = useState([]);
  
  const fetchSuggestions = useCallback(
    debounce(async (term) => {
      if (term.length < 2) {
        setSuggestions([]);
        return;
      }
      
      try {
        const { data } = await api.get('/search/autocomplete', {
          params: { q: term, limit: 5 }
        });
        setSuggestions(data.suggestions);
      } catch (error) {
        console.error('Erreur suggestions:', error);
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchSuggestions(searchTerm);
  }, [searchTerm, fetchSuggestions]);

  // Recherches populaires
  const { data: popularSearches } = useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      const { data } = await api.get('/search/popular');
      return data;
    },
    staleTime: 1000 * 60 * 60 // 1 heure
  });

  // Sauvegarder recherche
  const saveSearch = useCallback(async (term) => {
    try {
      await api.post('/search/track-click', { query: term });
    } catch (error) {
      // Silencieux si erreur
    }
  }, []);

  const search = (term) => {
    setSearchTerm(term);
    saveSearch(term);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: null,
      minPrice: null,
      maxPrice: null,
      inStock: true,
      sort: 'relevance'
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    search,
    results,
    isLoading,
    suggestions,
    popularSearches,
    filters,
    updateFilter,
    clearFilters
  };
};
```

**📄 `src/components/SearchBar.jsx`**
```jsx
import { useState, useRef, useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';
import { useRouter } from 'next/router';

export default function SearchBar() {
  const router = useRouter();
  const { searchTerm, setSearchTerm, suggestions, search } = useSearch();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef();
  const dropdownRef = useRef();

  // Fermer les suggestions en cliquant dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      search(searchTerm);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setSearchTerm(suggestion);
    search(suggestion);
    setShowSuggestions(false);
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Rechercher des produits..."
        />
        
        <button type="submit">
          <SearchIcon />
        </button>
        
        {showSuggestions && suggestions.length > 0 && (
          <div ref={dropdownRef} className="suggestions-dropdown">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => selectSuggestion(suggestion)}
              >
                <SearchIcon size={14} />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
```

---

## ⭐ Module d'évaluation

**📄 `src/hooks/useRatings.js`**
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../config/api';
import toast from 'react-hot-toast';

export const useRatings = (type, id) => {
  const queryClient = useQueryClient();
  
  // Obtenir la distribution des notes
  const { data: distribution } = useQuery({
    queryKey: ['rating-distribution', type, id],
    queryFn: async () => {
      const { data } = await api.get(`/ratings/${type}/${id}/distribution`);
      return data;
    },
    enabled: !!id
  });

  // Obtenir la note de l'utilisateur
  const { data: userRating } = useQuery({
    queryKey: ['user-rating', type, id],
    queryFn: async () => {
      const { data } = await api.get(`/ratings/${type}/${id}/user`);
      return data;
    },
    enabled: !!id
  });

  // Soumettre une note
  const rate = useMutation({
    mutationFn: async ({ rating, comment }) => {
      return await api.post(`/ratings/${type}/${id}`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rating-distribution', type, id]);
      queryClient.invalidateQueries(['user-rating', type, id]);
      toast.success('Merci pour votre évaluation !');
    },
    onError: (error) => {
      if (error.response?.status === 403) {
        toast.error('Vous devez acheter ce produit pour l\'évaluer');
      } else {
        toast.error('Erreur lors de l\'évaluation');
      }
    }
  });

  return {
    distribution,
    userRating,
    rate: rate.mutate,
    isRating: rate.isLoading
  };
};
```

**📄 `src/components/RatingStars.jsx`**
```jsx
import { useState } from 'react';
import { useRatings } from '../hooks/useRatings';

export default function RatingStars({ type, id, readonly = false }) {
  const { distribution, userRating, rate } = useRatings(type, id);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(userRating?.rating || 0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleRate = () => {
    if (selectedRating > 0) {
      rate({ rating: selectedRating, comment });
      setShowForm(false);
    }
  };

  const renderStars = (rating, interactive = false) => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      const filled = starValue <= (hoveredStar || rating);
      
      return (
        <span
          key={index}
          className={`star ${filled ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onMouseEnter={() => interactive && setHoveredStar(starValue)}
          onMouseLeave={() => interactive && setHoveredStar(0)}
          onClick={() => interactive && setSelectedRating(starValue)}
        >
          ★
        </span>
      );
    });
  };

  if (readonly) {
    return (
      <div className="rating-display">
        <div className="stars">
          {renderStars(distribution?.average || 0)}
        </div>
        <span className="rating-text">
          {distribution?.average?.toFixed(1)} ({distribution?.total || 0} avis)
        </span>
      </div>
    );
  }

  return (
    <div className="rating-widget">
      {!showForm ? (
        <button onClick={() => setShowForm(true)}>
          Évaluer ce {type === 'product' ? 'produit' : 'vendeur'}
        </button>
      ) : (
        <div className="rating-form">
          <div className="stars-input">
            {renderStars(selectedRating, true)}
          </div>
          
          <textarea
            placeholder="Votre avis (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          
          <div className="form-actions">
            <button onClick={handleRate}>Soumettre</button>
            <button onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}
      
      {distribution && (
        <div className="rating-distribution">
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="distribution-row">
              <span>{star}★</span>
              <div className="bar">
                <div 
                  className="fill" 
                  style={{ width: `${distribution.percentages?.[star] || 0}%` }}
                />
              </div>
              <span>{distribution.distribution?.[star] || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🌍 Module d'internationalisation

**📄 `src/i18n/config.js`**
```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import api from '../config/api';

// Charger les traductions depuis l'API
const loadTranslations = async (language) => {
  try {
    const { data } = await api.get('/i18n/translations', {
      params: { language, context: 'frontend' }
    });
    return data.translations;
  } catch (error) {
    console.error('Erreur chargement traductions:', error);
    return {};
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Charger les langues disponibles
export const loadLanguages = async () => {
  const { data } = await api.get('/i18n/languages');
  return data.languages;
};

// Charger les devises disponibles
export const loadCurrencies = async () => {
  const { data } = await api.get('/i18n/currencies');
  return data.currencies;
};

export default i18n;
```

**📄 `src/hooks/useI18n.js`**
```javascript
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../config/api';

export const useI18n = () => {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState('XOF');
  const [languages, setLanguages] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Charger langues et devises
      const [langRes, currRes] = await Promise.all([
        api.get('/i18n/languages'),
        api.get('/i18n/currencies')
      ]);
      
      setLanguages(langRes.data.languages);
      setCurrencies(currRes.data.currencies);
      
      // Récupérer préférences utilisateur
      const savedCurrency = localStorage.getItem('currency') || 'XOF';
      setCurrency(savedCurrency);
    } catch (error) {
      console.error('Erreur chargement i18n:', error);
    }
  };

  const changeLanguage = async (lang) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    
    // Recharger les traductions
    const { data } = await api.get('/i18n/translations', {
      params: { language: lang }
    });
    i18n.addResourceBundle(lang, 'translation', data.translations);
  };

  const changeCurrency = (curr) => {
    setCurrency(curr);
    localStorage.setItem('currency', curr);
    window.location.reload(); // Recharger pour mettre à jour les prix
  };

  const formatPrice = async (amount, fromCurrency = 'XOF') => {
    if (fromCurrency === currency) {
      return formatCurrency(amount, currency);
    }
    
    try {
      const { data } = await api.get('/i18n/convert', {
        params: { amount, from: fromCurrency, to: currency }
      });
      return data.formatted;
    } catch (error) {
      return formatCurrency(amount, fromCurrency);
    }
  };

  const formatCurrency = (amount, curr) => {
    const formats = {
      XOF: { locale: 'fr-BJ', currency: 'XOF', decimals: 0 },
      EUR: { locale: 'fr-FR', currency: 'EUR', decimals: 2 },
      USD: { locale: 'en-US', currency: 'USD', decimals: 2 },
      NGN: { locale: 'en-NG', currency: 'NGN', decimals: 2 }
    };
    
    const format = formats[curr] || formats.XOF;
    
    return new Intl.NumberFormat(format.locale, {
      style: 'currency',
      currency: format.currency,
      minimumFractionDigits: format.decimals,
      maximumFractionDigits: format.decimals
    }).format(amount);
  };

  return {
    t,
    language: i18n.language,
    changeLanguage,
    languages,
    currency,
    changeCurrency,
    currencies,
    formatPrice,
    formatCurrency
  };
};
```

---

## 💼 Module Dashboard Vendeur

**📄 `src/pages/vendor/dashboard.jsx`**
```jsx
import { useQuery } from '@tanstack/react-query';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../../config/api';
import { formatPrice, formatDate } from '../../utils/formatters';

export default function VendorDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['vendor-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/vendor');
      return data;
    },
    refetchInterval: 5 * 60 * 1000 // Rafraîchir toutes les 5 minutes
  });

  if (isLoading) return <div>Chargement dashboard...</div>;

  return (
    <div className="vendor-dashboard">
      {/* Stats du jour */}
      <div className="stats-grid">
        <StatCard
          title="Commandes aujourd'hui"
          value={dashboard.today.orders}
          icon="📦"
          change={`+${dashboard.comparison.ordersGrowth}%`}
        />
        <StatCard
          title="Revenus aujourd'hui"
          value={formatPrice(dashboard.today.revenue)}
          icon="💰"
          change={`+${dashboard.comparison.revenueGrowth}%`}
        />
        <StatCard
          title="Produits vendus"
          value={dashboard.today.productsSold}
          icon="🛍️"
        />
        <StatCard
          title="Note moyenne"
          value={`${dashboard.performance.customerSatisfaction}/5`}
          icon="⭐"
          subtitle={`${dashboard.performance.totalReviews} avis`}
        />
      </div>

      {/* Graphique des revenus */}
      <div className="chart-container">
        <h3>Évolution des revenus (30 jours)</h3>
        <Line
          data={dashboard.revenueChart}
          options={{
            responsive: true,
            plugins: {
              legend: { position: 'top' }
            }
          }}
        />
      </div>

      {/* Répartition des commandes */}
      <div className="chart-container">
        <h3>Statut des commandes</h3>
        <Doughnut
          data={{
            labels: dashboard.orderStatusDistribution.labels,
            datasets: [{
              data: dashboard.orderStatusDistribution.data,
              backgroundColor: dashboard.orderStatusDistribution.colors
            }]
          }}
        />
      </div>

      {/* Commandes récentes */}
      <div className="recent-orders">
        <h3>Commandes récentes</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Date</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.recentOrders.map(order => (
              <tr key={order.id}>
                <td>{order.id.substring(0, 8)}</td>
                <td>{order.client}</td>
                <td>{formatDate(order.date)}</td>
                <td>{formatPrice(order.total)}</td>
                <td>
                  <span className={`status ${order.status}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <button>Voir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Produits en stock faible */}
      <div className="low-stock-alert">
        <h3>⚠️ Stock faible</h3>
        <div className="products-grid">
          {dashboard.lowStockProducts.map(product => (
            <div key={product.id} className="product-card">
              <img src={product.image} alt={product.titre} />
              <h4>{product.titre}</h4>
              <p className="stock-warning">Stock: {product.stock}</p>
              <button>Réapprovisionner</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, change, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
        {change && (
          <span className={`stat-change ${change.startsWith('+') ? 'positive' : 'negative'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## 🔄 Gestion d'état global avec Zustand

**📄 `src/store/useStore.js`**
```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../config/api';

const useStore = create(
  persist(
    (set, get) => ({
      // État utilisateur
      user: null,
      setUser: (user) => set({ user }),
      
      // État panier
      cart: { items: [], summary: {} },
      updateCart: (cart) => set({ cart }),
      
      // État favoris
      wishlist: [],
      updateWishlist: (wishlist) => set({ wishlist }),
      
      // Préférences
      preferences: {
        language: 'fr',
        currency: 'XOF',
        theme: 'light'
      },
      updatePreferences: (prefs) => set(state => ({
        preferences: { ...state.preferences, ...prefs }
      })),
      
      // Notifications
      notifications: [],
      addNotification: (notification) => set(state => ({
        notifications: [...state.notifications, {
          id: Date.now(),
          ...notification
        }]
      })),
      removeNotification: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      // Actions asynchrones
      fetchUserData: async () => {
        try {
          const [profileRes, cartRes, wishlistRes] = await Promise.all([
            api.get('/users/profile'),
            api.get('/cart'),
            api.get('/cart/wishlist')
          ]);
          
          set({
            user: profileRes.data,
            cart: cartRes.data,
            wishlist: wishlistRes.data.items
          });
        } catch (error) {
          console.error('Erreur chargement données:', error);
        }
      }
    }),
    {
      name: 'chez-baba-storage',
      partialize: (state) => ({
        preferences: state.preferences
      })
    }
  )
);

export default useStore;
```

---

## 📝 Exemples d'utilisation avancés

### Gestion des erreurs globale

**📄 `src/components/ErrorBoundary.jsx`**
```jsx
import { Component } from 'react';
import * as Sentry from '@sentry/nextjs';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Oops! Une erreur est survenue</h1>
          <p>Nous avons été notifiés et travaillons sur le problème.</p>
          <button onClick={() => window.location.reload()}>
            Rafraîchir la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Hook personnalisé pour les uploads

**📄 `src/hooks/useUpload.js`**
```javascript
import { useState } from 'react';
import api from '../config/api';
import toast from 'react-hot-toast';

export const useUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file, type = 'avatar', productId = null) => {
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    
    if (type === 'avatar') {
      formData.append('avatar', file);
    } else if (type === 'product') {
      formData.append('images[]', file);
    }

    try {
      const endpoint = type === 'avatar' 
        ? '/media/avatar'
        : `/media/product/${productId}`;

      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / event.total);
          setProgress(percent);
        }
      });

      toast.success('Upload réussi !');
      return data;
    } catch (error) {
      toast.error('Erreur upload: ' + error.response?.data?.error);
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { upload, uploading, progress };
};
```

---

## 🚀 Scripts de déploiement

**📄 `package.json` - Scripts utiles**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "analyze": "ANALYZE=true next build",
    "lighthouse": "lighthouse http://localhost:3001 --output html --view"
  }
}
```

## 📊 Monitoring Frontend

**📄 `src/utils/monitoring.js`**
```javascript
import * as Sentry from '@sentry/nextjs';

// Initialiser Sentry
export const initMonitoring = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      beforeSend(event) {
        // Filtrer les données sensibles
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        return event;
      }
    });
  }
};

// Tracker les événements custom
export const trackEvent = (eventName, properties = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }
  
  // Envoyer aussi à votre backend pour analytics
  api.post('/analytics/event', { event: eventName, properties }).catch(() => {});
};

// Tracker les performances
export const trackPerformance = () => {
  if (typeof window !== 'undefined' && window.performance) {
    const perfData = window.performance.getEntriesByType('navigation')[0];
    
    const metrics = {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      ttfb: perfData.responseStart - perfData.requestStart,
      download: perfData.responseEnd - perfData.responseStart,
      domInteractive: perfData.domInteractive - perfData.fetchStart,
      domComplete: perfData.domComplete - perfData.fetchStart
    };
    
    console.log('Performance metrics:', metrics);
    
    // Envoyer à votre backend
    api.post('/analytics/performance', metrics).catch(() => {});
  }
};
```

## 🎯 Checklist d'intégration

- [ ] Configuration API avec intercepteurs
- [ ] Authentification (JWT, Google OAuth)
- [ ] Gestion du panier (connecté/invité)
- [ ] Système de recherche avec filtres
- [ ] Module d'évaluation (produits/boutiques)
- [ ] Internationalisation (langues/devises)
- [ ] Dashboard vendeur avec graphiques
- [ ] Upload de médias avec progression
- [ ] Gestion d'état global (Zustand)
- [ ] Error boundaries et monitoring
- [ ] Tests E2E avec Cypress
- [ ] Optimisation performances (lazy loading, code splitting)
- [ ] PWA avec service worker
- [ ] SEO (meta tags, sitemap)
- [ ] Analytics et tracking

## 📚 Ressources supplémentaires

- [Documentation Next.js](https://nextjs.org/docs)
- [React Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [Chart.js React](https://react-chartjs-2.js.org)