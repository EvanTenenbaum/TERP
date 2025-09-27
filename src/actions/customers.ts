'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
        party: { select: { name: true, isActive: true } },
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

    const result = customers.map(c => ({
      ...c,
      displayName: c.party?.name ?? c.companyName
    }));

    return {
      success: true,
      customers: result
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
    const created = await prisma.$transaction(async (tx) => {
      const party = await tx.party.create({
        data: {
          name: data.companyName,
          isCustomer: true,
          isActive: true,
          contactInfo: (data as any).contactInfo || {}
        }
      });
      const customer = await tx.customer.create({
        data: {
          companyName: data.companyName,
          contactInfo: data.contactInfo,
          creditLimit: data.creditLimit,
          paymentTerms: data.paymentTerms,
          isActive: true,
          partyId: party.id
        }
      });
      return customer;
    });

    revalidatePath('/customers');

    return {
      success: true,
      customer: created
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
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { id: data.id }, select: { partyId: true } });
      let partyId = existing?.partyId || null;
      if (!partyId) {
        const party = await tx.party.create({ data: { name: data.companyName, isCustomer: true, isActive: true, contactInfo: (data as any).contactInfo || {} } });
        partyId = party.id;
      } else {
        await tx.party.update({ where: { id: partyId }, data: { name: data.companyName, contactInfo: (data as any).contactInfo || {} } });
      }
      const customer = await tx.customer.update({
        where: { id: data.id },
        data: {
          companyName: data.companyName,
          contactInfo: data.contactInfo,
          creditLimit: data.creditLimit,
          paymentTerms: data.paymentTerms,
          partyId
        }
      });
      return customer;
    });

    revalidatePath('/customers');
    revalidatePath(`/customers/${data.id}`);

    return {
      success: true,
      customer: updated
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
    // Soft delete by setting isActive to false and deactivate party if present
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { id }, select: { partyId: true } });
      if (existing?.partyId) {
        await tx.party.update({ where: { id: existing.partyId }, data: { isActive: false } });
      }
      return tx.customer.update({ where: { id }, data: { isActive: false } });
    });

    revalidatePath('/customers');

    return {
      success: true,
      customer: updated
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
        companyName: true,
        party: { select: { name: true } }
      },
      orderBy: { companyName: 'asc' }
    });

    const options = customers.map(c => ({ id: c.id, displayName: c.party?.name ?? c.companyName }))

    return {
      success: true,
      customers: options
    };
  } catch (error) {
    console.error('Error fetching customers for dropdown:', error);
    return {
      success: false,
      error: 'Failed to fetch customers'
    };
  }
}
