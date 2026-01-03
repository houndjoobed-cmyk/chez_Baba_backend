import { jest, afterEach, afterAll } from '@jest/globals';
import 'jest-extended';
import { supabase } from '../src/config/supabase.js';

/**
 * Configuration globale avant tous les tests
 */

// Mock de Supabase pour les tests
jest.mock('../src/config/supabase.js', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis()
  }
}));

// Variables d'environnement de test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-key';

// Nettoyer après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Fermer les connexions après tous les tests
afterAll(async () => {
  // Fermer connexions DB, Redis, etc.
  await new Promise(resolve => setTimeout(() => resolve(), 500));
});