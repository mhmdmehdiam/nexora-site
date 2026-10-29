import { z } from 'zod'

/**
 * Central request-validation schemas (Zod).
 *
 * Every mutating API route parses its body through one of these BEFORE any
 * business logic runs. Money/quantity fields stay `unknown` here on purpose:
 * they are coerced and validated by src/lib/money.ts (Persian digits,
 * grouping separators, integer rounding) which is stricter than any regex.
 */

const email = z
  .string({ error: 'ایمیل الزامی است' })
  .trim()
  .toLowerCase()
  .email('ایمیل معتبر نیست')
  .max(120, 'ایمیل بیش از حد طولانی است')

/** Password policy: ≥8 chars, at least one letter and one digit. */
export const password = z
  .string({ error: 'رمز عبور الزامی است' })
  .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
  .max(72, 'رمز عبور بیش از حد طولانی است')
  .regex(/[a-zA-Zآ-ی]/, 'رمز عبور باید حداقل یک حرف داشته باشد')
  .regex(/\d/, 'رمز عبور باید حداقل یک رقم داشته باشد')

const shortText = (label: string, min = 1, max = 80) =>
  z
    .string({ error: `${label} الزامی است` })
    .trim()
    .min(min, `${label} باید حداقل ${min} کاراکتر باشد`)
    .max(max, `${label} بیش از حد طولانی است`)

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `متن بیش از حد طولانی است (حداکثر ${max})`)
    .optional()
    .or(z.literal(''))

const phone = z
  .string()
  .trim()
  .max(20, 'شماره تماس معتبر نیست')
  .regex(/^[+\d][\d\s-]*$/, 'شماره تماس معتبر نیست')
  .optional()
  .or(z.literal(''))

/** Money-ish input — final coercion happens in money.ts. */
const money = z.unknown()

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'رمز عبور الزامی است' }).min(1, 'رمز عبور الزامی است').max(200),
})

export const registerSchema = z.object({
  businessName: shortText('نام کسب‌وکار', 2, 80),
  ownerName: shortText('نام مدیر', 2, 60),
  email,
  password,
  phone,
  industry: z.string().max(40).optional().or(z.literal('')),
})

export const customerSchema = z.object({
  name: shortText('نام مشتری', 1, 80),
  email: z.string().trim().max(120).optional().or(z.literal('')),
  phone,
  address: optionalText(300),
  city: optionalText(60),
  notes: optionalText(1000),
  tags: z.array(z.string().max(30)).max(10).optional(),
})

export const productSchema = z.object({
  name: shortText('نام محصول', 1, 80),
  sku: optionalText(40),
  description: optionalText(2000),
  category: optionalText(40),
  price: money,
  cost: money.optional(),
  stock: money.optional(),
  minStock: money.optional(),
  unit: z.string().max(20).optional(),
})

export const saleItemSchema = z.object({
  productId: z.string().min(1, 'انتخاب کالا الزامی است').max(64),
  quantity: money,
  unitPrice: money,
  discount: money.optional(),
})

export const saleSchema = z.object({
  customerId: z.string().min(1, 'انتخاب مشتری الزامی است').max(64),
  items: z.array(saleItemSchema).min(1, 'حداقل یک قلم کالا لازم است').max(50, 'حداکثر ۵۰ ردیف'),
  discount: money.optional(),
  paidAmount: money.optional(),
  paymentMethod: z.string().max(20).optional(),
  notes: optionalText(500),
})

export const invoiceSchema = z.object({
  customerId: z.string().min(1, 'انتخاب مشتری الزامی است').max(64),
  items: z
    .array(
      saleItemSchema.extend({
        description: optionalText(200),
      })
    )
    .min(1, 'حداقل یک قلم کالا لازم است')
    .max(50, 'حداکثر ۵۰ ردیف'),
  dueDate: z.string({ error: 'تاریخ سررسید الزامی است' }).min(1, 'تاریخ سررسید الزامی است'),
  paidAmount: money.optional(),
  saleId: z.string().max(64).optional().nullable(),
  notes: optionalText(500),
})

export const reminderSchema = z.object({
  customerId: z.string().min(1, 'انتخاب مشتری الزامی است').max(64),
  amount: money,
  description: z
    .string({ error: 'توضیحات الزامی است' })
    .min(1, 'توضیحات الزامی است')
    .max(300, 'توضیحات بیش از حد طولانی است'),
  dueDate: z.string({ error: 'تاریخ الزامی است' }).min(1),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.string().max(20).optional().nullable(),
})

export const smsSchema = z.object({
  customerId: z.string().min(1, 'انتخاب مشتری الزامی است').max(64),
  phone: z
    .string()
    .trim()
    .min(4, 'شماره تماس معتبر نیست')
    .max(20, 'شماره تماس معتبر نیست')
    .regex(/^[+\d][\d\s-]*$/, 'شماره تماس معتبر نیست'),
  message: z
    .string({ error: 'متن پیام الزامی است' })
    .min(1, 'متن پیام الزامی است')
    .max(500, 'پیام حداکثر ۵۰۰ کاراکتر است'),
})

/** External image URLs (cover images) must be http(s) — blocks javascript:/data: URIs. */
export const imageUrl = z
  .string()
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v), 'آدرس تصویر باید با http یا https شروع شود')
  .optional()
  .nullable()
  .or(z.literal(''))

/** First human-readable error from a Zod result, for the API error body. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message || 'داده‌های ورودی معتبر نیست'
}
