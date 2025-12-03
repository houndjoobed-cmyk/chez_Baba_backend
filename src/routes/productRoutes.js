import express from 'express';
import {
    createProduct,
    getProductsByShop,
    getAllProducts,
    getProductById,
    getMyProducts,
    updateProduct,
    deleteProduct
} from '../controllers/productController.js';
import { authenticate, isVendor } from '../middleware/auth.js';

const router = express.Router();

// Routes publiques
router.get('/', getAllProducts); // Tous les produits
router.get('/shop/:shopId', getProductsByShop); // Produits d'une boutique
router.get('/:id', getProductById); // Un produit spécifique

// Routes vendeurs
router.post('/create', authenticate, isVendor, createProduct); // Créer un produit
router.get('/my/products', authenticate, isVendor, getMyProducts); // Mes produits
router.put('/update/:id', authenticate, isVendor, updateProduct); // Modifier un produit
router.delete('/delete/:id', authenticate, isVendor, deleteProduct); // Supprimer un produit

export default router;