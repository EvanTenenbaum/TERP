import prisma from '@/lib/prisma'

export async function createABCPlan(name: string) {
  const lots = await prisma.inventoryLot.findMany({ select: { id: true, quantityOnHand: true } })
  const sorted = lots.sort((a,b)=> Number(b.quantityOnHand) - Number(a.quantityOnHand))
  const aCount = Math.ceil(sorted.length * 0.2)
  const bCount = Math.ceil(sorted.length * 0.3)
  const aLots = sorted.slice(0, aCount)
  const bLots = sorted.slice(aCount, aCount + bCount)
  const cLots = sorted.slice(aCount + bCount)
  const plan = await prisma.cycleCountPlan.create({ data: { name, strategy: 'ABC' } } as any)
  const toTask = (l:any)=>({ planId: plan.id, lotId: l.id, expectedQty: Number(l.quantityOnHand) })
  await prisma.cycleCountTask.createMany({ data: [...aLots.map(toTask), ...bLots.map(toTask), ...cLots.map(toTask)] } as any)
  return plan.id
}

export async function submitCount(taskId: string, countedQty: number) {
  await prisma.cycleCountTask.update({ where: { id: taskId }, data: { countedQty, status: 'COUNTED' } } as any)
}

export async function applyDiscrepancy(taskId: string, reason='cycle_count') {
  await prisma.$transaction(async (tx) => {
    const t = await tx.cycleCountTask.findUnique({ where: { id: taskId } } as any)
    if (!t || t.countedQty === null) throw new Error('task_not_counted')
    const delta = Number(t.countedQty) - Number(t.expectedQty)
    if (delta !== 0) {
      await tx.inventoryLot.update({ where: { id: t.lotId }, data: { quantityOnHand: { increment: delta } } })
      await tx.writeOffLedger.create({ data: { lotId: t.lotId, qty: delta, reason, createdAt: new Date() } })
    }
    await tx.cycleCountTask.update({ where: { id: taskId }, data: { status: 'APPLIED' } } as any)
  })
}
