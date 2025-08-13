'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export interface CreateCustomerData {
  companyName: string;
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
  };
  creditLimit?: number; // in cents
  paymentTerms?: string;
}

export interface UpdateCustomerData extends CreateCustomerData {
  id: string;
}

export async function getCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      include: {
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        salesQuotes: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            orders: true,
            salesQuotes: true,
            accountsReceivable: true
          }
        }
      },
      orderBy: { companyName: 'asc' }
    });

    return {
      success: true,
      customers
    };
  } catch (error) {
    console.error('Error fetching customers:', error);
    return {
      success: false,
      error: 'Failed to fetch customers'
    };
  }
}

export async function getCustomer(id: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' }
        },
        salesQuotes: {
          orderBy: { createdAt: 'desc' }
        },
        accountsReceivable: {
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        crmNotes: {
          include: {
            user: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    return {
      success: true,
      customer
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
    return {
      success: false,
      error: 'Failed to fetch customer'
    };
  }
}

export async function createCustomer(data: CreateCustomerData) {
  try {
    const customer = await prisma.customer.create({
      data: {
        companyName: data.companyName,
        contactInfo: data.contactInfo,
        creditLimit: data.creditLimit,
        paymentTerms: data.paymentTerms,
        isActive: true
      }
    });

    revalidatePath('/customers');
    
    return {
      success: true,
      customer
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    return {
      success: false,
      error: 'Failed to create customer'
    };
  }
}

export async function updateCustomer(data: UpdateCustomerData) {
  try {
    const customer = await prisma.customer.update({
      where: { id: data.id },
      data: {
        companyName: data.companyName,
        contactInfo: data.contactInfo,
        creditLimit: data.creditLimit,
        paymentTerms: data.paymentTerms
      }
    });

    revalidatePath('/customers');
    revalidatePath(`/customers/${data.id}`);
    
    return {
      success: true,
      customer
    };
  } catch (error) {
    console.error('Error updating customer:', error);
    return {
      success: false,
      error: 'Failed to update customer'
    };
  }
}

export async function deleteCustomer(id: string) {
  try {
    // Soft delete by setting isActive to false
    const customer = await prisma.customer.update({
      where: { id },
      data: { isActive: false }
    });

    revalidatePath('/customers');
    
    return {
      success: true,
      customer
    };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return {
      success: false,
      error: 'Failed to delete customer'
    };
  }
}

// Get customers for dropdowns (simplified)
export async function getCustomersForDropdown() {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        companyName: true
      },
      orderBy: { companyName: 'asc' }
    });

    return {
      success: true,
      customers
    };
  } catch (error) {
    console.error('Error fetching customers for dropdown:', error);
    return {
      success: false,
      error: 'Failed to fetch customers'
    };
  }
}

