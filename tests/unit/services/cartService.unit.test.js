import cartService from '../../../src/services/cartService.js';
import { supabase } from '../../../src/config/supabase.js';
import { faker } from '@faker-js/faker';

/**
 * Tests unitaires pour le service de panier
 */
describe('CartService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
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
      
      // Configuration des mocks
      supabase.from.mockReturnThis();
      supabase.select.mockReturnThis();
      supabase.eq.mockReturnThis();
      supabase.single.mockResolvedValue({ 
        data: mockProduct, 
        error: null 
      });
      
      supabase.insert.mockReturnThis();
      supabase.select.mockReturnThis();
      supabase.single.mockResolvedValue({
        data: {
          id: faker.string.uuid(),
          user_id: userId,
          product_id: productId,
          quantity: quantity
        },
        error: null
      });
      
      const result = await cartService.addToCart(userId, productId, quantity);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Produit ajouté au panier');
      expect(supabase.from).toHaveBeenCalledWith('products');
      expect(supabase.from).toHaveBeenCalledWith('carts');
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
      
      supabase.single.mockResolvedValue({ 
        data: mockProduct, 
        error: null 
      });
      
      await expect(
        cartService.addToCart(userId, productId, quantity)
      ).rejects.toThrow('Stock insuffisant');
    });
    
    it('devrait mettre à jour la quantité si le produit existe déjà', async () => {
      const userId = faker.string.uuid();
      const productId = faker.string.uuid();
      const existingQuantity = 2;
      const newQuantity = 3;
      
      const mockProduct = {
        id: productId,
        stock: 20,
        status: 'active',
        shops: { status: 'active' }
      };
      
      const mockExistingItem = {
        id: faker.string.uuid(),
        user_id: userId,
        product_id: productId,
        quantity: existingQuantity
      };
      
      // Premier appel pour récupérer le produit
      supabase.single.mockResolvedValueOnce({ 
        data: mockProduct, 
        error: null 
      });
      
      // Deuxième appel pour vérifier l'item existant
      supabase.single.mockResolvedValueOnce({ 
        data: mockExistingItem, 
        error: null 
      });
      
      // Update mock
      supabase.update.mockReturnThis();
      supabase.single.mockResolvedValueOnce({
        data: {
          ...mockExistingItem,
          quantity: existingQuantity + newQuantity
        },
        error: null
      });
      
      const result = await cartService.addToCart(userId, productId, newQuantity);
      
      expect(result.success).toBe(true);
      expect(supabase.update).toHaveBeenCalled();
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