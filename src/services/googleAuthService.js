import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service d'authentification Google OAuth
 */
class GoogleAuthService {
    constructor() {
        this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    /**
     * Vérifie et décode un token Google ID
     * @param {string} idToken - Token reçu du frontend
     * @returns {Object} Informations utilisateur Google
     */
    async verifyGoogleToken(idToken) {
        try {
            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            
            const payload = ticket.getPayload();
            
            // Extraction des informations utilisateur
            return {
                googleId: payload.sub,
                email: payload.email,
                nom: payload.name,
                emailVerified: payload.email_verified,
                picture: payload.picture
            };
        } catch (error) {
            console.error('Erreur vérification token Google:', error);
            throw new Error('Token Google invalide');
        }
    }

    /**
     * Génère l'URL d'autorisation Google
     * @returns {string} URL de redirection vers Google
     */
    generateAuthUrl() {
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: `${process.env.FRONTEND_URL}/auth/google/callback`,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent'
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
}

export default new GoogleAuthService();