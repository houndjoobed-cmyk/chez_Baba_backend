import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import shopRoutes from './routes/shopRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Route
app.get('/', (req, res) => {
    res.json({ message: 'Backend e-commerce fonctionne !' });
});

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});