/**
 * Logger structuré pour le backend
 * Utilise un format JSON pour faciliter le parsing
 */

export class Logger {
    constructor(module) {
        this.module = module;
        this.environment = process.env.NODE_ENV || 'development';
    }

    /**
     * Log d'information
     */
    info(message, data = {}) {
        console.log(JSON.stringify({
            level: 'INFO',
            timestamp: new Date().toISOString(),
            module: this.module,
            message,
            ...data
        }));
    }

    /**
     * Log d'avertissement
     */
    warn(message, error = null, data = {}) {
        console.warn(JSON.stringify({
            level: 'WARN',
            timestamp: new Date().toISOString(),
            module: this.module,
            message,
            ...(error && { error: error.message }),
            ...data
        }));
    }

    /**
     * Log d'erreur
     */
    error(message, error, data = {}) {
        console.error(JSON.stringify({
            level: 'ERROR',
            timestamp: new Date().toISOString(),
            module: this.module,
            message,
            error: error?.message || error,
            stack: error?.stack,
            ...(this.environment === 'development' && error && { fullError: error }),
            ...data
        }));
    }

    /**
     * Log pour les requêtes HTTP
     */
    httpRequest(method, path, statusCode, duration, userId = null) {
        const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
        
        console.log(JSON.stringify({
            level,
            type: 'HTTP_REQUEST',
            timestamp: new Date().toISOString(),
            method,
            path,
            statusCode,
            duration,
            userId,
            module: this.module
        }));
    }

    /**
     * Log pour les opérations sensibles
     */
    audit(action, resource, resourceId, userId, changes = {}) {
        console.log(JSON.stringify({
            level: 'AUDIT',
            timestamp: new Date().toISOString(),
            module: this.module,
            action,
            resource,
            resourceId,
            userId,
            changes
        }));
    }

    /**
     * Log de performance
     */
    performance(operation, duration, metadata = {}) {
        const level = duration > 1000 ? 'WARN' : 'INFO';
        
        console.log(JSON.stringify({
            level,
            type: 'PERFORMANCE',
            timestamp: new Date().toISOString(),
            module: this.module,
            operation,
            duration,
            ...metadata
        }));
    }
}

/**
 * Factory pour créer un logger
 */
export const createLogger = (module) => new Logger(module);

/**
 * Middleware pour logger les requêtes HTTP
 */
export const httpLoggingMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const logger = createLogger('HTTP');
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.httpRequest(
            req.method,
            req.path,
            res.statusCode,
            duration,
            req.user?.userId
        );
    });
    
    next();
};

export default createLogger;
