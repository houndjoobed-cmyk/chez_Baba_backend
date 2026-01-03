import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import cartService from '../../../src/services/cartService.js';
import { supabase } from '../../../src/config/supabase.js';
import { faker } from '@faker-js/faker';

// Manually mock Supabase methods since module mocking in ESM is tricky
// We overwrite the methods on the real instance (or whatever was imported)
supabase.from = jest.fn();
supabase.rpc = jest.fn();
supabase.select = jest.fn();
supabase.eq = jest.fn();
supabase.single = jest.fn();
supabase.insert = jest.fn();
supabase.update = jest.fn();
supabase.delete = jest.fn();

// Helper to reset the chainable mock
const setupSupabaseMock = () => {
  supabase.from.mockReturnValue(supabase);
  supabase.rpc.mockReturnValue(supabase);
  supabase.select.mockReturnValue(supabase);
  supabase.insert.mockReturnValue(supabase);
  supabase.update.mockReturnValue(supabase);
  supabase.delete.mockReturnValue(supabase);
  supabase.eq.mockReturnValue(supabase);
  // single returns a promise usually, but here we just need it to be a mock function we can configure per test
  supabase.single = jest.fn();
  return supabase;
};

/**
 * Tests unitaires pour le service de panier
 */
describe('CartService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    setupSupabaseMock();
  });

  describe('addToCart', () => {
    it('devrait ajouter un produit au panier', async () => {
      const userId = faker.string.uuid();
      const productId = faker.string.uuid();
      const quantity = 2;

      // Mock du produit
      const mockProduct = {
        id: productId,
        titre: 'Produit Test',
        prix: 1000,
        stock: 10,
        status: 'active',
        shop_id: faker.string.uuid(),
        shops: { status: 'active' }
      };

      // Mock RPC call response
      supabase.rpc.mockResolvedValue({
        data: {
          success: true,
          cart_id: faker.string.uuid()
        },
        error: null
      });

      const result = await cartService.addToCart(userId, productId, quantity);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Produit ajouté au panier');
      expect(supabase.rpc).toHaveBeenCalledWith(
        'add_to_cart_atomic',
        expect.objectContaining({
          p_user_id: userId,
          p_product_id: productId,
          p_quantity: quantity
        })
      );
    });

    it('devrait rejeter si le stock est insuffisant', async () => {
      const userId = faker.string.uuid();
      const productId = faker.string.uuid();
      const quantity = 15;

      const mockProduct = {
        id: productId,
        stock: 10,
        status: 'active',
        shops: { status: 'active' }
      };

      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'insufficient_stock' }
      });

      await expect(
        cartService.addToCart(userId, productId, quantity)
      ).rejects.toThrow('Stock insuffisant');
    });
  });

  describe('validateCart', () => {
    it('devrait valider un panier avec tous les produits disponibles', async () => {
      const userId = faker.string.uuid();
      const mockCartItems = [
        {
          product_id: faker.string.uuid(),
          product_name: 'Produit 1',
          quantity: 2,
          unit_price: 1000
        }
      ];

      // Mock getCart
      cartService.getCart = jest.fn().mockResolvedValue({
        items: mockCartItems,
        summary: { totalAmount: 2000 }
      });

      // Mock vérification produit
      supabase.single.mockResolvedValue({
        data: {
          stock: 10,
          prix: 1000,
          status: 'active'
        },
        error: null
      });

      const validation = await cartService.validateCart(userId);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.canCheckout).toBe(true);
    });

    it('devrait détecter les produits en rupture de stock', async () => {
      const userId = faker.string.uuid();
      const productId = faker.string.uuid();
      const mockCartItems = [
        {
          product_id: productId,
          product_name: 'Produit en rupture',
          quantity: 5,
          unit_price: 1000
        }
      ];

      cartService.getCart = jest.fn().mockResolvedValue({
        items: mockCartItems,
        summary: {}
      });

      // Produit avec stock insuffisant
      supabase.single.mockResolvedValue({
        data: {
          stock: 2,
          prix: 1000,
          status: 'active'
        },
        error: null
      });

      // Mock updateQuantity pour ajustement automatique
      cartService.updateQuantity = jest.fn().mockResolvedValue({});

      const validation = await cartService.validateCart(userId);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].issue).toContain('Stock insuffisant');
      expect(cartService.updateQuantity).toHaveBeenCalledWith(userId, productId, 2);
    });
  });

  describe('groupItemsByShop', () => {
    it('devrait grouper les items par boutique', () => {
      const shop1Id = faker.string.uuid();
      const shop2Id = faker.string.uuid();

      const items = [
        {
          shop_id: shop1Id,
          shop_name: 'Boutique 1',
          subtotal: 1000
        },
        {
          shop_id: shop1Id,
          shop_name: 'Boutique 1',
          subtotal: 2000
        },
        {
          shop_id: shop2Id,
          shop_name: 'Boutique 2',
          subtotal: 1500
        }
      ];

      const grouped = cartService.groupItemsByShop(items);

      expect(grouped).toHaveLength(2);
      expect(grouped[0].shopId).toBe(shop1Id);
      expect(grouped[0].subtotal).toBe(3000);
      expect(grouped[1].shopId).toBe(shop2Id);
      expect(grouped[1].subtotal).toBe(1500);
    });
  });
});