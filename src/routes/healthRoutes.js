import express from 'express';
import { supabase } from '../config/supabase.js';
import redis from '../config/redis.js';
import os from 'os';

const router = express.Router();

/**
 * Endpoint de health check
 * Logique : Vérifie l'état de tous les services
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  try {
    // Vérifier la base de données
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single();
    
    health.services.database = {
      status: dbError ? 'unhealthy' : 'healthy',
      responseTime: Date.now() - dbStart,
      error: dbError?.message
    };

    // Vérifier Redis
    const redisStart = Date.now();
    try {
      await redis.ping();
      health.services.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStart
      };
    } catch (redisError) {
      health.services.redis = {
        status: 'unhealthy',
        error: redisError.message
      };
    }

    // Status global
    const hasUnhealthy = Object.values(health.services)
      .some(service => service.status === 'unhealthy');
    
    if (hasUnhealthy) {
      health.status = 'degraded';
    }

    res.status(health.status === 'healthy' ? 200 : 503).json(health);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Endpoint de métriques
 * Logique : Expose des métriques pour Prometheus
 */
router.get('/metrics', async (req, res) => {
  const metrics = [];

  // Métriques système
  metrics.push(`# HELP nodejs_heap_size_total_bytes Process heap size`);
  metrics.push(`# TYPE nodejs_heap_size_total_bytes gauge`);
  metrics.push(`nodejs_heap_size_total_bytes ${process.memoryUsage().heapTotal}`);

  metrics.push(`# HELP nodejs_heap_size_used_bytes Process heap used`);
  metrics.push(`# TYPE nodejs_heap_size_used_bytes gauge`);
  metrics.push(`nodejs_heap_size_used_bytes ${process.memoryUsage().heapUsed}`);

  metrics.push(`# HELP nodejs_cpu_usage_percentage CPU usage percentage`);
  metrics.push(`# TYPE nodejs_cpu_usage_percentage gauge`);
  const cpuUsage = process.cpuUsage();
  metrics.push(`nodejs_cpu_usage_percentage ${(cpuUsage.user + cpuUsage.system) / 1000000}`);

  metrics.push(`# HELP nodejs_uptime_seconds Process uptime`);
  metrics.push(`# TYPE nodejs_uptime_seconds counter`);
  metrics.push(`nodejs_uptime_seconds ${process.uptime()}`);

  // Métriques métier (exemples)
  try {
    // Nombre d'utilisateurs
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    metrics.push(`# HELP app_users_total Total number of users`);
    metrics.push(`# TYPE app_users_total gauge`);
    metrics.push(`app_users_total ${userCount || 0}`);

    // Nombre de commandes aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    
    metrics.push(`# HELP app_orders_today Number of orders today`);
    metrics.push(`# TYPE app_orders_today gauge`);
    metrics.push(`app_orders_today ${orderCount || 0}`);

  } catch (error) {
    console.error('Erreur métriques métier:', error);
  }

  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
});

/**
 * Endpoint de readiness
 * Logique : Indique si l'app est prête à recevoir du trafic
 */
router.get('/ready', async (req, res) => {
  try {
    // Vérifier que tous les services critiques sont disponibles
    await supabase.from('users').select('count').limit(1).single();
    await redis.ping();
    
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ 
      ready: false, 
      error: error.message 
    });
  }
});

/**
 * Endpoint de liveness
 * Logique : Indique si l'app est vivante (pour Kubernetes)
 */
router.get('/live', (req, res) => {
  res.status(200).json({ alive: true });
});

export default router;