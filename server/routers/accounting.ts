import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as accountingDb from "../accountingDb";
import * as arApDb from "../arApDb";
import * as cashExpensesDb from "../cashExpensesDb";

export const accountingRouter = router({
    // Chart of Accounts
    accounts: router({
      list: protectedProcedure
        .input(z.object({
          accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]).optional(),
          isActive: z.boolean().optional(),
          parentAccountId: z.number().optional(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getAccounts(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await accountingDb.getAccountById(input.id);
        }),

      getByNumber: protectedProcedure
        .input(z.object({ accountNumber: z.string() }))
        .query(async ({ input }) => {
          return await accountingDb.getAccountByNumber(input.accountNumber);
        }),

      create: protectedProcedure
        .input(z.object({
          accountNumber: z.string(),
          accountName: z.string(),
          accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
          normalBalance: z.enum(["DEBIT", "CREDIT"]),
          description: z.string().optional(),
          parentAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.createAccount(input);
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          accountName: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await accountingDb.updateAccount(id, data);
        }),

      getBalance: protectedProcedure
        .input(z.object({
          accountId: z.number(),
          asOfDate: z.date(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getAccountBalance(input.accountId, input.asOfDate);
        }),

      getChartOfAccounts: protectedProcedure
        .query(async () => {
          return await accountingDb.getChartOfAccounts();
        }),
    }),

    // General Ledger
    ledger: router({
      list: protectedProcedure
        .input(z.object({
          accountId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          fiscalPeriodId: z.number().optional(),
          isPosted: z.boolean().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getLedgerEntries(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await accountingDb.getLedgerEntryById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          entryNumber: z.string(),
          entryDate: z.date(),
          accountId: z.number(),
          debit: z.string(),
          credit: z.string(),
          description: z.string(),
          fiscalPeriodId: z.number(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          isManual: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.createLedgerEntry({
            ...input,
            createdBy: ctx.user.id,
          });
        }),

      postJournalEntry: protectedProcedure
        .input(z.object({
          entryDate: z.date(),
          debitAccountId: z.number(),
          creditAccountId: z.number(),
          amount: z.number(),
          description: z.string(),
          fiscalPeriodId: z.number(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.postJournalEntry({
            ...input,
            createdBy: ctx.user.id,
          });
        }),

      getTrialBalance: protectedProcedure
        .input(z.object({
          fiscalPeriodId: z.number(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getTrialBalance(input.fiscalPeriodId);
        }),
    }),

    // Fiscal Periods
    fiscalPeriods: router({
      list: protectedProcedure
        .input(z.object({
          status: z.enum(["OPEN", "CLOSED", "LOCKED"]).optional(),
          year: z.number().optional(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getFiscalPeriods(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await accountingDb.getFiscalPeriodById(input.id);
        }),

      getCurrent: protectedProcedure
        .query(async () => {
          return await accountingDb.getCurrentFiscalPeriod();
        }),

      create: protectedProcedure
        .input(z.object({
          periodName: z.string(),
          startDate: z.date(),
          endDate: z.date(),
          fiscalYear: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.createFiscalPeriod(input);
        }),

      close: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.closeFiscalPeriod(input.id, ctx.user.id);
        }),

      lock: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await accountingDb.lockFiscalPeriod(input.id);
        }),

      reopen: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await accountingDb.reopenFiscalPeriod(input.id);
        }),
    }),

    // Invoices (Accounts Receivable)
    invoices: router({
      list: protectedProcedure
        .input(z.object({
          customerId: z.number().optional(),
          status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        }))
        .query(async ({ input }) => {
          return await arApDb.getInvoices(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getInvoiceById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          invoiceNumber: z.string(),
          customerId: z.number(),
          invoiceDate: z.date(),
          dueDate: z.date(),
          subtotal: z.string(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          lineItems: z.array(z.object({
            productId: z.number().optional(),
            batchId: z.number().optional(),
            description: z.string(),
            quantity: z.string(),
            unitPrice: z.string(),
            taxRate: z.string().optional(),
            discountPercent: z.string().optional(),
            lineTotal: z.string(),
          })),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const { lineItems, ...invoiceData } = input;
          // Calculate amountDue (initially equals totalAmount)
          const totalAmount = parseFloat(invoiceData.totalAmount);
          return await arApDb.createInvoice(
            { 
              ...invoiceData, 
              amountPaid: "0.00",
              amountDue: totalAmount.toFixed(2),
              createdBy: ctx.user.id 
            },
            lineItems
          );
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          invoiceDate: z.date().optional(),
          dueDate: z.date().optional(),
          subtotal: z.string().optional(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await arApDb.updateInvoice(id, data);
        }),

      updateStatus: protectedProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"]),
        }))
        .mutation(async ({ input }) => {
          return await arApDb.updateInvoiceStatus(input.id, input.status);
        }),

      recordPayment: protectedProcedure
        .input(z.object({
          invoiceId: z.number(),
          amount: z.number(),
        }))
        .mutation(async ({ input }) => {
          return await arApDb.recordInvoicePayment(input.invoiceId, input.amount);
        }),

      getOutstandingReceivables: protectedProcedure
        .query(async () => {
          return await arApDb.getOutstandingReceivables();
        }),

      getARAging: protectedProcedure
        .query(async () => {
          return await arApDb.calculateARAging();
        }),

      generateNumber: protectedProcedure
        .query(async () => {
          return await arApDb.generateInvoiceNumber();
        }),
    }),

    // Bills (Accounts Payable)
    bills: router({
      list: protectedProcedure
        .input(z.object({
          vendorId: z.number().optional(),
          status: z.enum(["DRAFT", "PENDING", "PARTIAL", "PAID", "OVERDUE", "VOID"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        }))
        .query(async ({ input }) => {
          return await arApDb.getBills(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getBillById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          billNumber: z.string(),
          vendorId: z.number(),
          billDate: z.date(),
          dueDate: z.date(),
          subtotal: z.string(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          lineItems: z.array(z.object({
            productId: z.number().optional(),
            lotId: z.number().optional(),
            description: z.string(),
            quantity: z.string(),
            unitPrice: z.string(),
            taxRate: z.string().optional(),
            discountPercent: z.string().optional(),
            lineTotal: z.string(),
          })),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const { lineItems, ...billData } = input;
          // Calculate amountDue (initially equals totalAmount)
          const totalAmount = parseFloat(billData.totalAmount);
          return await arApDb.createBill(
            { 
              ...billData, 
              amountPaid: "0.00",
              amountDue: totalAmount.toFixed(2),
              createdBy: ctx.user.id 
            },
            lineItems
          );
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          billDate: z.date().optional(),
          dueDate: z.date().optional(),
          subtotal: z.string().optional(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await arApDb.updateBill(id, data);
        }),

      updateStatus: protectedProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["DRAFT", "PENDING", "PARTIAL", "PAID", "OVERDUE", "VOID"]),
        }))
        .mutation(async ({ input }) => {
          return await arApDb.updateBillStatus(input.id, input.status);
        }),

      recordPayment: protectedProcedure
        .input(z.object({
          billId: z.number(),
          amount: z.number(),
        }))
        .mutation(async ({ input }) => {
          return await arApDb.recordBillPayment(input.billId, input.amount);
        }),

      getOutstandingPayables: protectedProcedure
        .query(async () => {
          return await arApDb.getOutstandingPayables();
        }),

      getAPAging: protectedProcedure
        .query(async () => {
          return await arApDb.calculateAPAging();
        }),

      generateNumber: protectedProcedure
        .query(async () => {
          return await arApDb.generateBillNumber();
        }),
    }),

    // Payments
    payments: router({
      list: protectedProcedure
        .input(z.object({
          paymentType: z.enum(["RECEIVED", "SENT"]).optional(),
          customerId: z.number().optional(),
          vendorId: z.number().optional(),
          invoiceId: z.number().optional(),
          billId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }))
        .query(async ({ input }) => {
          return await arApDb.getPayments(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getPaymentById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          paymentNumber: z.string(),
          paymentType: z.enum(["RECEIVED", "SENT"]),
          paymentDate: z.date(),
          amount: z.string(),
          paymentMethod: z.enum(["CASH", "CHECK", "WIRE", "ACH", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]),
          referenceNumber: z.string().optional(),
          customerId: z.number().optional(),
          vendorId: z.number().optional(),
          invoiceId: z.number().optional(),
          billId: z.number().optional(),
          bankAccountId: z.number().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await arApDb.createPayment({
            ...input,
            createdBy: ctx.user.id,
          });
        }),

      generateNumber: protectedProcedure
        .input(z.object({
          type: z.enum(["RECEIVED", "SENT"]),
        }))
        .query(async ({ input }) => {
          return await arApDb.generatePaymentNumber(input.type);
        }),

      getForInvoice: protectedProcedure
        .input(z.object({ invoiceId: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getPaymentsForInvoice(input.invoiceId);
        }),

      getForBill: protectedProcedure
        .input(z.object({ billId: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getPaymentsForBill(input.billId);
        }),
    }),

    // Bank Accounts
    bankAccounts: router({
      list: protectedProcedure
        .input(z.object({
          accountType: z.enum(["CHECKING", "SAVINGS", "MONEY_MARKET", "CREDIT_CARD"]).optional(),
          isActive: z.boolean().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankAccounts(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankAccountById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          accountName: z.string(),
          accountType: z.enum(["CHECKING", "SAVINGS", "MONEY_MARKET", "CREDIT_CARD"]),
          accountNumber: z.string(),
          bankName: z.string(),
          currentBalance: z.string().optional(),
          isActive: z.boolean().optional(),
          ledgerAccountId: z.number().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.createBankAccount(input);
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          accountName: z.string().optional(),
          currentBalance: z.string().optional(),
          isActive: z.boolean().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await cashExpensesDb.updateBankAccount(id, data);
        }),

      updateBalance: protectedProcedure
        .input(z.object({
          id: z.number(),
          newBalance: z.number(),
        }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.updateBankAccountBalance(input.id, input.newBalance);
        }),

      getTotalCashBalance: protectedProcedure
        .query(async () => {
          return await cashExpensesDb.getTotalCashBalance();
        }),
    }),

    // Bank Transactions
    bankTransactions: router({
      list: protectedProcedure
        .input(z.object({
          bankAccountId: z.number().optional(),
          transactionType: z.enum(["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "INTEREST"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          isReconciled: z.boolean().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankTransactions(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankTransactionById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          bankAccountId: z.number(),
          transactionDate: z.date(),
          transactionType: z.enum(["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "INTEREST"]),
          amount: z.string(),
          description: z.string().optional(),
          referenceNumber: z.string().optional(),
          paymentId: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.createBankTransaction(input);
        }),

      reconcile: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.reconcileBankTransaction(input.id);
        }),

      getUnreconciled: protectedProcedure
        .input(z.object({ bankAccountId: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getUnreconciledTransactions(input.bankAccountId);
        }),

      getBalanceAtDate: protectedProcedure
        .input(z.object({
          bankAccountId: z.number(),
          asOfDate: z.date(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankAccountBalanceAtDate(input.bankAccountId, input.asOfDate);
        }),
    }),

    // Expense Categories
    expenseCategories: router({
      list: protectedProcedure
        .input(z.object({
          isActive: z.boolean().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenseCategories(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenseCategoryById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          categoryName: z.string(),
          description: z.string().optional(),
          ledgerAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.createExpenseCategory(input);
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          categoryName: z.string().optional(),
          description: z.string().optional(),
          ledgerAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await cashExpensesDb.updateExpenseCategory(id, data);
        }),
    }),

    // Expenses
    expenses: router({
      list: protectedProcedure
        .input(z.object({
          categoryId: z.number().optional(),
          vendorId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenses(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenseById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          expenseNumber: z.string(),
          expenseDate: z.date(),
          categoryId: z.number(),
          vendorId: z.number().optional(),
          amount: z.string(),
          taxAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentMethod: z.enum(["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]),
          bankAccountId: z.number().optional(),
          description: z.string().optional(),
          receiptUrl: z.string().optional(),
          billId: z.number().optional(),
          isReimbursable: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await cashExpensesDb.createExpense({
            ...input,
            createdBy: ctx.user.id,
          });
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          expenseDate: z.date().optional(),
          categoryId: z.number().optional(),
          vendorId: z.number().optional(),
          amount: z.string().optional(),
          taxAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          description: z.string().optional(),
          receiptUrl: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await cashExpensesDb.updateExpense(id, data);
        }),

      markReimbursed: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.markExpenseReimbursed(input.id);
        }),

      getPendingReimbursements: protectedProcedure
        .query(async () => {
          return await cashExpensesDb.getPendingReimbursements();
        }),

      getBreakdownByCategory: protectedProcedure
        .input(z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenseBreakdownByCategory(input.startDate, input.endDate);
        }),

      getTotalExpenses: protectedProcedure
        .input(z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getTotalExpenses(input.startDate, input.endDate);
        }),

      generateNumber: protectedProcedure
        .query(async () => {
          return await cashExpensesDb.generateExpenseNumber();
        }),
    }),
  })
