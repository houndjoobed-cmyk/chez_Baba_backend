import Redis from 'ioredis';

let redis;
let isConnected = false;

try {
  // Essayer de se connecter à Redis
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      // Arrêter après 3 tentatives
      if (times > 3) {
        console.warn('⚠️ Redis indisponible - utilisation du mock');
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false,
  });

  redis.on('error', (err) => {
    // Supprimer les avertissements répétitifs
    if (!isConnected) {
      console.warn('⚠️ Redis non disponible - mode mock activé');
      isConnected = true;
    }
  });

  redis.on('connect', () => {
    console.log('✅ Redis connecté');
    isConnected = true;
  });
} catch (error) {
  console.warn('⚠️ Redis non disponible:', error.message);
  // Créer un mock de redis si pas disponible
  redis = {
    ping: async () => ({ status: 'mock' }),
    set: async () => 'mock',
    get: async () => null,
    del: async () => 0,
    expire: async () => 0,
    ttl: async () => -2,
  };
}

export default redis;
