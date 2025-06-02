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
import { djs } from 'faktorio-shared/src/djs'
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
    your_name: text('your_name').notNull(),
    your_street: text('your_street').notNull(),
    your_street2: text('your_street2'),
    your_city: text('your_city').notNull(),
    your_zip: text('your_zip').notNull(),
    your_country: text('your_country').notNull(),
    your_registration_no: text('your_registration_no').notNull(),
    your_vat_no: text('your_vat_no').notNull(),
    client_name: text('client_name').notNull(),
    client_street: text('client_street').notNull(),
    client_street2: text('client_street2'),
    client_city: text('client_city').notNull(),
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
    issued_on: text('issued_on')
      .notNull()
      .$defaultFn(() => djs().format('YYYY-MM-DD')), // Dates as text YYYY-MM-DD
    taxable_fulfillment_due: text('taxable_fulfillment_due').notNull(), // DUZP Dates as text YYYY-MM-DD
    due_in_days: integer('due_in_days').notNull(), // in days how long before the invoice is due
    due_on: text('due_on').notNull(), // Dates as text YYYY-MM-DD
    sent_at: text('sent_at'), // Dates as text YYYY-MM-DD
    paid_on: text('paid_on'), // Dates as text YYYY-MM-DD
    reminder_sent_at: text('reminder_sent_at'), // Dates as text YYYY-MM-DD
    cancelled_at: text('cancelled_at'), // Dates as text YYYY-MM-DD
    bank_account: text('bank_account'),
    iban: text('iban'),
    swift_bic: text('swift_bic'),
    payment_method: text('payment_method')
      .notNull()
      .$type<'bank' | 'cash' | 'card' | 'cod' | 'crypto' | 'other'>(),
    currency: text('currency').notNull(),
    exchange_rate: real('exchange_rate').notNull().default(1),
    language: text('language').notNull().default('cs'),
    transferred_tax_liability: integer('transferred_tax_liability', {
      mode: 'boolean'
    }),
    supply_code: text('supply_code'),
    /**
     * total amount of the invoice excluding VAT in the currency of the invoice
     */
    subtotal: real('subtotal'),
    /**
     * total amount of the invoice including VAT in the currency of the invoice
     */
    total: real('total').notNull(),
    /**
     * total amount of the invoice excluding VAT in CZK
     */
    native_subtotal: real('native_subtotal').notNull(),
    /**
     * total amount of the invoice including VAT in CZK
     */
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
      ),
      taxableFulfillmentDueIndex: index(
        'invoices_taxable_fulfillment_due_idx'
      ).on(invoices.taxable_fulfillment_due)
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
    default_invoice_due_in_days: integer('default_invoice_due_in_days'), // in days how long the invoice is due
    default_invoice_item_unit: text('default_invoice_item_unit'),
    currency: text('currency').default('CZK').notNull(),
    language: text('language').default('cs').notNull(),
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
    name: text('name').notNull(),
    street: text('street').notNull(),
    street2: text('street2'),
    city: text('city').notNull(),
    zip: text('zip').notNull(),
    country: text('country').notNull(),
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

export type UserSelectType = typeof userT.$inferSelect

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

export const receivedInvoiceTb = sqliteTable(
  'received_invoice',
  {
    id: text('id')
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    user_id: text('user_id').notNull(),

    // Supplier/vendor details
    supplier_contact_id: text('supplier_contact_id').references(
      () => contactTb.id
    ),
    supplier_name: text('supplier_name').notNull(),
    supplier_street: text('supplier_street'),
    supplier_street2: text('supplier_street2'),
    supplier_city: text('supplier_city'),
    supplier_zip: text('supplier_zip'),
    supplier_country: text('supplier_country'),
    supplier_registration_no: text('supplier_registration_no'),
    supplier_vat_no: text('supplier_vat_no'),
    supplier_email: text('supplier_email'),
    supplier_phone: text('supplier_phone'),

    // Invoice identification
    invoice_number: text('invoice_number').notNull(), // Supplier's invoice number
    internal_number: text('internal_number'), // Your internal reference number if needed
    variable_symbol: text('variable_symbol'), // Variable symbol for payment identification

    // Category/classification for accounting
    expense_category: text('expense_category'), // Categorization of expense type

    // Dates - following Czech accounting requirements
    issue_date: text('issue_date').notNull(), // Date invoice was issued
    taxable_supply_date: text('taxable_supply_date'), // DUZP - Date of taxable supply
    due_date: text('due_date').notNull(), // Payment due date
    receipt_date: text('receipt_date'), // Date when invoice was received
    payment_date: text('payment_date'), // Date when invoice was paid

    // Financial information
    total_without_vat: real('total_without_vat'), // Základ daně
    total_with_vat: real('total_with_vat').notNull(), // Total amount including VAT
    currency: text('currency').notNull().default('CZK'),
    exchange_rate: real('exchange_rate'),

    // VAT breakdown - required for Czech VAT reporting
    vat_base_21: real('vat_base_21'), // Základ daně 21%
    vat_21: real('vat_21'), // VAT amount at 21%
    vat_base_12: real('vat_base_12'), // snížená sazba daně 12%
    vat_12: real('vat_12'), // VAT amount at 12%

    vat_base_0: real('vat_base_0'), // Non-taxable amount (0%)

    // Special VAT handling
    reverse_charge: integer('reverse_charge', { mode: 'boolean' }), // Přenesená daňová povinnost
    vat_regime: text('vat_regime'), // Standard, non-VAT payer, special regime

    // Payment details
    payment_method: text('payment_method').$type<
      'bank' | 'cash' | 'card' | 'cod' | 'crypto' | 'other'
    >(),
    bank_account: text('bank_account'),
    iban: text('iban'),
    swift_bic: text('swift_bic'),

    // Invoice items stored as JSON
    items: text('items', { mode: 'json' }).$type<
      Array<{
        description?: string
        quantity?: number
        unit_price?: number
        unit?: string
        vat_rate?: number
        total_without_vat?: number
        total_with_vat?: number
        accounting_code?: string
      }>
    >(),
    line_items_summary: text('line_items_summary'),

    // Administrative fields
    status: text('status').notNull().default('received'), // received, verified, disputed, paid, etc.
    attachment_path: text('attachment_path'), // Path to scanned invoice/receipt
    notes: text('notes'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),

    // Tracking fields
    created_at: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at'),
    accounting_period: text('accounting_period') // Účetní období (YYYY-MM format)
  },
  (receivedInvoices) => {
    return {
      userIndex: index('received_invoices_user_idx').on(
        receivedInvoices.user_id
      ),
      taxableSupplyDateIndex: index(
        'received_invoices_taxable_supply_date_idx'
      ).on(receivedInvoices.taxable_supply_date),
      supplierContactIdIndex: index(
        'received_invoices_supplier_contact_id_idx'
      ).on(receivedInvoices.supplier_contact_id),
      invoiceNumberUserUniqueIndex: unique().on(
        receivedInvoices.user_id,
        receivedInvoices.supplier_name,
        receivedInvoices.invoice_number
      )
    }
  }
)
