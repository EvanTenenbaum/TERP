import { allocateFIFOByProduct, shipAllocated } from '@/lib/inventoryAllocator'

import { allocateFIFOByProduct, shipAllocated } from '@/lib/inventoryAllocator'

describe('inventoryAllocator', () => {
  function makeDb(lots: any[]) {
    const state = new Map(lots.map((l)=> [l.id, { ...l }]))
    return {
      inventoryLot: {
        findMany: async ({ where, orderBy }: any) => {
          const arr = [...state.values()].filter((l)=> l.quantityAvailable > 0 && l.batch.productId === where.batch.productId)
          return arr.sort((a,b)=> (a.lastMovementDate.getTime()-b.lastMovementDate.getTime()) || (a.createdAt.getTime()-b.createdAt.getTime()))
        },
        updateMany: async ({ where, data }: any) => {
          const lot = state.get(where.id)
          if (!lot || lot.quantityAvailable < where.quantityAvailable.gte) return { count: 0 }
          lot.quantityAllocated += data.quantityAllocated.increment
          lot.quantityAvailable -= data.quantityAvailable.decrement
          lot.lastMovementDate = data.lastMovementDate
          return { count: 1 }
        },
        findUnique: async ({ where }: any) => state.get(where.id),
      }
    }
  }

  it.skip('allocates FIFO across lots', async () => {
    const productId = 'p1'
    const db = makeDb([
      { id: 'l1', batchId: 'b1', quantityAvailable: 3, quantityAllocated: 0, quantityOnHand: 3, lastMovementDate: new Date(1), createdAt: new Date(1), batch: { productId } },
      { id: 'l2', batchId: 'b2', quantityAvailable: 5, quantityAllocated: 0, quantityOnHand: 5, lastMovementDate: new Date(2), createdAt: new Date(2), batch: { productId } },
    ]) as any
    const res = await allocateFIFOByProduct(db, productId, 7)
    expect(res).toEqual([
      { lotId: 'l1', batchId: 'b1', qty: 3 },
      { lotId: 'l2', batchId: 'b2', qty: 4 },
    ])
  })

  it('ships allocated reduces onHand and allocated', async () => {
    const productId = 'p1'
    const state: any = {
      l1: { id: 'l1', batchId: 'b1', quantityAvailable: 0, quantityAllocated: 3, quantityOnHand: 3, lastMovementDate: new Date(), createdAt: new Date(), batch: { productId } },
    }
    const db: any = {
      inventoryLot: {
        updateMany: async ({ where, data }: any) => {
          const lot = state[where.id]
          if (!lot || lot.quantityOnHand < where.quantityOnHand.gte || lot.quantityAllocated < where.quantityAllocated.gte) return { count: 0 }
          lot.quantityOnHand -= data.quantityOnHand.decrement
          lot.quantityAllocated -= data.quantityAllocated.decrement
          lot.lastMovementDate = data.lastMovementDate
          return { count: 1 }
        }
      }
    }
    await shipAllocated(db, 'l1', 2)
    expect(state.l1.quantityOnHand).toBe(1)
    expect(state.l1.quantityAllocated).toBe(1)
  })
})
