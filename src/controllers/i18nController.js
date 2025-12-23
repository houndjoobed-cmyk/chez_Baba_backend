import i18nService from '../services/i18nService.js';
import { supabase } from '../config/supabase.js';

/**
 * Contrôleur pour l'internationalisation
 */

/**
 * Obtenir les langues disponibles
 */
export const getLanguages = async (req, res) => {
    try {
        const languages = await i18nService.getAvailableLanguages();
        res.status(200).json({ languages });
    } catch (error) {
        console.error('Erreur récupération langues:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Obtenir les devises disponibles
 */
export const getCurrencies = async (req, res) => {
    try {
        const currencies = await i18nService.getAvailableCurrencies();
        res.status(200).json({ currencies });
    } catch (error) {
        console.error('Erreur récupération devises:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Obtenir les traductions pour une langue
 */
export const getTranslations = async (req, res) => {
    try {
        const { language = 'fr', context = 'frontend' } = req.query;
        
        const translations = await i18nService.getTranslations(language, context);
        
        res.status(200).json({ 
            language,
            translations 
        });
    } catch (error) {
        console.error('Erreur récupération traductions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Convertir un prix
 */
export const convertPrice = async (req, res) => {
    try {
        const { amount, from = 'XOF', to = 'XOF' } = req.query;
        
        if (!amount) {
            return res.status(400).json({ error: 'Montant requis' });
        }
        
        const converted = await i18nService.convertPrice(
            parseFloat(amount),
            from,
            to
        );
        
        const formatted = i18nService.formatPrice(converted, to);
        
        res.status(200).json({
            original: parseFloat(amount),
            converted,
            formatted,
            from_currency: from,
            to_currency: to
        });
    } catch (error) {
        console.error('Erreur conversion prix:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Obtenir les préférences utilisateur
 */
export const getUserPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const preferences = await i18nService.getUserPreferences(userId);
        
        res.status(200).json(preferences);
    } catch (error) {
        console.error('Erreur récupération préférences:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Mettre à jour les préférences utilisateur
 */
export const updateUserPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { language, currency, timezone, date_format } = req.body;
        
        const preferences = await i18nService.updateUserPreferences(userId, {
            preferred_language: language,
            preferred_currency: currency,
            timezone,
            date_format
        });
        
        res.status(200).json({
            message: 'Préférences mises à jour',
            preferences
        });
    } catch (error) {
        console.error('Erreur mise à jour préférences:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Détecter locale par IP
 */
export const detectLocale = async (req, res) => {
    try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        const locale = await i18nService.detectLocaleByIP(ipAddress);
        
        res.status(200).json(locale);
    } catch (error) {
        console.error('Erreur détection locale:', error);
        res.status(500).json({ 
            language: 'fr',
            currency: 'XOF'
        });
    }
};

/**
 * Obtenir les produits localisés
 */
export const getLocalizedProducts = async (req, res) => {
    try {
        const { 
            language = 'fr', 
            currency = 'XOF',
            category,
            search 
        } = req.query;
        
        const products = await i18nService.getLocalizedProducts(
            language,
            currency,
            { category_id: category }
        );
        
        res.status(200).json({ 
            products,
            language,
            currency
        });
    } catch (error) {
        console.error('Erreur produits localisés:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Traduire un produit (vendeur)
 */
export const translateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { language, titre, description, tags, auto = false } = req.body;
        const userId = req.user.userId;
        
        // Vérifier que le produit appartient au vendeur
        const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', userId)
            .single();
            
        const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .eq('shop_id', shop.id)
            .single();
            
        if (!product) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        let translatedData = { titre, description, tags };
        
        // Traduction automatique si demandée
        if (auto) {
            translatedData.titre = await i18nService.autoTranslate(
                product.titre,
                'fr',
                language
            );
            translatedData.description = await i18nService.autoTranslate(
                product.description,
                'fr',
                language
            );
        }
        
        const translation = await i18nService.createProductTranslation(
            productId,
            language,
            translatedData
        );
        
        res.status(200).json({
            message: 'Traduction ajoutée',
            translation
        });
    } catch (error) {
        console.error('Erreur traduction produit:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Mettre à jour les taux de change (Admin)
 */
export const updateExchangeRates = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        await i18nService.updateExchangeRates();
        
        res.status(200).json({
            message: 'Taux de change mis à jour'
        });
    } catch (error) {
        console.error('Erreur mise à jour taux:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};