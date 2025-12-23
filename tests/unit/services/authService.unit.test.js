import authService from '../../../src/services/authService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { faker } from '@faker-js/faker';

/**
 * Tests unitaires pour le service d'authentification
 */
describe('AuthService', () => {
  
  describe('hashPassword', () => {
    it('devrait hasher un mot de passe correctement', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await authService.hashPassword(password);
      
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toHaveLength(60); // Longueur hash bcrypt
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });
    
    it('devrait générer des hashs différents pour le même mot de passe', async () => {
      const password = 'TestPassword123!';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('comparePassword', () => {
    it('devrait valider un mot de passe correct', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await authService.comparePassword(password, hash);
      expect(isValid).toBe(true);
    });
    
    it('devrait rejeter un mot de passe incorrect', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await authService.comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });
  
  describe('generateToken', () => {
    it('devrait générer un token JWT valide', () => {
      const userId = faker.string.uuid();
      const role = 'client';
      
      const token = authService.generateToken(userId, role);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Vérifier le contenu du token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe(role);
    });
    
    it('devrait inclure une expiration dans le token', () => {
      const userId = faker.string.uuid();
      const token = authService.generateToken(userId, 'vendor');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
  
  describe('verifyToken', () => {
    it('devrait valider un token correct', () => {
      const userId = faker.string.uuid();
      const token = jwt.sign(
        { userId, role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const decoded = authService.verifyToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe('client');
    });
    
    it('devrait rejeter un token expiré', () => {
      const token = jwt.sign(
        { userId: '123', role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Token expiré
      );
      
      expect(() => authService.verifyToken(token)).toThrow();
    });
    
    it('devrait rejeter un token avec une mauvaise signature', () => {
      const token = jwt.sign(
        { userId: '123', role: 'client' },
        'wrong-secret'
      );
      
      expect(() => authService.verifyToken(token)).toThrow();
    });
  });
  
  describe('generateOTP', () => {
    it('devrait générer un OTP de 6 chiffres', () => {
      const otp = authService.generateOTP();
      
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp).toHaveLength(6);
    });
    
    it('devrait générer des OTP différents', () => {
      const otps = new Set();
      for (let i = 0; i < 100; i++) {
        otps.add(authService.generateOTP());
      }
      
      // Avec 100 générations, on devrait avoir au moins 90 OTP uniques
      expect(otps.size).toBeGreaterThan(90);
    });
  });
});