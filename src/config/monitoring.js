/**
 * Configuration du monitoring
 * Simplifié - Sentry peut être ajouté plus tard si nécessaire
 */

export const initMonitoring = (app) => {
  console.log('🔍 Monitoring activé (mode: ' + (process.env.NODE_ENV || 'development') + ')');
};

// Mock des middlewares Sentry
export const sentryMiddleware = {
  requestHandler: (req, res, next) => next(),
  errorHandler: (err, req, res, next) => next(err),
  tracingHandler: (req, res, next) => next(),
};

export const captureError = (error, context = {}) => {
  console.error('❌ Erreur capturée:', {
    message: error.message,
    stack: error.stack,
    context
  });
};

export const captureException = (error) => {
  console.error('❌ Exception capturée:', error);
};

export const captureMessage = (message, level = 'info') => {
  console.log(`📝 [${level}] ${message}`);
};

export const monitorCronJob = (jobName, callback) => {
  return async (...args) => {
    try {
      const startTime = Date.now();
      await callback(...args);
      const duration = Date.now() - startTime;
      console.log(`✅ Job "${jobName}" complété en ${duration}ms`);
    } catch (error) {
      console.error(`❌ Job "${jobName}" échoué:`, error.message);
      captureError(error, { jobName });
    }
  };
};

export const startTransaction = (name) => ({
  startChild: () => ({ setStatus: () => {}, finish: () => {} }),
  finish: () => {},
  setStatus: () => {}
});

export const addBreadcrumb = (message) => {
  console.log(`📝 ${message}`);
};