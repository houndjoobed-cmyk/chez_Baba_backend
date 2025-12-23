import request from 'supertest';
import app from '../../src/app.js';
import { supabase } from '../../src/config/supabase.js';
import { faker } from '@faker-js/faker';

/**
 * Tests d'intégration pour l'authentification
 */
describe('Auth Integration Tests', () => {
  
  describe('POST /api/auth/register', () => {
    it('devrait créer un nouveau compte client', async () => {
      const userData = {
        nom: faker.person.fullName(),
        email: faker.internet.email(),
        telephone: '+229' + faker.string.numeric(8),
        password: 'Password123!',
        role: 'client'
      };
      
      // Mock Supabase responses
      supabase.single.mockResolvedValueOnce({ data: null, error: null }); // Email check
      supabase.single.mockResolvedValueOnce({ data: null, error: null }); // Phone check
      supabase.single.mockResolvedValueOnce({
        data: { id: faker.string.uuid(), ...userData },
        error: null
      }); // User creation
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('créé avec succès');
      expect(response.body).toHaveProperty('userId');
    });
    
    it('devrait rejeter un email invalide', async () => {
      const userData = {
        nom: faker.person.fullName(),
        email: 'invalid-email',
        telephone: '+229' + faker.string.numeric(8),
        password: 'Password123!',
        role: 'client'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.error).toContain('email');
    });
    
    it('devrait rejeter un mot de passe faible', async () => {
      const userData = {
        nom: faker.person.fullName(),
        email: faker.internet.email(),
        telephone: '+229' + faker.string.numeric(8),
        password: '123456', // Mot de passe faible
        role: 'client'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.error).toContain('mot de passe');
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('devrait connecter un utilisateur avec email/password', async () => {
      const email = faker.internet.email();
      const password = 'Password123!';
      const hashedPassword = '$2a$10$mockHashedPassword';
      
      // Mock user existant
      supabase.single.mockResolvedValueOnce({
        data: {
          id: faker.string.uuid(),
          email,
          password: hashedPassword,
          email_verified: true,
          role: 'client'
        },
        error: null
      });
      
      // Mock bcrypt compare
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValueOnce(true);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);
      
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(email);
    });
    
    it('devrait rejeter des identifiants incorrects', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: faker.internet.email(),
          password: 'WrongPassword'
        })
        .expect(401);
      
      expect(response.body.error).toContain('incorrects');
    });
    
    it('devrait avertir si email non vérifié', async () => {
      const email = faker.internet.email();
      
      supabase.single.mockResolvedValueOnce({
        data: {
          id: faker.string.uuid(),
          email,
          password: '$2a$10$mockHash',
          email_verified: false,
          role: 'client'
        },
        error: null
      });
      
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValueOnce(true);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Password123!' })
        .expect(200);
      
      expect(response.body.warning).toContain('non vérifié');
    });
  });
  
  describe('Protected Routes', () => {
    let authToken;
    const userId = faker.string.uuid();
    
    beforeEach(() => {
      // Créer un token valide pour les tests
      authToken = jwt.sign(
        { userId, role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });
    
    it('devrait accéder à une route protégée avec token valide', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { id: userId, role: 'client' },
        error: null
      });
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('id', userId);
    });
    
    it('devrait rejeter sans token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);
      
      expect(response.body.error).toContain('Token manquant');
    });
    
    it('devrait rejeter avec token invalide', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error).toContain('invalide');
    });
  });
});