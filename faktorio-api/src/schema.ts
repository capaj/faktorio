import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  unique
} from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'
import { sql } from 'drizzle-orm'
// always add postfix Tb to table names

export const invoicesTb = sqliteTable(
  'invoice',
  {
    id: text('id')
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    user_id: text('user_id').notNull(),
    proforma: integer('proforma', { mode: 'boolean' }),
    partial_proforma: integer('partial_proforma', { mode: 'boolean' }),
    number: text('number').notNull(),
    variable_symbol: text('variable_symbol'),
    your_name: text('your_name'),
    your_street: text('your_street'),
    your_street2: text('your_street2'),
    your_city: text('your_city'),
    your_zip: text('your_zip'),
    your_country: text('your_country'),
    your_registration_no: text('your_registration_no'),
    your_vat_no: text('your_vat_no'),
    client_name: text('client_name'),
    client_street: text('client_street'),
    client_street2: text('client_street2'),
    client_city: text('client_city'),
    client_zip: text('client_zip'),
    client_country: text('client_country'),
    client_registration_no: text('client_registration_no'),
    client_vat_no: text('client_vat_no'),
    subject_id: integer('subject_id'),
    generator_id: integer('generator_id'),
    related_id: integer('related_id'),
    token: text('token'),
    status: text('status'),
    order_number: text('order_number'),
    issued_on: text('issued_on'), // Dates as text YYYY-MM-DD
    taxable_fulfillment_due: text('taxable_fulfillment_due'), // Dates as text YYYY-MM-DD
    due_in_days: integer('due_in_days').notNull(), // in days how long before the invoice is due
    due_on: text('due_on').notNull(), // Dates as text YYYY-MM-DD
    sent_at: text('sent_at'), // Dates as text YYYY-MM-DD
    paid_on: text('paid_on'), // Dates as text YYYY-MM-DD
    reminder_sent_at: text('reminder_sent_at'), // Dates as text YYYY-MM-DD
    cancelled_at: text('cancelled_at'), // Dates as text YYYY-MM-DD
    bank_account: text('bank_account'),
    iban: text('iban'),
    swift_bic: text('swift_bic'),
    payment_method: text('payment_method'),
    currency: text('currency').notNull(),
    exchange_rate: real('exchange_rate'),
    language: text('language'),
    transferred_tax_liability: integer('transferred_tax_liability', {
      mode: 'boolean'
    }),
    supply_code: text('supply_code'),
    subtotal: real('subtotal'),
    total: real('total').notNull(),
    native_subtotal: real('native_subtotal').notNull(),
    native_total: real('native_total'),
    remaining_amount: real('remaining_amount'),
    remaining_native_amount: real('remaining_native_amount'),
    paid_amount: real('paid_amount').notNull().default(0),
    note: text('note'),
    footer_note: text('footer_note'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    vat_base_21: real('vat_base_21'),
    vat_21: real('vat_21'),
    vat_base_15: real('vat_base_15'),
    vat_15: real('vat_15'),
    vat_base_12: real('vat_base_12'),
    vat_12: real('vat_12'),
    vat_base_10: real('vat_base_10'),
    vat_10: real('vat_10'),
    vat_base_0: real('vat_base_0'),
    private_note: text('private_note'),
    correction: integer('correction', { mode: 'boolean' }),
    correction_id: integer('correction_id'),
    client_email: text('client_email'),
    client_phone: text('client_phone'),
    custom_id: text('custom_id'),
    oss: integer('oss', { mode: 'boolean' }),
    tax_document: integer('tax_document', { mode: 'boolean' }),
    payment_method_human: text('payment_method_human'),
    created_at: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at'),
    published_at: text('published_at'), // published invoices are visible on a public secret URL so that the client can view and download them as PDF
    client_contact_id: text('client_contact_id')
      .notNull()
      .references(() => contactTb.id) // contact id used for this invoice
  },
  (invoices) => {
    return {
      numberUserUniqueIndex: unique().on(invoices.user_id, invoices.number),
      userIndex: index('invoices_user_idx').on(invoices.user_id),
      clientContactIdIndex: index('invoices_client_contact_id_idx').on(
        invoices.client_contact_id
      )
    }
  }
)

export const contactTb = sqliteTable(
  'contact',
  {
    id: text('id')
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    user_id: text('user_id').notNull(), // a single user can have multiple of these
    name: text('name').notNull(),
    full_name: text('full_name'),
    street: text('street'),
    street2: text('street2'),
    city: text('city'),
    zip: text('zip'),
    country: text('country'),
    registration_no: text('registration_no'),
    vat_no: text('vat_no'),
    bank_account: text('bank_account'),
    iban: text('iban'),
    web: text('web'),
    variable_symbol: text('variable_symbol'),
    phone_number: text('phone_number'),
    phone: text('phone'),
    main_email: text('main_email'),
    email: text('email'),
    email_copy: text('email_copy'),
    private_note: text('private_note'),
    type: text('type'),
    due: integer('due'), // in days how long the invoice is due
    currency: text('currency'),
    language: text('language'),
    created_at: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at')
  },
  (userInvoicingDetails) => {
    return {
      userIndex: index('contact_user_idx').on(userInvoicingDetails.user_id),
      nameUserUniqueIndex: unique().on(
        userInvoicingDetails.user_id,
        userInvoicingDetails.name
      )
    }
  }
)

export const userInvoicingDetailsTb = sqliteTable(
  'user_invoicing_detail',
  {
    user_id: text('user_id').notNull().unique().primaryKey(),
    name: text('name'),
    street: text('street'),
    street2: text('street2'),
    city: text('city'),
    zip: text('zip'),
    country: text('country'),
    main_email: text('main_email'),
    bank_account: text('bank_account'),
    iban: text('iban'),
    swift_bic: text('swift_bic'),
    vat_no: text('vat_no'),
    registration_no: text('registration_no'),
    created_at: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at'),
    phone_number: text('phone_number'),
    web_url: text('web_url')
  },
  (userInvoicingDetails) => {
    return {
      userIndex: index('user_invoicing_details_user_idx').on(
        userInvoicingDetails.user_id
      )
    }
  }
)

export const invoiceItemsTb = sqliteTable(
  'invoice_item',
  {
    id: integer('id').primaryKey().notNull(),
    order: integer('order'),
    invoice_id: text('invoice_id')
      .notNull()
      .references(() => invoicesTb.id, {
        onDelete: 'cascade'
      }),
    description: text('description'),
    quantity: real('quantity'),
    unit_price: real('unit_price'),
    unit: text('unit'),
    vat_rate: real('vat_rate'),
    created_at: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at')
  },
  (invoiceItems) => {
    return {
      uniqueIndex: unique().on(invoiceItems.invoice_id, invoiceItems.order),
      invoiceIndex: index('invoice_idx').on(invoiceItems.invoice_id)
    }
  }
)

export const userT = sqliteTable('users', {
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey()
    .notNull(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  pictureUrl: text('picture_url'),
  googleId: text('google_id').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`)
})

export const passwordResetTokenT = sqliteTable('password_reset_tokens', {
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey()
    .notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => userT.id, { onDelete: 'cascade' }),
  requestedFromIp: text('requested_from_ip').notNull(),
  token: text('token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  usedAt: integer('used_at', { mode: 'timestamp' })
})
