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
