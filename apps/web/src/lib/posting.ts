import prisma from '@/lib/prisma';

async function getAccountIdByCode(code: string) {
  const a = await prisma.gLAccount.findFirst({ where: { code } as any });
  if (!a) throw new Error(`GL account ${code} not found`);
  return a.id;
}

/** AP Postings **/
export async function postAPInvoice(vendorInvoiceId: string, amountCents: number) {
  const apId = await getAccountIdByCode('2000');
  const j = await prisma.gLJournal.create({ data: { memo: `AP Invoice ${vendorInvoiceId}` } });
  await prisma.gLJournalLine.createMany({
    data: [
      { journalId: j.id, accountId: apId, creditCents: amountCents, entity: 'VendorInvoice', entityId: vendorInvoiceId },
    ]
  });
  return j.id;
}

export async function postAPPayment(vendorPaymentId: string, amountCents: number) {
  const cashId = await getAccountIdByCode('1000');
  const apId = await getAccountIdByCode('2000');
  const j = await prisma.gLJournal.create({ data: { memo: `AP Payment ${vendorPaymentId}` } });
  await prisma.gLJournalLine.createMany({
    data: [
      { journalId: j.id, accountId: cashId, creditCents: amountCents, entity: 'VendorPayment', entityId: vendorPaymentId },
      { journalId: j.id, accountId: apId, debitCents: amountCents, entity: 'VendorPayment', entityId: vendorPaymentId },
    ]
  });
  return j.id;
}

/** AR Postings **/
export async function postARInvoice(invoiceId: string, amountCents: number) {
  const arId = await getAccountIdByCode('1100');
  const j = await prisma.gLJournal.create({ data: { memo: `AR Invoice ${invoiceId}` } });
  await prisma.gLJournalLine.createMany({
    data: [
      { journalId: j.id, accountId: arId, debitCents: amountCents, entity: 'Invoice', entityId: invoiceId },
    ]
  });
  return j.id;
}

export async function postARPayment(paymentId: string, amountCents: number) {
  const cashId = await getAccountIdByCode('1000');
  const arId = await getAccountIdByCode('1100');
  const j = await prisma.gLJournal.create({ data: { memo: `AR Payment ${paymentId}` } });
  await prisma.gLJournalLine.createMany({
    data: [
      { journalId: j.id, accountId: cashId, debitCents: amountCents, entity: 'Payment', entityId: paymentId },
      { journalId: j.id, accountId: arId, creditCents: amountCents, entity: 'Payment', entityId: paymentId },
    ]
  });
  return j.id;
}
