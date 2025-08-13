'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export interface CreateCustomerData {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  customerCode?: string;
}

export async function getCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        companyName: 'asc'
      }
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
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        salesQuotes: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        arInvoices: {
          orderBy: { createdAt: 'desc' },
          take: 10
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
    // Generate customer code if not provided
    if (!data.customerCode) {
      const count = await prisma.customer.count();
      data.customerCode = `CUST${String(count + 1).padStart(4, '0')}`;
    }

    // Check if customer code already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { customerCode: data.customerCode }
    });

    if (existingCustomer) {
      return {
        success: false,
        error: 'Customer code already exists'
      };
    }

    const customer = await prisma.customer.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        customerCode: data.customerCode,
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

export async function updateCustomer(id: string, data: Partial<CreateCustomerData>) {
  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    
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
    // Check if customer has any orders or quotes
    const customerWithRelations = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: true,
        salesQuotes: true,
        arInvoices: true
      }
    });

    if (!customerWithRelations) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    if (customerWithRelations.orders.length > 0 || 
        customerWithRelations.salesQuotes.length > 0 || 
        customerWithRelations.arInvoices.length > 0) {
      // Don't delete, just deactivate
      await prisma.customer.update({
        where: { id },
        data: { isActive: false }
      });
    } else {
      // Safe to delete
      await prisma.customer.delete({
        where: { id }
      });
    }

    revalidatePath('/customers');
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return {
      success: false,
      error: 'Failed to delete customer'
    };
  }
}

