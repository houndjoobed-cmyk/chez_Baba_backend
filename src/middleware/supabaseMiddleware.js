import { supabase } from '../config/supabase.js';

/**
 * Middleware pour injecter le client Supabase dans la requête.
 * Permet de centraliser l'accès et facilite la transition future vers RLS (Row Level Security).
 */
export const supabaseMiddleware = (req, res, next) => {
    // Pour l'instant, on utilise le client global (Service Role ou Anon selon config).
    // Dans le futur, on pourrait créer un client scopé ici :
    // req.supabase = createClient(..., { global: { headers: { Authorization: req.headers.authorization } } });

    req.supabase = supabase;
    next();
};
