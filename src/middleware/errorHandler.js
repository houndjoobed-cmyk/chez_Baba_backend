import { captureError } from '../config/monitoring.js';

/**
 * Middleware global de gestion des erreurs
 * Logique : Capture et formate toutes les erreurs
 */
export const errorHandler = (err, req, res, next) => {
  // Logger l'erreur
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.userId
  });

  // Capturer avec Sentry en production
  if (process.env.NODE_ENV === 'production') {
    captureError(err, {
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      ip: req.ip
    });
  }

  // Déterminer le statut HTTP
  const status = err.status || err.statusCode || 500;
  
  // Message d'erreur
  let message = err.message || 'Une erreur est survenue';
  
  // En production, masquer les détails techniques
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Erreur serveur interne';
  }

  // Réponse d'erreur
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};

/**
 * Gestionnaire pour les routes non trouvées
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.path
  });
};

/**
 * Classe d'erreur personnalisée
 */
export class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wrapper async pour les contrôleurs
 * Logique : Évite les try-catch répétitifs
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};