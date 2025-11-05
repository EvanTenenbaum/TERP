/**
 * Integration Tests for Clients Router
 * 
 * Tests all tRPC procedures in the clients router using the light scenario data.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../_core/router';
import { createContext } from '../_core/context';

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: 'test@terp.com',
  name: 'Test User',
};

// Create a test caller with mock context
const createCaller = () => {
  return appRouter.createCaller({
    user: mockUser,
    req: {} as any,
    res: {} as any,
  });
};

describe('Clients Router', () => {
  let caller: ReturnType<typeof createCaller>;
  let testClientId: number;

  beforeAll(() => {
    caller = createCaller();
  });

  describe('list', () => {
    it('should list clients with default pagination', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await caller.clients.list(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(50); // Default limit
    });

    it('should filter clients by search term', async () => {
      // Arrange
      const input = { search: 'Green' };

      // Act
      const result = await caller.clients.list(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // All results should match the search term
      result.forEach(client => {
        const matchesSearch = 
          client.name.toLowerCase().includes('green') ||
          client.teriCode.toLowerCase().includes('green');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter clients by type', async () => {
      // Arrange
      const input = { clientTypes: ['buyer' as const] };

      // Act
      const result = await caller.clients.list(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // All results should be buyers
      result.forEach(client => {
        expect(client.isBuyer).toBe(true);
      });
    });

    it('should respect pagination limits', async () => {
      // Arrange
      const input = { limit: 5, offset: 0 };

      // Act
      const result = await caller.clients.list(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('count', () => {
    it('should return total client count', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await caller.clients.count(input);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should return filtered count', async () => {
      // Arrange
      const input = { clientTypes: ['buyer' as const] };

      // Act
      const result = await caller.clients.count(input);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('create', () => {
    it('should create a new client', async () => {
      // Arrange
      const input = {
        teriCode: 'TEST001',
        name: 'Test Client Inc.',
        email: 'test@testclient.com',
        phone: '555-1234',
        address: '123 Test St',
        isBuyer: true,
        tags: ['test', 'integration'],
      };

      // Act
      const result = await caller.clients.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.teriCode).toBe(input.teriCode);
      expect(result.name).toBe(input.name);
      expect(result.email).toBe(input.email);
      expect(result.isBuyer).toBe(true);
      
      // Store for later tests
      testClientId = result.id;
    });

    it('should reject duplicate TERI codes', async () => {
      // Arrange
      const input = {
        teriCode: 'TEST001', // Same as above
        name: 'Duplicate Client',
      };

      // Act & Assert
      await expect(caller.clients.create(input)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should retrieve a client by ID', async () => {
      // Arrange
      const input = { clientId: testClientId };

      // Act
      const result = await caller.clients.getById(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testClientId);
      expect(result.teriCode).toBe('TEST001');
    });

    it('should return null for non-existent client', async () => {
      // Arrange
      const input = { clientId: 999999 };

      // Act
      const result = await caller.clients.getById(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getByTeriCode', () => {
    it('should retrieve a client by TERI code', async () => {
      // Arrange
      const input = { teriCode: 'TEST001' };

      // Act
      const result = await caller.clients.getByTeriCode(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.teriCode).toBe('TEST001');
      expect(result.id).toBe(testClientId);
    });

    it('should return null for non-existent TERI code', async () => {
      // Arrange
      const input = { teriCode: 'NONEXISTENT' };

      // Act
      const result = await caller.clients.getByTeriCode(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update client information', async () => {
      // Arrange
      const input = {
        clientId: testClientId,
        name: 'Updated Test Client Inc.',
        email: 'updated@testclient.com',
        isSeller: true,
      };

      // Act
      const result = await caller.clients.update(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.email).toBe(input.email);
      expect(result.isSeller).toBe(true);
    });

    it('should reject updates to non-existent clients', async () => {
      // Arrange
      const input = {
        clientId: 999999,
        name: 'Should Fail',
      };

      // Act & Assert
      await expect(caller.clients.update(input)).rejects.toThrow();
    });
  });

  describe('transactions', () => {
    let testTransactionId: number;

    describe('create', () => {
      it('should create a transaction for a client', async () => {
        // Arrange
        const input = {
          clientId: testClientId,
          transactionType: 'INVOICE' as const,
          transactionNumber: 'INV-TEST-001',
          transactionDate: new Date('2024-01-15'),
          amount: 1500.00,
          paymentStatus: 'PENDING' as const,
        };

        // Act
        const result = await caller.clients.transactions.create(input);

        // Assert
        expect(result).toBeDefined();
        expect(result.clientId).toBe(testClientId);
        expect(result.transactionType).toBe('INVOICE');
        expect(result.amount).toBe(1500.00);
        expect(result.paymentStatus).toBe('PENDING');
        
        testTransactionId = result.id;
      });
    });

    describe('list', () => {
      it('should list transactions for a client', async () => {
        // Arrange
        const input = { clientId: testClientId };

        // Act
        const result = await caller.clients.transactions.list(input);

        // Assert
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        // All transactions should belong to the client
        result.forEach(transaction => {
          expect(transaction.clientId).toBe(testClientId);
        });
      });

      it('should filter transactions by type', async () => {
        // Arrange
        const input = {
          clientId: testClientId,
          transactionType: 'INVOICE',
        };

        // Act
        const result = await caller.clients.transactions.list(input);

        // Assert
        expect(result).toBeDefined();
        result.forEach(transaction => {
          expect(transaction.transactionType).toBe('INVOICE');
        });
      });
    });

    describe('getById', () => {
      it('should retrieve a transaction by ID', async () => {
        // Arrange
        const input = { transactionId: testTransactionId };

        // Act
        const result = await caller.clients.transactions.getById(input);

        // Assert
        expect(result).toBeDefined();
        expect(result.id).toBe(testTransactionId);
        expect(result.transactionNumber).toBe('INV-TEST-001');
      });
    });

    describe('update', () => {
      it('should update transaction payment status', async () => {
        // Arrange
        const input = {
          transactionId: testTransactionId,
          paymentStatus: 'PAID' as const,
          paymentDate: new Date('2024-01-20'),
          paymentAmount: 1500.00,
        };

        // Act
        const result = await caller.clients.transactions.update(input);

        // Assert
        expect(result).toBeDefined();
        expect(result.paymentStatus).toBe('PAID');
        expect(result.paymentAmount).toBe(1500.00);
      });
    });
  });

  describe('delete', () => {
    it('should delete a client', async () => {
      // Arrange
      const input = { clientId: testClientId };

      // Act
      const result = await caller.clients.delete(input);

      // Assert
      expect(result).toBeDefined();
      
      // Verify client is deleted
      const deletedClient = await caller.clients.getById({ clientId: testClientId });
      expect(deletedClient).toBeNull();
    });
  });
});
