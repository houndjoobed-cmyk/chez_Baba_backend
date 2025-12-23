import cron from 'node-cron';
import cartService from '../services/cartService.js';
import emailService from '../services/emailService.js';

/**
 * Jobs automatisés pour la gestion des paniers
 */

/**
 * Détecter et relancer les paniers abandonnés
 * Logique : Toutes les 6 heures
 */
export const startAbandonedCartReminder = () => {
    // Exécuter toutes les 6 heures
    cron.schedule('0 */6 * * *', async () => {
        console.log('🛒 Vérification des paniers abandonnés...');
        
        try {
            const abandonedCarts = await cartService.getAbandonedCartsToRemind();
            
            for (const cart of abandonedCarts) {
                // Envoyer email de rappel
                await emailService.sendAbandonedCartReminder(
                    cart.users.email,
                    cart.users.nom,
                    cart.cart_content,
                    cart.total_amount
                );
                
                // Marquer comme relancé
                await cartService.markReminderSent(cart.id);
            }
            
            console.log(`✅ ${abandonedCarts.length} rappels envoyés`);
        } catch (error) {
            console.error('Erreur job paniers abandonnés:', error);
        }
    });
};

/**
 * Nettoyer les vieux paniers
 * Logique : Une fois par jour à minuit
 */
export const startCartCleanup = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('🧹 Nettoyage des vieux paniers...');
        
        try {
            await cartService.cleanupOldCarts();
            console.log('✅ Nettoyage terminé');
        } catch (error) {
            console.error('Erreur nettoyage paniers:', error);
        }
    });
};

// Démarrer tous les jobs
export const startCartJobs = () => {
    startAbandonedCartReminder();
    startCartCleanup();
    console.log('⏰ Jobs panier démarrés');
};