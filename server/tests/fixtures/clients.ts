/**
 * Test fixtures for clients
 */

import { InsertClient } from '../../../drizzle/schema';

export const testClients: InsertClient[] = [
  {
    teriCode: 'TEST001',
    name: 'Test Client 1',
    email: 'client1@test.com',
    phone: '555-0001',
    isBuyer: true,
    cogsAdjustmentType: 'NONE',
    cogsAdjustmentValue: '0',
  },
  {
    teriCode: 'TEST002',
    name: 'Test Client 2 - Percentage Discount',
    email: 'client2@test.com',
    phone: '555-0002',
    isBuyer: true,
    cogsAdjustmentType: 'PERCENTAGE',
    cogsAdjustmentValue: '10', // 10% discount
  },
  {
    teriCode: 'TEST003',
    name: 'Test Client 3 - Fixed Discount',
    email: 'client3@test.com',
    phone: '555-0003',
    isBuyer: true,
    cogsAdjustmentType: 'FIXED_AMOUNT',
    cogsAdjustmentValue: '2.50', // $2.50 discount
  },
];

