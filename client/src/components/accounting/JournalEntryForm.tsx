import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AccountSelector } from "./AccountSelector";
import { AmountInput } from "./AmountInput";
import { FiscalPeriodSelector } from "./FiscalPeriodSelector";

const journalEntrySchema = z.object({
  entryDate: z.date({
    message: "Entry date is required",
  }),
  debitAccountId: z.number({
    message: "Debit account is required",
  }),
  creditAccountId: z.number({
    message: "Credit account is required",
  }),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  fiscalPeriodId: z.number({
    message: "Fiscal period is required",
  }),
  referenceType: z.string().optional(),
  referenceId: z.number().optional(),
});

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

interface JournalEntryFormProps {
  onSubmit: (data: JournalEntryFormData) => void | Promise<void>;
  onCancel?: () => void;
  defaultValues?: Partial<JournalEntryFormData>;
  isSubmitting?: boolean;
}

/**
 * JournalEntryForm - Form for posting double-entry journal entries
 * 
 * Features:
 * - Debit and credit account selection
 * - Amount input with validation
 * - Date picker for entry date
 * - Fiscal period selection
 * - Description field
 * - Optional reference type and ID
 * - Form validation with Zod
 */
export function JournalEntryForm({
  onSubmit,
  onCancel,
  defaultValues,
  isSubmitting = false,
}: JournalEntryFormProps) {
  const form = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entryDate: new Date(),
      amount: 0,
      description: "",
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: JournalEntryFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Entry Date */}
        <FormField
          control={form.control}
          name="entryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Entry Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fiscal Period */}
        <FormField
          control={form.control}
          name="fiscalPeriodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fiscal Period</FormLabel>
              <FormControl>
                <FiscalPeriodSelector
                  value={field.value}
                  onChange={field.onChange}
                  status="OPEN"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <AmountInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0.00"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Debit Account */}
        <FormField
          control={form.control}
          name="debitAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Debit Account</FormLabel>
              <FormControl>
                <AccountSelector
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select debit account..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Credit Account */}
        <FormField
          control={form.control}
          name="creditAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit Account</FormLabel>
              <FormControl>
                <AccountSelector
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select credit account..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter journal entry description..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

