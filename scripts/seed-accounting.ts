import { getDb } from "../server/db";
import { 
  accounts, 
  fiscalPeriods, 
  ledgerEntries,
  invoices,
  invoiceLineItems,
  bills,
  billLineItems,
  payments,
  bankAccounts,
  bankTransactions,
  expenses,
  expenseCategories
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seedAccounting() {
  console.log("🌱 Seeding accounting data...");
  const db = await getDb();

  try {
    // 1. Fiscal Periods
    console.log("Creating fiscal periods...");
    await db.insert(fiscalPeriods).values([
      {
        periodName: "Q1 2024",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
        fiscalYear: 2024,
        status: "CLOSED",
        closedAt: new Date("2024-04-01"),
        closedBy: 1,
      },
      {
        periodName: "Q2 2024",
        startDate: new Date("2024-04-01"),
        endDate: new Date("2024-06-30"),
        fiscalYear: 2024,
        status: "CLOSED",
        closedAt: new Date("2024-07-01"),
        closedBy: 1,
      },
      {
        periodName: "Q3 2024",
        startDate: new Date("2024-07-01"),
        endDate: new Date("2024-09-30"),
        fiscalYear: 2024,
        status: "CLOSED",
        closedAt: new Date("2024-10-01"),
        closedBy: 1,
      },
      {
        periodName: "Q4 2024",
        startDate: new Date("2024-10-01"),
        endDate: new Date("2024-12-31"),
        fiscalYear: 2024,
        status: "OPEN",
        closedAt: null,
        closedBy: null,
      },
    ]);

    // Fetch created periods
    const periodsList = await db.select().from(fiscalPeriods);
    const q4Period = periodsList.find(p => p.periodName === "Q4 2024");

    // 2. Chart of Accounts
    console.log("Creating chart of accounts...");
    await db.insert(accounts).values([
      // Assets
      { accountNumber: "1000", accountName: "Cash", accountType: "ASSET", parentAccountId: null, isActive: true },
      { accountNumber: "1100", accountName: "Accounts Receivable", accountType: "ASSET", parentAccountId: null, isActive: true },
      { accountNumber: "1200", accountName: "Inventory", accountType: "ASSET", parentAccountId: null, isActive: true },
      { accountNumber: "1500", accountName: "Equipment", accountType: "ASSET", parentAccountId: null, isActive: true },
      { accountNumber: "1600", accountName: "Accumulated Depreciation", accountType: "ASSET", parentAccountId: null, isActive: true },
      
      // Liabilities
      { accountNumber: "2000", accountName: "Accounts Payable", accountType: "LIABILITY", parentAccountId: null, isActive: true },
      { accountNumber: "2100", accountName: "Credit Card Payable", accountType: "LIABILITY", parentAccountId: null, isActive: true },
      { accountNumber: "2200", accountName: "Loans Payable", accountType: "LIABILITY", parentAccountId: null, isActive: true },
      { accountNumber: "2300", accountName: "Accrued Expenses", accountType: "LIABILITY", parentAccountId: null, isActive: true },
      
      // Equity
      { accountNumber: "3000", accountName: "Owner's Equity", accountType: "EQUITY", parentAccountId: null, isActive: true },
      { accountNumber: "3100", accountName: "Retained Earnings", accountType: "EQUITY", parentAccountId: null, isActive: true },
      
      // Revenue
      { accountNumber: "4000", accountName: "Sales Revenue", accountType: "REVENUE", parentAccountId: null, isActive: true },
      { accountNumber: "4100", accountName: "Service Revenue", accountType: "REVENUE", parentAccountId: null, isActive: true },
      { accountNumber: "4200", accountName: "Other Income", accountType: "REVENUE", parentAccountId: null, isActive: true },
      
      // Expenses
      { accountNumber: "5000", accountName: "Cost of Goods Sold", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6000", accountName: "Salaries Expense", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6100", accountName: "Rent Expense", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6200", accountName: "Utilities Expense", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6300", accountName: "Office Supplies", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6400", accountName: "Travel Expense", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6500", accountName: "Marketing Expense", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6600", accountName: "Insurance Expense", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6700", accountName: "Depreciation Expense", accountType: "EXPENSE", parentAccountId: null, isActive: true },
      { accountNumber: "6800", accountName: "Interest Expense", accountType: "EXPENSE", parentAccountId: null, isActive: true },
    ]);

    // Fetch created accounts
    const accountsList = await db.select().from(accounts);
    const cashAccount = accountsList.find(a => a.accountNumber === "1000");
    const arAccount = accountsList.find(a => a.accountNumber === "1100");
    const apAccount = accountsList.find(a => a.accountNumber === "2000");
    const revenueAccount = accountsList.find(a => a.accountNumber === "4000");
    const expenseAccount = accountsList.find(a => a.accountNumber === "6000");

    // 3. Bank Accounts
    console.log("Creating bank accounts...");
    await db.insert(bankAccounts).values([
      {
        accountName: "Primary Checking",
        accountNumber: "****1234",
        bankName: "First National Bank",
        accountType: "CHECKING",
        currentBalance: "125000.00",
        isActive: true,
      },
      {
        accountName: "Business Savings",
        accountNumber: "****5678",
        bankName: "First National Bank",
        accountType: "SAVINGS",
        currentBalance: "50000.00",
        isActive: true,
      },
      {
        accountName: "Business Credit Card",
        accountNumber: "****9012",
        bankName: "Chase Bank",
        accountType: "CREDIT_CARD",
        currentBalance: "-5000.00",
        isActive: true,
      },
    ]);

    // Fetch created bank accounts
    const bankAccountsList = await db.select().from(bankAccounts);

    // 4. Expense Categories
    console.log("Creating expense categories...");
    await db.insert(expenseCategories).values([
      { categoryName: "Travel", isActive: true },
      { categoryName: "Meals & Entertainment", isActive: true },
      { categoryName: "Office Supplies", isActive: true },
      { categoryName: "Software & Subscriptions", isActive: true },
      { categoryName: "Professional Services", isActive: true },
      { categoryName: "Marketing", isActive: true },
      { categoryName: "Training", isActive: true },
      { categoryName: "Miscellaneous", isActive: true },
    ]);

    // Fetch created categories
    const categories = await db.select().from(expenseCategories);

    // 5. Invoices (using existing customers from seed data)
    console.log("Creating invoices...");
    await db.insert(invoices).values([
      {
        invoiceNumber: "INV-2024-000001",
        customerId: 1,
        createdBy: 1,
        invoiceDate: new Date("2024-10-01"),
        dueDate: new Date("2024-10-31"),
        subtotal: "10000.00",
        taxAmount: "800.00",
        discountAmount: "0.00",
        totalAmount: "10800.00",
        amountPaid: "10800.00",
        amountDue: "0.00",
        status: "PAID",
        terms: "Net 30",
      },
      {
        invoiceNumber: "INV-2024-000002",
        customerId: 2,
        createdBy: 1,
        invoiceDate: new Date("2024-10-05"),
        dueDate: new Date("2024-11-04"),
        subtotal: "5000.00",
        taxAmount: "400.00",
        discountAmount: "0.00",
        totalAmount: "5400.00",
        amountPaid: "2700.00",
        amountDue: "2700.00",
        status: "PARTIAL",
        terms: "Net 30",
      },
      {
        invoiceNumber: "INV-2024-000003",
        customerId: 3,
        createdBy: 1,
        invoiceDate: new Date("2024-09-15"),
        dueDate: new Date("2024-10-15"),
        subtotal: "8000.00",
        taxAmount: "640.00",
        discountAmount: "0.00",
        totalAmount: "8640.00",
        amountPaid: "0.00",
        amountDue: "8640.00",
        status: "OVERDUE",
        terms: "Net 30",
      },
      {
        invoiceNumber: "INV-2024-000004",
        customerId: 1,
        createdBy: 1,
        invoiceDate: new Date("2024-10-15"),
        dueDate: new Date("2024-11-14"),
        subtotal: "12000.00",
        taxAmount: "960.00",
        discountAmount: "0.00",
        totalAmount: "12960.00",
        amountPaid: "0.00",
        amountDue: "12960.00",
        status: "SENT",
        terms: "Net 30",
      },
      {
        invoiceNumber: "INV-2024-000005",
        customerId: 2,
        createdBy: 1,
        invoiceDate: new Date("2024-10-20"),
        dueDate: new Date("2024-11-19"),
        subtotal: "6500.00",
        taxAmount: "520.00",
        discountAmount: "0.00",
        totalAmount: "7020.00",
        amountPaid: "0.00",
        amountDue: "7020.00",
        status: "SENT",
        terms: "Net 30",
      },
    ]);

    // Fetch created invoices
    const invoicesList = await db.select().from(invoices);

    // 6. Bills (using existing vendors from seed data)
    console.log("Creating bills...");
    await db.insert(bills).values([
      {
        billNumber: "BILL-2024-000001",
        vendorId: 1,
        createdBy: 1,
        billDate: new Date("2024-10-01"),
        dueDate: new Date("2024-10-31"),
        subtotal: "3000.00",
        taxAmount: "240.00",
        discountAmount: "0.00",
        totalAmount: "3240.00",
        amountPaid: "3240.00",
        amountDue: "0.00",
        status: "PAID",
        terms: "Net 30",
      },
      {
        billNumber: "BILL-2024-000002",
        vendorId: 2,
        createdBy: 1,
        billDate: new Date("2024-10-05"),
        dueDate: new Date("2024-11-04"),
        subtotal: "2000.00",
        taxAmount: "160.00",
        discountAmount: "0.00",
        totalAmount: "2160.00",
        amountPaid: "1080.00",
        amountDue: "1080.00",
        status: "PARTIAL",
        terms: "Net 30",
      },
      {
        billNumber: "BILL-2024-000003",
        vendorId: 3,
        createdBy: 1,
        billDate: new Date("2024-09-20"),
        dueDate: new Date("2024-10-20"),
        subtotal: "4500.00",
        taxAmount: "360.00",
        discountAmount: "0.00",
        totalAmount: "4860.00",
        amountPaid: "0.00",
        amountDue: "4860.00",
        status: "OVERDUE",
        terms: "Net 30",
      },
      {
        billNumber: "BILL-2024-000004",
        vendorId: 1,
        createdBy: 1,
        billDate: new Date("2024-10-15"),
        dueDate: new Date("2024-11-14"),
        subtotal: "1500.00",
        taxAmount: "120.00",
        discountAmount: "0.00",
        totalAmount: "1620.00",
        amountPaid: "0.00",
        amountDue: "1620.00",
        status: "PENDING",
        terms: "Net 30",
      },
    ]);

    // Fetch created bills
    const billsList = await db.select().from(bills);

    // 7. Payments
    console.log("Creating payments...");
    await db.insert(payments).values([
      {
        paymentNumber: "PMT-RCV-2024-000001",
        paymentType: "RECEIVED",
        createdBy: 1,
        paymentDate: new Date("2024-10-15"),
        amount: "10800.00",
        paymentMethod: "WIRE",
        customerId: 1,
        invoiceId: invoicesList[0]?.id,
        referenceNumber: "WIRE123456",
      },
      {
        paymentNumber: "PMT-RCV-2024-000002",
        paymentType: "RECEIVED",
        createdBy: 1,
        paymentDate: new Date("2024-10-20"),
        amount: "2700.00",
        paymentMethod: "CHECK",
        customerId: 2,
        invoiceId: invoicesList[1]?.id,
        referenceNumber: "CHK789",
      },
      {
        paymentNumber: "PMT-SNT-2024-000001",
        paymentType: "SENT",
        createdBy: 1,
        paymentDate: new Date("2024-10-10"),
        amount: "3240.00",
        paymentMethod: "ACH",
        vendorId: 1,
        billId: billsList[0]?.id,
        referenceNumber: "ACH456789",
      },
      {
        paymentNumber: "PMT-SNT-2024-000002",
        paymentType: "SENT",
        createdBy: 1,
        paymentDate: new Date("2024-10-18"),
        amount: "1080.00",
        paymentMethod: "CHECK",
        vendorId: 2,
        billId: billsList[1]?.id,
        referenceNumber: "CHK456",
      },
    ]);

    // 8. Bank Transactions
    console.log("Creating bank transactions...");
    await db.insert(bankTransactions).values([
      {
        bankAccountId: bankAccountsList[0]?.id,
        transactionDate: new Date("2024-10-01"),
        transactionType: "DEPOSIT",
        amount: "50000.00",
        description: "Initial capital deposit",
        isReconciled: true,
        reconciledDate: new Date("2024-10-05"),
      },
      {
        bankAccountId: bankAccountsList[0]?.id,
        transactionDate: new Date("2024-10-15"),
        transactionType: "DEPOSIT",
        amount: "10800.00",
        description: "Customer payment - INV-2024-000001",
        referenceNumber: "WIRE123456",
        isReconciled: true,
        reconciledDate: new Date("2024-10-16"),
      },
      {
        bankAccountId: bankAccountsList[0]?.id,
        transactionDate: new Date("2024-10-10"),
        transactionType: "WITHDRAWAL",
        amount: "3240.00",
        description: "Vendor payment - BILL-2024-000001",
        referenceNumber: "ACH456789",
        isReconciled: true,
        reconciledDate: new Date("2024-10-11"),
      },
      {
        bankAccountId: bankAccountsList[0]?.id,
        transactionDate: new Date("2024-10-05"),
        transactionType: "FEE",
        amount: "25.00",
        description: "Monthly account maintenance fee",
        isReconciled: true,
        reconciledDate: new Date("2024-10-06"),
      },
      {
        bankAccountId: bankAccountsList[1]?.id,
        transactionDate: new Date("2024-10-01"),
        transactionType: "TRANSFER",
        amount: "50000.00",
        description: "Transfer from checking",
        isReconciled: true,
        reconciledDate: new Date("2024-10-02"),
      },
    ]);

    // 9. Expenses
    console.log("Creating expenses...");
    await db.insert(expenses).values([
      {
        expenseNumber: "EXP-2024-000001",
        expenseDate: new Date("2024-10-05"),
        createdBy: 1,
        categoryId: categories[0]?.id, // Travel
        vendorId: 1,
        amount: "450.00",
        description: "Flight to client meeting",
        isReimbursable: true,
        isReimbursed: false,
      },
      {
        expenseNumber: "EXP-2024-000002",
        expenseDate: new Date("2024-10-08"),
        createdBy: 1,
        categoryId: categories[1]?.id, // Meals
        vendorId: 2,
        amount: "85.00",
        description: "Client dinner",
        isReimbursable: true,
        isReimbursed: true,
        reimbursedDate: new Date("2024-10-15"),
      },
      {
        expenseNumber: "EXP-2024-000003",
        expenseDate: new Date("2024-10-10"),
        createdBy: 1,
        categoryId: categories[2]?.id, // Office Supplies
        vendorId: 3,
        amount: "120.00",
        description: "Printer paper and toner",
        isReimbursable: false,
        isReimbursed: false,
      },
      {
        expenseNumber: "EXP-2024-000004",
        expenseDate: new Date("2024-10-12"),
        createdBy: 1,
        categoryId: categories[3]?.id, // Software
        vendorId: 1,
        amount: "99.00",
        description: "Monthly software subscription",
        isReimbursable: false,
        isReimbursed: false,
      },
      {
        expenseNumber: "EXP-2024-000005",
        expenseDate: new Date("2024-10-15"),
        createdBy: 1,
        categoryId: categories[0]?.id, // Travel
        vendorId: 2,
        amount: "200.00",
        description: "Hotel accommodation",
        isReimbursable: true,
        isReimbursed: false,
      },
    ]);

    // 10. Ledger Entries (Sample journal entries)
    console.log("Creating ledger entries...");
    if (cashAccount && arAccount && apAccount && revenueAccount && expenseAccount && q4Period) {
      await db.insert(ledgerEntries).values([
        // Initial capital
        {
          entryNumber: "JE-2024-000001",
          entryDate: new Date("2024-10-01"),
          accountId: cashAccount.id,
          debit: "50000.00",
          credit: "0.00",
          description: "Initial capital deposit",
          fiscalPeriodId: q4Period.id,
          status: "POSTED",
          isManual: true,
          createdBy: 1,
        },
        // Revenue recognition
        {
          entryNumber: "JE-2024-000002",
          entryDate: new Date("2024-10-01"),
          accountId: arAccount.id,
          debit: "10800.00",
          credit: "0.00",
          description: "Invoice INV-2024-000001",
          fiscalPeriodId: q4Period.id,
          status: "POSTED",
          referenceType: "INVOICE",
          referenceId: invoicesList[0]?.id,
          createdBy: 1,
        },
        {
          entryNumber: "JE-2024-000003",
          entryDate: new Date("2024-10-01"),
          accountId: revenueAccount.id,
          debit: "0.00",
          credit: "10800.00",
          description: "Invoice INV-2024-000001",
          fiscalPeriodId: q4Period.id,
          status: "POSTED",
          referenceType: "INVOICE",
          referenceId: invoicesList[0]?.id,
          createdBy: 1,
        },
        // Payment received
        {
          entryNumber: "JE-2024-000004",
          entryDate: new Date("2024-10-15"),
          accountId: cashAccount.id,
          debit: "10800.00",
          credit: "0.00",
          description: "Payment received - INV-2024-000001",
          fiscalPeriodId: q4Period.id,
          status: "POSTED",
          referenceType: "PAYMENT",
          createdBy: 1,
        },
        {
          entryNumber: "JE-2024-000005",
          entryDate: new Date("2024-10-15"),
          accountId: arAccount.id,
          debit: "0.00",
          credit: "10800.00",
          description: "Payment received - INV-2024-000001",
          fiscalPeriodId: q4Period.id,
          status: "POSTED",
          referenceType: "PAYMENT",
          createdBy: 1,
        },
      ]);
    }

    console.log("✅ Accounting seed data created successfully!");
  } catch (error) {
    console.error("❌ Error seeding accounting data:", error);
    throw error;
  }
}

// Run if called directly
seedAccounting()
  .then(() => {
    console.log("✅ Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });

export { seedAccounting };

