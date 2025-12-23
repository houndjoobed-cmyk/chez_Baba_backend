import { supabase } from '../config/supabase.js';
import axios from 'axios';

/**
 * Service d'internationalisation (i18n)
 * Gère les traductions et conversions de devises
 */
class I18nService {
    constructor() {
        // Cache des traductions en mémoire
        this.translationsCache = new Map();
        // Cache des taux de change
        this.ratesCache = new Map();
        this.cacheExpiry = 3600000; // 1 heure
    }

    /**
     * GESTION DES LANGUES
     */

    /**
     * Obtenir toutes les langues actives
     * Logique : Pour le sélecteur de langue
     */
    async getAvailableLanguages() {
        try {
            const { data, error } = await supabase
                .from('languages')
                .select('*')
                .eq('is_active', true)
                .order('is_default', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erreur récupération langues:', error);
            return [];
        }
    }

    /**
     * Obtenir les traductions pour une langue
     * Logique : Charge toutes les traductions d'une langue avec cache
     */
    async getTranslations(languageCode = 'fr', context = 'frontend') {
        const cacheKey = `${languageCode}_${context}`;
        
        // Vérifier le cache
        if (this.translationsCache.has(cacheKey)) {
            const cached = this.translationsCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }
        }

        try {
            const { data, error } = await supabase
                .from('translations')
                .select('key, value')
                .eq('language_code', languageCode)
                .eq('context', context);

            if (error) throw error;

            // Transformer en objet key-value
            const translations = {};
            data?.forEach(item => {
                translations[item.key] = item.value;
            });

            // Mettre en cache
            this.translationsCache.set(cacheKey, {
                data: translations,
                timestamp: Date.now()
            });

            return translations;
        } catch (error) {
            console.error('Erreur récupération traductions:', error);
            return {};
        }
    }

    /**
     * Traduire une clé spécifique
     * Logique : Traduction avec fallback et interpolation
     */
    async translate(key, languageCode = 'fr', params = {}) {
        const translations = await this.getTranslations(languageCode);
        
        let text = translations[key] || key;

        // Interpolation des paramètres
        // Ex: "Bonjour {name}" avec params = {name: 'Jean'} => "Bonjour Jean"
        Object.keys(params).forEach(param => {
            const regex = new RegExp(`{${param}}`, 'g');
            text = text.replace(regex, params[param]);
        });

        return text;
    }

    /**
     * Obtenir la traduction d'un produit
     * Logique : Traductions spécifiques aux produits
     */
    async getProductTranslation(productId, languageCode) {
        try {
            const { data, error } = await supabase
                .from('product_translations')
                .select('*')
                .eq('product_id', productId)
                .eq('language_code', languageCode)
                .single();

            if (error || !data) {
                // Retourner les données originales si pas de traduction
                return null;
            }

            return data;
        } catch (error) {
            console.error('Erreur traduction produit:', error);
            return null;
        }
    }

