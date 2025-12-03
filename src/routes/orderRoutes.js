import express from 'express';
import {
    createOrder,
    getMyOrders,
    getOrderById,
    getShopOrders,
    confirmOrder,
    deliverOrder,
    cancelOrder,
    getAllOrders
} from '../controllers/orderController.js';
import { authenticate, isVendor, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Routes clients
router.post('/create', authenticate, createOrder); // Créer une commande
router.get('/my/orders', authenticate, getMyOrders); // Mes commandes
router.get('/:id', authenticate, getOrderById); // Une commande spécifique
router.put('/:id/cancel', authenticate, cancelOrder); // Annuler une commande

// Routes vendeurs
router.get('/shop/orders', authenticate, isVendor, getShopOrders); // Commandes de ma boutique
router.put('/:id/confirm', authenticate, isVendor, confirmOrder); // Confirmer une commande
router.put('/:id/deliver', authenticate, isVendor, deliverOrder); // Marquer comme livrée

// Routes admin
router.get('/admin/all', authenticate, isAdmin, getAllOrders); // Toutes les commandes

export default router;