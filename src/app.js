import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/healthRoutes.js';

dotenv.config();

// Initialisation Express
const app = express();

// Middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
// CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Filtre les valeurs nulles/undefined
  credentials: true
}));

// Compression Gzip
app.use(compression());

// Parser JSON et URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route d'accueil
app.get('/', (req, res) => {
  res.json({
    message: '🎉 Backend Chez Baba - API E-Commerce',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      shops: '/api/shops',
      categories: '/api/categories'
    }
  });
});

// Routes de santé (pas de rate limit)
app.use('/', healthRoutes);

// Import de toutes les routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import i18nRoutes from './routes/i18nRoutes.js';

// Middleware i18n
import { i18nMiddleware } from './middleware/i18nMiddleware.js';
import { supabaseMiddleware } from './middleware/supabaseMiddleware.js';

app.use(i18nMiddleware);
app.use(supabaseMiddleware);

// Montage des routes API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/i18n', i18nRoutes);

// Route 404
app.use(notFoundHandler);

// Error handler global
app.use(errorHandler);

// Démarrage des jobs CRON
import { startCartJobs } from './jobs/cartJobs.js';
import { monitorCronJob } from './config/monitoring.js';

// Port
const PORT = process.env.PORT || 5000;

// Démarrage du serveur
const server = app.listen(PORT, () => {
  console.log(`
    🚀 Serveur démarré sur http://localhost:${PORT}
    📍 Environnement: ${process.env.NODE_ENV}
    🔍 Monitoring: ${process.env.NODE_ENV === 'production' ? 'Activé' : 'Désactivé'}
    📊 Health: http://localhost:${PORT}/health
    📈 Metrics: http://localhost:${PORT}/metrics
  `);

  // Démarrer les jobs CRON avec monitoring
  if (process.env.NODE_ENV !== 'test') {
    startCartJobs();
    console.log('⏰ Jobs CRON démarrés');
  }
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM reçu, fermeture gracieuse...');
  server.close(() => {
    console.log('✅ Serveur fermé');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT reçu, fermeture gracieuse...');
  server.close(() => {
    console.log('✅ Serveur fermé');
    process.exit(0);
  });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  captureError(error, { type: 'uncaught_exception' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  captureError(new Error(reason), { type: 'unhandled_rejection' });
});

export default app;
