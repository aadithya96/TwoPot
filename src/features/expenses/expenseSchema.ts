import { z } from 'zod'

/** Validation schema for the add/edit expense form. */
export const expenseSchema = z
  .object({
    amount: z.number().int().positive(),
    categoryId: z.string().nullable(),
    date: z.string().min(1),
    paidBy: z.string().uuid(),
    owner: z.enum(['shared', 'personal']),
    personalUserId: z.string().nullable(),
    splitType: z.enum(['equal', 'custom', 'payer_covers']),
    splitPctA: z.number().min(0).max(100).nullable(),
    description: z.string().min(1, 'Description is required'),
    notes: z.string().nullable(),
    isRecurring: z.boolean(),
    receiptUrl: z.string().nullable(),
  })
  .refine((data) => data.owner !== 'personal' || Boolean(data.personalUserId), {
    message: 'Select who this personal expense belongs to',
    path: ['personalUserId'],
  })
  .refine((data) => data.splitType !== 'custom' || data.splitPctA !== null, {
    message: 'Set a custom split percentage',
    path: ['splitPctA'],
  })

/** Inferred form values for the add/edit expense form. */
export type ExpenseFormValues = z.infer<typeof expenseSchema>
