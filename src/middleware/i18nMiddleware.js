import i18nService from '../services/i18nService.js';

/**
 * Middleware pour gérer la langue et devise de la requête
 * Logique : Détecte et applique les préférences de l'utilisateur
 */
export const i18nMiddleware = async (req, res, next) => {
    try {
        // 1. Récupérer la langue depuis les headers ou query
        let language = req.headers['accept-language']?.split(',')[0]?.substring(0, 2) || 'fr';
        let currency = 'XOF';

        // 2. Priorité aux query params
        if (req.query.lang) {
            language = req.query.lang;
        }
        if (req.query.currency) {
            currency = req.query.currency;
        }

        // 3. Si utilisateur connecté, utiliser ses préférences
        if (req.user) {
            const preferences = await i18nService.getUserPreferences(req.user.userId);
            language = preferences.preferred_language || language;
            currency = preferences.preferred_currency || currency;
        }

        // 4. Attacher à la requête
        req.locale = {
            language,
            currency,
            formatPrice: (amount) => i18nService.formatPrice(amount, currency),
            translate: (key, params) => i18nService.translate(key, language, params)
        };

        // 5. Headers de réponse
        res.setHeader('Content-Language', language);

        next();
    } catch (error) {
        console.error('Erreur middleware i18n:', error);
        // Continuer avec les valeurs par défaut
        req.locale = {
            language: 'fr',
            currency: 'XOF',
            formatPrice: (amount) => `${amount} FCFA`,
            translate: (key) => key
        };
        next();
    }
};