    /**
     * Traduire automatiquement avec API externe
     * Logique : Pour les nouvelles traductions (Google Translate API)
     */
    async autoTranslate(text, fromLang = 'fr', toLang = 'en') {
        try {
            // Utiliser Google Translate API (nécessite clé API)
            if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
                console.warn('API de traduction non configurée');
                return text;
            }

            const response = await axios.post(
                `https://translation.googleapis.com/language/translate/v2`,
                {
                    q: text,
                    source: fromLang,
                    target: toLang,
                    format: 'text'
                },
                {
                    params: {
                        key: process.env.GOOGLE_TRANSLATE_API_KEY
                    }
                }
            );

            return response.data.data.translations[0].translatedText;
        } catch (error) {
            console.error('Erreur traduction automatique:', error);
            return text;
        }
    }

    /**
     * Créer une traduction pour un produit
     * Logique : Ajoute ou met à jour une traduction
     */
    async createProductTranslation(productId, languageCode, translations) {
        try {
            const { data, error } = await supabase
                .from('product_translations')
                .upsert([{
                    product_id: productId,
                    language_code: languageCode,
                    ...translations
                }])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erreur création traduction produit:', error);
            throw error;
        }
    }

    /**
     * GESTION DES DEVISES
     */

    /**
     * Obtenir toutes les devises actives
     * Logique : Pour le sélecteur de devise
     */
    async getAvailableCurrencies() {
        try {
            const { data, error } = await supabase
                .from('currencies')
                .select('*')
                .eq('is_active', true)
                .order('is_default', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erreur récupération devises:', error);
            return [];
        }
    }

    /**
     * Convertir un prix
     * Logique : Conversion basée sur les taux de change
     */
    async convertPrice(amount, fromCurrency = 'XOF', toCurrency = 'XOF') {
        if (fromCurrency === toCurrency) {
            return amount;
        }

        try {
            // Utiliser la fonction SQL pour la conversion
            const { data, error } = await supabase
                .rpc('convert_price', {
                    p_amount: amount,
                    p_from_currency: fromCurrency,
                    p_to_currency: toCurrency
                });

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erreur conversion prix:', error);
            return amount;
        }
    }

    /**
     * Mettre à jour les taux de change
     * Logique : Récupère les taux depuis une API externe
     */
    async updateExchangeRates() {
        try {
            // API de taux de change (ex: exchangerate-api.com)
            if (!process.env.EXCHANGE_RATE_API_KEY) {
                console.warn('API de taux de change non configurée');
                return;
            }

            const response = await axios.get(
                `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/XOF`
            );

            const rates = response.data.conversion_rates;

            // Mettre à jour les taux dans la base
            for (const [currency, rate] of Object.entries(rates)) {
                if (['EUR', 'USD', 'NGN'].includes(currency)) {
                    // Le taux API est XOF -> Currency, on veut l'inverse
                    const inverseRate = 1 / rate;

                    await supabase
                        .from('currencies')
                        .update({ 
                            exchange_rate: inverseRate,
                            updated_at: new Date()
                        })
                        .eq('code', currency);

                    // Historiser le taux
                    await supabase
                        .from('exchange_rates_history')
                        .insert([{
                            currency_code: currency,
                            rate: inverseRate,
                            source: 'api'
                        }]);
                }
            }

            console.log('✅ Taux de change mis à jour');
        } catch (error) {
            console.error('Erreur mise à jour taux:', error);
        }
    }

    /**
     * Formater un prix selon la devise
     * Logique : Format adapté à chaque devise
     */
    formatPrice(amount, currencyCode = 'XOF', locale = 'fr-BJ') {
        const currencyFormats = {
            'XOF': { 
                locale: 'fr-BJ',
                options: {
                    style: 'currency',
                    currency: 'XOF',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }
            },
            'EUR': {
                locale: 'fr-FR',
                options: {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2
                }
            },
            'USD': {
                locale: 'en-US',
                options: {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2
                }
            },
            'NGN': {
                locale: 'en-NG',
                options: {
                    style: 'currency',
                    currency: 'NGN',
                    minimumFractionDigits: 2
                }
            }
        };

        const format = currencyFormats[currencyCode] || currencyFormats['XOF'];
        
        try {
            return new Intl.NumberFormat(format.locale, format.options).format(amount);
        } catch (error) {
            // Fallback basique
            return `${amount} ${currencyCode}`;
        }
    }

    /**
     * PRÉFÉRENCES UTILISATEUR
     */

    /**
     * Obtenir les préférences d'un utilisateur
     * Logique : Langue et devise préférées
     */
    async getUserPreferences(userId) {
        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error || !data) {
                // Retourner les valeurs par défaut
                return {
                    preferred_language: 'fr',
                    preferred_currency: 'XOF',
                    timezone: 'Africa/Porto-Novo',
                    date_format: 'DD/MM/YYYY'
                };
            }

            return data;
        } catch (error) {
            console.error('Erreur récupération préférences:', error);
            return {
                preferred_language: 'fr',
                preferred_currency: 'XOF',
                timezone: 'Africa/Porto-Novo',
                date_format: 'DD/MM/YYYY'
            };
        }
    }

    /**
     * Mettre à jour les préférences utilisateur
     */
    async updateUserPreferences(userId, preferences) {
        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .upsert([{
                    user_id: userId,
                    ...preferences,
                    updated_at: new Date()
                }])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erreur mise à jour préférences:', error);
            throw error;
        }
    }

    /**
     * Détecter la langue/devise par IP
     * Logique : Géolocalisation pour suggérer langue/devise
     */
    async detectLocaleByIP(ipAddress) {
        try {
            // Utiliser une API de géolocalisation (ex: ipapi.co)
            const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
            const country = response.data.country_code;

            // Mapper pays -> langue/devise
            const localeMap = {
                'BJ': { language: 'fr', currency: 'XOF' }, // Bénin
                'NG': { language: 'yo', currency: 'NGN' }, // Nigeria
                'FR': { language: 'fr', currency: 'EUR' }, // France
                'US': { language: 'en', currency: 'USD' }, // USA
                'TG': { language: 'fr', currency: 'XOF' }, // Togo
                'SN': { language: 'fr', currency: 'XOF' }, // Sénégal
                'CI': { language: 'fr', currency: 'XOF' }, // Côte d'Ivoire
            };

            return localeMap[country] || { language: 'fr', currency: 'XOF' };
        } catch (error) {
            console.error('Erreur détection locale:', error);
            return { language: 'fr', currency: 'XOF' };
        }
    }

    /**
     * Obtenir les produits avec traductions et prix convertis
     * Logique : Pour l'affichage multilingue des produits
     */
    async getLocalizedProducts(languageCode = 'fr', currencyCode = 'XOF', filters = {}) {
        try {
            // Requête de base
            let query = supabase
                .from('products')
                .select(`
                    *,
                    product_translations!left (
                        titre,
                        description,
                        tags
                    ),
                    categories (
                        nom,
                        category_translations!left (nom, description)
                    ),
                    shops (nom)
                `)
                .eq('status', 'active');

            // Appliquer les filtres
            if (filters.category_id) {
                query = query.eq('category_id', filters.category_id);
            }

            const { data: products, error } = await query;

            if (error) throw error;

            // Transformer les produits avec traductions et conversions
            const localizedProducts = await Promise.all(
                products.map(async (product) => {
                    // Traduction du produit
                    const translation = product.product_translations?.find(
                        t => t.language_code === languageCode
                    );

                    // Prix converti
                    const convertedPrice = await this.convertPrice(
                        product.prix,
                        'XOF',
                        currencyCode
                    );

                    return {
                        ...product,
                        titre: translation?.titre || product.titre,
                        description: translation?.description || product.description,
                        tags: translation?.tags || product.tags,
                        prix_original: product.prix,
                        prix: convertedPrice,
                        devise: currencyCode,
                        prix_formaté: this.formatPrice(convertedPrice, currencyCode)
                    };
                })
            );

            return localizedProducts;
        } catch (error) {
            console.error('Erreur récupération produits localisés:', error);
            return [];
        }
    }

    /**
     * TRADUCTIONS PRÉDÉFINIES
     */

    /**
     * Initialiser les traductions de base
     * Logique : Crée les traductions essentielles de l'interface
     */
    async initializeTranslations() {
        const translations = [
            // Français
            { language_code: 'fr', key: 'common.welcome', value: 'Bienvenue', context: 'frontend' },
            { language_code: 'fr', key: 'common.login', value: 'Connexion', context: 'frontend' },
            { language_code: 'fr', key: 'common.register', value: 'Inscription', context: 'frontend' },
            { language_code: 'fr', key: 'common.logout', value: 'Déconnexion', context: 'frontend' },
            { language_code: 'fr', key: 'cart.add_to_cart', value: 'Ajouter au panier', context: 'frontend' },
            { language_code: 'fr', key: 'cart.view_cart', value: 'Voir le panier', context: 'frontend' },
            { language_code: 'fr', key: 'cart.checkout', value: 'Commander', context: 'frontend' },
            { language_code: 'fr', key: 'product.in_stock', value: 'En stock', context: 'frontend' },
            { language_code: 'fr', key: 'product.out_of_stock', value: 'Rupture de stock', context: 'frontend' },
            
            // English
            { language_code: 'en', key: 'common.welcome', value: 'Welcome', context: 'frontend' },
            { language_code: 'en', key: 'common.login', value: 'Login', context: 'frontend' },
            { language_code: 'en', key: 'common.register', value: 'Sign up', context: 'frontend' },
            { language_code: 'en', key: 'common.logout', value: 'Logout', context: 'frontend' },
            { language_code: 'en', key: 'cart.add_to_cart', value: 'Add to cart', context: 'frontend' },
            { language_code: 'en', key: 'cart.view_cart', value: 'View cart', context: 'frontend' },
            { language_code: 'en', key: 'cart.checkout', value: 'Checkout', context: 'frontend' },
            { language_code: 'en', key: 'product.in_stock', value: 'In stock', context: 'frontend' },
            { language_code: 'en', key: 'product.out_of_stock', value: 'Out of stock', context: 'frontend' },
            
            // Yoruba
            { language_code: 'yo', key: 'common.welcome', value: 'Ẹ ku abọ', context: 'frontend' },
            { language_code: 'yo', key: 'common.login', value: 'Wọle', context: 'frontend' },
            { language_code: 'yo', key: 'common.register', value: 'Forukọsilẹ', context: 'frontend' },
            { language_code: 'yo', key: 'cart.add_to_cart', value: 'Fi sinu agolo', context: 'frontend' },
            
            // Fon
            { language_code: 'fon', key: 'common.welcome', value: 'Mi fɔn kaabo', context: 'frontend' },
            { language_code: 'fon', key: 'common.login', value: 'Mi byɔ mɛ', context: 'frontend' },
            { language_code: 'fon', key: 'cart.add_to_cart', value: 'Zé é ɖo agban mɛ', context: 'frontend' }
        ];

        for (const translation of translations) {
            await supabase
                .from('translations')
                .upsert([translation])
                .select();
        }

        console.log('✅ Traductions initialisées');
    }
}

export default new I18nService();