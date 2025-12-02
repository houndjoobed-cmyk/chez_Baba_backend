import express from 'express';
import {
    createShop,
    getMyShop,
    getAllShops,
    getShopById,
    updateShop,
    deleteShop,
    approveShop,
    getPendingShops,
    blockShop
} from '../controllers/shopController.js';
import { authenticate, isVendor, isAdmin } from '../middleware/auth.js';
const router = express.Router();

// ⚠️ IMPORTANT : Les routes spécifiques AVANT les routes dynamiques

// Routes admin (METTRE EN PREMIER)
router.get('/admin/pending', authenticate, isAdmin, getPendingShops);
router.put('/approve/:id', authenticate, isAdmin, approveShop);
router.put('/block/:id', authenticate, isAdmin, blockShop);

// Routes protégées (vendeurs)
router.post('/create', authenticate, isVendor, createShop);
router.get('/my/shop', authenticate, isVendor, getMyShop);
router.put('/update/:id', authenticate, isVendor, updateShop);
router.delete('/delete/:id', authenticate, deleteShop);

// Routes publiques (METTRE EN DERNIER)
router.get('/', getAllShops);
router.get('/:id', getShopById);

export default router;