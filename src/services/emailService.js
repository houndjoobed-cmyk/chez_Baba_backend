import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service d'envoi d'emails
 * Utilise Nodemailer avec Gmail (ou autre SMTP)
 */
class EmailService {
    constructor() {
        // Configuration du transporteur d'email
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false, // true pour 465, false pour autres ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    /**
     * Envoie un OTP pour vérification email
     * @param {string} to - Email du destinataire
     * @param {string} otp - Code OTP à 6 chiffres
     */
    async sendOTPEmail(to, otp) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to,
            subject: 'Vérification de votre compte Chez Baba',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .container {
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f7f7f7;
                        }
                        .header {
                            background-color: #4CAF50;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 5px 5px 0 0;
                        }
                        .content {
                            background-color: white;
                            padding: 30px;
                            border-radius: 0 0 5px 5px;
                        }
                        .otp-code {
                            font-size: 32px;
                            font-weight: bold;
                            color: #4CAF50;
                            text-align: center;
                            padding: 20px;
                            background-color: #f0f0f0;
                            border-radius: 5px;
                            letter-spacing: 5px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Chez Baba</h1>
                        </div>
                        <div class="content">
                            <h2>Vérifiez votre adresse email</h2>
                            <p>Bonjour,</p>
                            <p>Voici votre code de vérification :</p>
                            <div class="otp-code">${otp}</div>
                            <p>Ce code expire dans 15 minutes.</p>
                            <p>Si vous n'avez pas demandé cette vérification, ignorez cet email.</p>
                        </div>
                        <div class="footer">
                            <p>© 2025 Chez Baba - Marketplace du Bénin</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('✅ OTP email envoyé à:', to);
            return true;
        } catch (error) {
            console.error('❌ Erreur envoi email:', error);
            return false;
        }
    }

    /**
     * Envoie un lien de réinitialisation de mot de passe
     * @param {string} to - Email du destinataire
     * @param {string} resetLink - Lien de réinitialisation
     */
    async sendPasswordResetEmail(to, resetLink) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to,
            subject: 'Réinitialisation de votre mot de passe - Chez Baba',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .container {
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 30px;
                            background-color: #4CAF50;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Réinitialisation de mot de passe</h2>
                        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                        <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
                        <p>Ou copiez ce lien : ${resetLink}</p>
                        <p><strong>Ce lien expire dans 1 heure.</strong></p>
                        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Erreur envoi email reset:', error);
            return false;
        }
    }

    /**
     * Email de bienvenue après inscription
     * @param {string} to - Email du destinataire
     * @param {string} userName - Nom de l'utilisateur
     */
    async sendWelcomeEmail(to, userName) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to,
            subject: 'Bienvenue sur Chez Baba ! 🎉',
            html: `
                <!DOCTYPE html>
                <html>
                <body>
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #4CAF50;">Bienvenue ${userName} !</h1>
                        <p>Votre compte a été créé avec succès sur Chez Baba.</p>
                        <p>Vous pouvez maintenant :</p>
                        <ul>
                            <li>Parcourir nos produits</li>
                            <li>Passer des commandes</li>
                            <li>Suivre vos achats</li>
                        </ul>
                        <p>Bon shopping !</p>
                        <hr>
                        <p style="color: #666; font-size: 12px;">L'équipe Chez Baba</p>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Erreur envoi email bienvenue:', error);
            return false;
        }
    }

    /**
     * Email de rappel panier abandonné
     * Logique : Incite à finaliser l'achat
     * @param {string} to - Email du destinataire
     * @param {string} userName - Nom de l'utilisateur
     * @param {object} cartContent - Contenu du panier {items: [...]}
     * @param {number} totalAmount - Montant total
     */
    async sendAbandonedCartReminder(to, userName, cartContent, totalAmount) {
        // Générer le HTML des produits
        const productsHtml = cartContent.items.map(item => `
            <tr>
                <td style="padding: 10px;">
                    <img src="${item.image}" alt="${item.product_name}" style="width: 60px; height: 60px; object-fit: cover;">
                </td>
                <td style="padding: 10px;">${item.product_name}</td>
                <td style="padding: 10px;">${item.quantity}</td>
                <td style="padding: 10px;">${item.unit_price.toLocaleString()} FCFA</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to,
            subject: `${userName}, vous avez oublié quelque chose ! 🛒`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .container {
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .header {
                            background-color: #4CAF50;
                            color: white;
                            padding: 20px;
                            text-align: center;
                        }
                        .content {
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .products-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        .products-table tr:nth-child(even) {
                            background-color: #f0f0f0;
                        }
                        .cta-button {
                            display: inline-block;
                            padding: 15px 30px;
                            background-color: #4CAF50;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                            font-weight: bold;
                        }
                        .discount {
                            background-color: #FFC107;
                            color: #333;
                            padding: 10px;
                            text-align: center;
                            font-weight: bold;
                            margin: 20px 0;
                            border-radius: 5px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Chez Baba</h1>
                        </div>
                        <div class="content">
                            <h2>Bonjour ${userName} ! 👋</h2>
                            <p>Vous avez laissé des articles dans votre panier. Nous les avons gardés pour vous !</p>
                            
                            <div class="discount">
                                🎁 Profitez de 5% de réduction avec le code : RETOUR5
                            </div>
                            
                            <h3>Votre panier :</h3>
                            <table class="products-table">
                                <thead>
                                    <tr style="background-color: #e8e8e8; font-weight: bold;">
                                        <td style="padding: 10px;">Image</td>
                                        <td style="padding: 10px;">Produit</td>
                                        <td style="padding: 10px;">Quantité</td>
                                        <td style="padding: 10px;">Prix</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productsHtml}
                                </tbody>
                            </table>
                            
                            <p><strong>Total : ${totalAmount.toLocaleString()} FCFA</strong></p>
                            
                            <center>
                                <a href="${process.env.FRONTEND_URL}/cart" class="cta-button">
                                    Finaliser ma commande
                                </a>
                            </center>
                            
                            <p>Ces articles sont très demandés et pourraient bientôt être en rupture de stock.</p>
                        </div>
                        <div class="footer">
                            <p>
                                Si vous ne souhaitez plus recevoir ces rappels, 
                                <a href="${process.env.FRONTEND_URL}/unsubscribe">cliquez ici</a>
                            </p>
                            <p>© 2025 Chez Baba - Marketplace du Bénin</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Email panier abandonné envoyé à:', to);
            return true;
        } catch (error) {
            console.error('❌ Erreur envoi email panier abandonné:', error);
            return false;
        }
    }
}

export default new EmailService();