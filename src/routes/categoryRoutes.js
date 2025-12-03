import express from 'express';
import {
    getAllCategories,
    getCategoryById,
    getProductsByCategory
} from '../controllers/categoryController.js';

const router = express.Router();

// Routes publiques
router.get('/', getAllCategories); // Toutes les catégories
router.get('/:id', getCategoryById); // Une catégorie spécifique
router.get('/:id/products', getProductsByCategory); // Produits d'une catégorie

export default router;