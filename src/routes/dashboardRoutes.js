import express from 'express';
import {
    getVendorDashboard,
    getAdminDashboard,
    exportVendorData
} from '../controllers/dashboardController.js';
import { authenticate, isVendor, isAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Routes Dashboard Vendeur
 */
router.get('/vendor', authenticate, isVendor, getVendorDashboard);
router.get('/vendor/export', authenticate, isVendor, exportVendorData);

/**
 * Routes Dashboard Admin
 */
router.get('/admin', authenticate, isAdmin, getAdminDashboard);

export default router;