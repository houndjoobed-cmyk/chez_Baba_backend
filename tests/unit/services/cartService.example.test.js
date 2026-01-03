import { jest, describe, beforeAll, test, expect } from '@jest/globals';
import CartService from '../../../src/services/cartService.js';
import { supabase } from '../../../src/config/supabase.js';

describe('CartService - Basic Tests', () => {
    // CartService is imported as an instance by default
    const cartService = CartService;

    describe('addToCart', () => {
        test('should create cartService instance', () => {
            expect(cartService).toBeDefined();
            expect(typeof cartService.addToCart).toBe('function');
        });

        test('should validate input parameters', async () => {
            try {
                await cartService.addToCart(null, null, -1);
                fail('Should have thrown');
            } catch (error) {
                expect(error.message).toContain('invalide');
            }
        });

        test('should use RPC function', async () => {
            const rpcSpy = jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: { success: true }, error: null });

            try {
                await cartService.addToCart(
                    '550e8400-e29b-41d4-a716-446655440001',
                    '550e8400-e29b-41d4-a716-446655440002',
                    1
                );
            } catch (error) {
                // Expected if product doesn't exist
            }

            expect(rpcSpy).toHaveBeenCalledWith(
                'add_to_cart_atomic',
                expect.objectContaining({
                    p_user_id: expect.any(String),
                    p_product_id: expect.any(String),
                    p_quantity: 1
                })
            );

            rpcSpy.mockRestore();
        });
    });
});
