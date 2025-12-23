import { supabase } from '../config/supabase.js';
import Stripe from 'stripe';

/**
 * Service de gestion avancée des vendeurs
 * Gère les abonnements, commissions et paiements
 */
class VendorManagementService {
    constructor() {
        // Initialiser Stripe si configuré
        if (process.env.STRIPE_SECRET_KEY) {
            this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        }
    }

    /**
     * GESTION DES PLANS ET ABONNEMENTS
     */

    /**
     * Obtenir tous les plans disponibles
     * Logique : Pour la page de tarification
     */
    async getAvailablePlans() {
        try {
            const { data, error } = await supabase
                .from('vendor_plans')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erreur récupération plans:', error);
            throw error;
        }
    }

    /**
     * Souscrire à un plan
     * Logique : Création ou mise à jour de l'abonnement
     */
    async subscribeToPlan(shopId, planId, paymentMethod = 'mobile_money') {
        try {
            // Récupérer le plan
            const { data: plan } = await supabase
                .from('vendor_plans')
                .select('*')
                .eq('id', planId)
                .single();

            if (!plan) {
                throw new Error('Plan non trouvé');
            }

            // Vérifier l'abonnement actuel
            const { data: currentSub } = await supabase
                .from('vendor_subscriptions')
                .select('*')
                .eq('shop_id', shopId)
                .eq('status', 'active')
                .single();

            if (currentSub) {
                // Annuler l'ancien abonnement
                await supabase
                    .from('vendor_subscriptions')
                    .update({ status: 'cancelled' })
                    .eq('id', currentSub.id);
            }

            // Créer le nouvel abonnement
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + plan.duration_days);

            const { data: subscription, error } = await supabase
                .from('vendor_subscriptions')
                .insert([{
                    shop_id: shopId,
                    plan_id: planId,
                    status: plan.price === 0 ? 'active' : 'pending',
                    start_date: new Date(),
                    end_date: endDate,
                    payment_method: paymentMethod,
                    next_payment_date: endDate
                }])
                .select()
                .single();

            if (error) throw error;

            // Si plan payant, créer la facture
            if (plan.price > 0) {
                await this.createInvoice(shopId, 'subscription', plan.price);
            } else {
                // Plan gratuit, activer directement
                await supabase
                    .from('vendor_subscriptions')
                    .update({ status: 'active' })
                    .eq('id', subscription.id);
            }

            return {
                subscription,
                plan,
                message: plan.price === 0 
                    ? 'Abonnement gratuit activé'
                    : 'Abonnement créé, en attente de paiement'
            };

        } catch (error) {
            console.error('Erreur souscription plan:', error);
            throw error;
        }
    }

    /**
     * Vérifier et renouveler les abonnements expirés
     * Logique : Job quotidien
     */
    async checkAndRenewSubscriptions() {
        try {
            // Récupérer les abonnements expirés avec auto-renew
            const { data: expiredSubs } = await supabase
                .from('vendor_subscriptions')
                .select(`
                    *,
                    vendor_plans!inner(*)
                `)
                .eq('status', 'active')
                .eq('auto_renew', true)
                .lte('end_date', new Date().toISOString());

            for (const sub of expiredSubs || []) {
                // Vérifier le solde du vendeur
                const { data: balance } = await supabase
                    .from('vendor_balances')
                    .select('available_balance')
                    .eq('shop_id', sub.shop_id)
                    .single();

                if (balance?.available_balance >= sub.vendor_plans.price) {
                    // Déduire du solde et renouveler
                    await this.renewSubscription(sub.id);
                } else {
                    // Passer en expiré
                    await supabase
                        .from('vendor_subscriptions')
                        .update({ status: 'expired' })
                        .eq('id', sub.id);

                    // Notifier le vendeur
                    console.log(`Abonnement expiré pour shop ${sub.shop_id}`);
                }
            }

        } catch (error) {
            console.error('Erreur vérification abonnements:', error);
        }
    }

    /**
     * GESTION DES COMMISSIONS
     */

    /**
     * Calculer les commissions d'une commande
     * Logique : Appelé après création de commande
     */
    async calculateCommission(orderId) {
        try {
            // Récupérer les détails de la commande
            const { data: orderItems } = await supabase
                .from('order_items')
                .select(`
                    *,
                    shops!inner(
                        id,
                        vendor_subscriptions!inner(
                            vendor_plans!inner(commission_rate)
                        )
                    )
                `)
                .eq('order_id', orderId);

            const commissionsByShop = {};

            for (const item of orderItems || []) {
                const shopId = item.shop_id;
                const amount = item.quantite * item.prix_unitaire;
                const rate = item.shops.vendor_subscriptions[0]?.vendor_plans?.commission_rate || 10;

                if (!commissionsByShop[shopId]) {
                    commissionsByShop[shopId] = {
                        total_amount: 0,
                        commission_rate: rate,
                        commission_amount: 0
                    };
                }

                commissionsByShop[shopId].total_amount += amount;
                commissionsByShop[shopId].commission_amount += (amount * rate / 100);
            }

            // Enregistrer les commissions
            for (const [shopId, data] of Object.entries(commissionsByShop)) {
                await supabase
                    .from('marketplace_commissions')
                    .insert([{
                        order_id: orderId,
                        shop_id: shopId,
                        order_amount: data.total_amount,
                        commission_rate: data.commission_rate,
                        commission_amount: data.commission_amount
                    }]);
            }

            return commissionsByShop;

        } catch (error) {
            console.error('Erreur calcul commission:', error);
            throw error;
        }
    }

    /**
     * GESTION DES PAIEMENTS ET VIREMENTS
     */

    /**
     * Obtenir le solde d'un vendeur
     * Logique : Dashboard vendeur
     */
    async getVendorBalance(shopId) {
        try {
            let { data: balance } = await supabase
                .from('vendor_balances')
                .select('*')
                .eq('shop_id', shopId)
                .single();

            if (!balance) {
                // Créer le solde s'il n'existe pas
                const { data: newBalance } = await supabase
                    .from('vendor_balances')
                    .insert([{ shop_id: shopId }])
                    .select()
                    .single();

                balance = newBalance;
            }

            // Récupérer les transactions récentes
            const { data: recentPayouts } = await supabase
                .from('vendor_payouts')
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false })
                .limit(5);

            return {
                ...balance,
                recent_payouts: recentPayouts || []
            };

        } catch (error) {
            console.error('Erreur récupération solde:', error);
            throw error;
        }
    }

    /**
     * Demander un virement
     * Logique : Retrait des gains
     */
    async requestPayout(shopId, amount, bankAccountId) {
        try {
            // Vérifier le solde disponible
            const { data: balance } = await supabase
                .from('vendor_balances')
                .select('available_balance')
                .eq('shop_id', shopId)
                .single();

            if (!balance || balance.available_balance < amount) {
                throw new Error('Solde insuffisant');
            }

            // Vérifier le compte bancaire
            const { data: bankAccount } = await supabase
                .from('vendor_bank_accounts')
                .select('*')
                .eq('id', bankAccountId)
                .eq('shop_id', shopId)
                .single();

            if (!bankAccount) {
                throw new Error('Compte bancaire non trouvé');
            }

            // Créer la demande de virement
            const { data: payout, error } = await supabase
                .from('vendor_payouts')
                .insert([{
                    shop_id: shopId,
                    amount: amount,
                    status: 'pending',
                    bank_name: bankAccount.bank_name,
                    account_number: bankAccount.account_number,
                    account_name: bankAccount.account_name
                }])
                .select()
                .single();

            if (error) throw error;

            // Mettre à jour le solde
            await supabase
                .from('vendor_balances')
                .update({
                    available_balance: balance.available_balance - amount
                })
                .eq('shop_id', shopId);

            return {
                payout,
                message: 'Demande de virement créée'
            };

        } catch (error) {
            console.error('Erreur demande virement:', error);
            throw error;
        }
    }

    /**
     * Traiter les virements (Admin)
     * Logique : Validation et exécution des virements
     */
    async processPayout(payoutId, status, reference = null) {
        try {
            const updateData = {
                status,
                processed_at: new Date()
            };

            if (reference) {
                updateData.reference = reference;
            }

            const { data: payout, error } = await supabase
                .from('vendor_payouts')
                .update(updateData)
                .eq('id', payoutId)
                .select()
                .single();

            if (error) throw error;

            // Si complété, mettre à jour le total retiré
            if (status === 'completed') {
                await supabase
                    .from('vendor_balances')
                    .update({
                        total_withdrawn: supabase.raw('total_withdrawn + ?', [payout.amount]),
                        last_payout_date: new Date()
                    })
                    .eq('shop_id', payout.shop_id);
            }

            // Si échoué, restaurer le solde
            if (status === 'failed') {
                await supabase
                    .from('vendor_balances')
                    .update({
                        available_balance: supabase.raw('available_balance + ?', [payout.amount])
                    })
                    .eq('shop_id', payout.shop_id);
            }

            return payout;

        } catch (error) {
            console.error('Erreur traitement virement:', error);
            throw error;
        }
    }

    /**
     * GESTION DES FACTURES
     */

    /**
     * Créer une facture
     * Logique : Pour abonnement ou commission
     */
    async createInvoice(shopId, type, amount) {
        try {
            // Générer numéro de facture
            const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30); // 30 jours pour payer

            const { data: invoice, error } = await supabase
                .from('vendor_invoices')
                .insert([{
                    shop_id: shopId,
                    invoice_number: invoiceNumber,
                    type: type,
                    subtotal: amount,
                    total_amount: amount,
                    due_date: dueDate,
                    status: 'unpaid'
                }])
                .select()
                .single();

            if (error) throw error;

            return invoice;

        } catch (error) {
            console.error('Erreur création facture:', error);
            throw error;
        }
    }

    /**
     * Obtenir les factures d'un vendeur
     */
    async getVendorInvoices(shopId, status = null) {
        try {
            let query = supabase
                .from('vendor_invoices')
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Erreur récupération factures:', error);
            throw error;
        }
    }

    /**
     * STATISTIQUES ET RAPPORTS
     */

    /**
     * Obtenir les statistiques financières d'un vendeur
     */
    async getVendorFinancialStats(shopId, startDate, endDate) {
        try {
            // Revenus totaux
            const { data: revenues } = await supabase
                .from('order_items')
                .select('quantite, prix_unitaire, orders!inner(created_at, status)')
                .eq('shop_id', shopId)
                .eq('orders.status', 'delivered')
                .gte('orders.created_at', startDate)
                .lte('orders.created_at', endDate);

            const totalRevenue = revenues?.reduce((sum, item) => 
                sum + (item.quantite * item.prix_unitaire), 0
            ) || 0;

            // Commissions payées
            const { data: commissions } = await supabase
                .from('marketplace_commissions')
                .select('commission_amount')
                .eq('shop_id', shopId)
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            const totalCommissions = commissions?.reduce((sum, c) => 
                sum + c.commission_amount, 0
            ) || 0;

            // Virements
            const { data: payouts } = await supabase
                .from('vendor_payouts')
                .select('amount, status')
                .eq('shop_id', shopId)
                .eq('status', 'completed')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            const totalPayouts = payouts?.reduce((sum, p) => 
                sum + p.amount, 0
            ) || 0;

            return {
                total_revenue: totalRevenue,
                total_commissions: totalCommissions,
                net_revenue: totalRevenue - totalCommissions,
                total_withdrawn: totalPayouts,
                period: { start: startDate, end: endDate }
            };

        } catch (error) {
            console.error('Erreur stats financières:', error);
            throw error;
        }
    }
}

export default new VendorManagementService();