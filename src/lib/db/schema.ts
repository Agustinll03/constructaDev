import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  date,
  inet,
  index,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// TENANTS (Root of multi-tenant model)
// ============================================================================

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    cuit: varchar('cuit', { length: 11 }),
    razonSocial: text('razon_social'),
    condicionIva: text('condicion_iva'),
    address: text('address'),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    logoUrl: text('logo_url'),
    brandColor: varchar('brand_color', { length: 7 }),
    pdfFooter: text('pdf_footer'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    plan: varchar('plan', { length: 50 }),
    planContractLimit: integer('plan_contract_limit'),
    whatsappPhoneNumberId: varchar('whatsapp_phone_number_id', { length: 255 }),
    whatsappAccessTokenEnc: text('whatsapp_access_token_enc'),
    whatsappReceiptTemplateId: varchar('whatsapp_receipt_template_id', { length: 255 }),
    whatsappLiquidationTemplateId: varchar('whatsapp_liquidation_template_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tenants_slug_idx').on(table.slug),
    uniqueIndex('tenants_cuit_idx').on(table.cuit),
  ],
)

export const tenantsRelations = relations(tenants, ({ many }) => ({
  profiles: many(profiles),
  owners: many(owners),
  ownerMagicLinks: many(ownerMagicLinks),
  tenantRecords: many(tenantsTable),
  properties: many(properties),
  contracts: many(contracts),
  adjustments: many(adjustments),
  liquidations: many(liquidations),
  payments: many(payments),
  documentDeliveries: many(documentDeliveries),
  auditLogs: many(auditLogs),
}))

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

// ============================================================================
// PROFILES (Internal agency users)
// ============================================================================

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    fullName: text('full_name').notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    index('profiles_tenant_id_idx').on(table.tenantId),
    uniqueIndex('profiles_tenant_email_idx').on(table.tenantId, table.email),
  ],
)

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [profiles.tenantId], references: [tenants.id] }),
  indexValuesLoaded: many(indexValues),
  liquidationsConfirmed: many(liquidations),
  paymentsRegistered: many(payments),
  documentDeliveries: many(documentDeliveries),
  auditLogs: many(auditLogs),
}))

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

// ============================================================================
// OWNERS (Property owners)
// ============================================================================

export const owners = pgTable(
  'owners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    fullName: text('full_name').notNull(),
    dniCuit: varchar('dni_cuit', { length: 11 }).notNull(),
    email: varchar('email', { length: 255 }),
    phoneWhatsapp: varchar('phone_whatsapp', { length: 20 }),
    cbu: varchar('cbu', { length: 22 }),
    bankAlias: varchar('bank_alias', { length: 24 }),
    notes: text('notes'),
    portalLastAccessAt: timestamp('portal_last_access_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    index('owners_tenant_id_idx').on(table.tenantId),
    uniqueIndex('owners_tenant_dni_cuit_idx').on(table.tenantId, table.dniCuit),
  ],
)

export const ownersRelations = relations(owners, ({ one, many }) => ({
  tenant: one(tenants, { fields: [owners.tenantId], references: [tenants.id] }),
  magicLinks: many(ownerMagicLinks),
  properties: many(properties),
  contracts: many(contracts),
}))

export type Owner = typeof owners.$inferSelect
export type NewOwner = typeof owners.$inferInsert

// ============================================================================
// OWNER MAGIC LINKS
// ============================================================================

export const ownerMagicLinks = pgTable(
  'owner_magic_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    ownerId: uuid('owner_id').notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.ownerId], foreignColumns: [owners.id] })
      .onDelete('cascade'),
    index('owner_magic_links_tenant_id_idx').on(table.tenantId),
    index('owner_magic_links_owner_id_idx').on(table.ownerId),
    uniqueIndex('owner_magic_links_token_idx').on(table.token),
  ],
)

export const ownerMagicLinksRelations = relations(ownerMagicLinks, ({ one }) => ({
  tenant: one(tenants, { fields: [ownerMagicLinks.tenantId], references: [tenants.id] }),
  owner: one(owners, { fields: [ownerMagicLinks.ownerId], references: [owners.id] }),
}))

export type OwnerMagicLink = typeof ownerMagicLinks.$inferSelect
export type NewOwnerMagicLink = typeof ownerMagicLinks.$inferInsert

// ============================================================================
// TENANTS TABLE (Renters/Locatarios)
// ============================================================================

export const tenantsTable = pgTable(
  'tenants_table',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    fullName: text('full_name').notNull(),
    dni: varchar('dni', { length: 8 }).notNull(),
    email: varchar('email', { length: 255 }),
    phoneWhatsapp: varchar('phone_whatsapp', { length: 20 }),
    previousAddress: text('previous_address'),
    guarantorName: text('guarantor_name'),
    guarantorDni: varchar('guarantor_dni', { length: 8 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    index('tenants_table_tenant_id_idx').on(table.tenantId),
    uniqueIndex('tenants_table_tenant_dni_idx').on(table.tenantId, table.dni),
  ],
)

export const tenantsTableRelations = relations(tenantsTable, ({ one, many }) => ({
  tenant: one(tenants, { fields: [tenantsTable.tenantId], references: [tenants.id] }),
  contracts: many(contracts),
  payments: many(payments),
}))

export type TenantRecord = typeof tenantsTable.$inferSelect
export type NewTenantRecord = typeof tenantsTable.$inferInsert

// ============================================================================
// PROPERTIES
// ============================================================================

export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    ownerId: uuid('owner_id').notNull(),
    streetAddress: text('street_address').notNull(),
    unit: varchar('unit', { length: 50 }),
    city: varchar('city', { length: 100 }),
    province: varchar('province', { length: 100 }),
    postalCode: varchar('postal_code', { length: 10 }),
    propertyType: varchar('property_type', { length: 50 }),
    surfaceM2: numeric('surface_m2', { precision: 8, scale: 2 }),
    cadastralNumber: varchar('cadastral_number', { length: 50 }),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.ownerId], foreignColumns: [owners.id] })
      .onDelete('restrict'),
    index('properties_tenant_id_idx').on(table.tenantId),
    index('properties_owner_id_idx').on(table.ownerId),
  ],
)

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  tenant: one(tenants, { fields: [properties.tenantId], references: [tenants.id] }),
  owner: one(owners, { fields: [properties.ownerId], references: [owners.id] }),
  contracts: many(contracts),
}))

export type Property = typeof properties.$inferSelect
export type NewProperty = typeof properties.$inferInsert

// ============================================================================
// CONTRACTS
// ============================================================================

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    propertyId: uuid('property_id').notNull(),
    renterId: uuid('renter_id').notNull(),
    ownerId: uuid('owner_id').notNull(),
    startDate: date('start_date', { mode: 'date' }).notNull(),
    endDate: date('end_date', { mode: 'date' }).notNull(),
    initialRentAmount: numeric('initial_rent_amount', { precision: 12, scale: 2 }).notNull(),
    currentRentAmount: numeric('current_rent_amount', { precision: 12, scale: 2 }).notNull(),
    indexType: varchar('index_type', { length: 50 }),
    adjustmentFrequency: varchar('adjustment_frequency', { length: 50 }),
    nextAdjustmentDate: date('next_adjustment_date', { mode: 'date' }),
    commissionType: varchar('commission_type', { length: 50 }),
    commissionValue: numeric('commission_value', { precision: 8, scale: 4 }),
    commissionIncludesVat: boolean('commission_includes_vat').default(false),
    depositAmount: numeric('deposit_amount', { precision: 12, scale: 2 }),
    specialClauses: text('special_clauses'),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    accumulatedDebt: numeric('accumulated_debt', { precision: 12, scale: 2 }).default('0'),
    parentContractId: uuid('parent_contract_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.propertyId], foreignColumns: [properties.id] })
      .onDelete('restrict'),
    foreignKey({ columns: [table.renterId], foreignColumns: [tenantsTable.id] })
      .onDelete('restrict'),
    foreignKey({ columns: [table.ownerId], foreignColumns: [owners.id] })
      .onDelete('restrict'),
    foreignKey({ columns: [table.parentContractId], foreignColumns: [contracts.id] })
      .onDelete('set null'),
    index('contracts_tenant_id_idx').on(table.tenantId),
    index('contracts_property_id_idx').on(table.propertyId),
    index('contracts_renter_id_idx').on(table.renterId),
    index('contracts_owner_id_idx').on(table.ownerId),
    index('contracts_start_date_idx').on(table.startDate),
  ],
)

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [contracts.tenantId], references: [tenants.id] }),
  property: one(properties, { fields: [contracts.propertyId], references: [properties.id] }),
  renter: one(tenantsTable, { fields: [contracts.renterId], references: [tenantsTable.id] }),
  owner: one(owners, { fields: [contracts.ownerId], references: [owners.id] }),
  parentContract: one(contracts, { fields: [contracts.parentContractId], references: [contracts.id] }),
  adjustments: many(adjustments),
  liquidations: many(liquidations),
  payments: many(payments),
}))

export type Contract = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert

// ============================================================================
// INDEX VALUES
// ============================================================================

export const indexValues = pgTable(
  'index_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    indexType: varchar('index_type', { length: 50 }).notNull(),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month').notNull(),
    coefficient: numeric('coefficient', { precision: 12, scale: 8 }).notNull(),
    source: varchar('source', { length: 100 }),
    sourceReference: text('source_reference'),
    loadedByProfileId: uuid('loaded_by_profile_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.loadedByProfileId], foreignColumns: [profiles.id] })
      .onDelete('set null'),
    index('index_values_index_type_idx').on(table.indexType),
    uniqueIndex('index_values_period_idx').on(table.indexType, table.periodYear, table.periodMonth),
  ],
)

export const indexValuesRelations = relations(indexValues, ({ one, many }) => ({
  loadedByProfile: one(profiles, { fields: [indexValues.loadedByProfileId], references: [profiles.id] }),
  adjustments: many(adjustments),
}))

export type IndexValue = typeof indexValues.$inferSelect
export type NewIndexValue = typeof indexValues.$inferInsert

// ============================================================================
// ADJUSTMENTS
// ============================================================================

export const adjustments = pgTable(
  'adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    contractId: uuid('contract_id').notNull(),
    indexValueId: uuid('index_value_id').notNull(),
    appliedAt: date('applied_at', { mode: 'date' }).notNull(),
    previousRent: numeric('previous_rent', { precision: 12, scale: 2 }).notNull(),
    coefficientApplied: numeric('coefficient_applied', { precision: 12, scale: 8 }).notNull(),
    newRent: numeric('new_rent', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.contractId], foreignColumns: [contracts.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.indexValueId], foreignColumns: [indexValues.id] })
      .onDelete('restrict'),
    index('adjustments_tenant_id_idx').on(table.tenantId),
    index('adjustments_contract_id_idx').on(table.contractId),
    index('adjustments_applied_at_idx').on(table.appliedAt),
  ],
)

export const adjustmentsRelations = relations(adjustments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [adjustments.tenantId], references: [tenants.id] }),
  contract: one(contracts, { fields: [adjustments.contractId], references: [contracts.id] }),
  indexValue: one(indexValues, { fields: [adjustments.indexValueId], references: [indexValues.id] }),
  liquidations: many(liquidations),
}))

export type Adjustment = typeof adjustments.$inferSelect
export type NewAdjustment = typeof adjustments.$inferInsert

// ============================================================================
// LIQUIDATIONS
// ============================================================================

export const liquidations = pgTable(
  'liquidations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    contractId: uuid('contract_id').notNull(),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month').notNull(),
    rentAmount: numeric('rent_amount', { precision: 12, scale: 2 }).notNull(),
    adjustmentApplied: boolean('adjustment_applied').default(false),
    adjustmentId: uuid('adjustment_id'),
    commissionAmount: numeric('commission_amount', { precision: 12, scale: 2 }),
    commissionVat: numeric('commission_vat', { precision: 12, scale: 2 }),
    additionalExpenses: numeric('additional_expenses', { precision: 12, scale: 2 }).default('0'),
    netToOwner: numeric('net_to_owner', { precision: 12, scale: 2 }),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    confirmedByProfileId: uuid('confirmed_by_profile_id'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    pdfUrl: text('pdf_url'),
    pdfGeneratedAt: timestamp('pdf_generated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.contractId], foreignColumns: [contracts.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.adjustmentId], foreignColumns: [adjustments.id] })
      .onDelete('set null'),
    foreignKey({ columns: [table.confirmedByProfileId], foreignColumns: [profiles.id] })
      .onDelete('set null'),
    index('liquidations_tenant_id_idx').on(table.tenantId),
    index('liquidations_contract_id_idx').on(table.contractId),
    index('liquidations_period_idx').on(table.periodYear, table.periodMonth),
    index('liquidations_status_idx').on(table.status),
  ],
)

export const liquidationsRelations = relations(liquidations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [liquidations.tenantId], references: [tenants.id] }),
  contract: one(contracts, { fields: [liquidations.contractId], references: [contracts.id] }),
  adjustment: one(adjustments, { fields: [liquidations.adjustmentId], references: [adjustments.id] }),
  confirmedByProfile: one(profiles, { fields: [liquidations.confirmedByProfileId], references: [profiles.id] }),
  documentDeliveries: many(documentDeliveries),
}))

export type Liquidation = typeof liquidations.$inferSelect
export type NewLiquidation = typeof liquidations.$inferInsert

// ============================================================================
// PAYMENTS
// ============================================================================

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    contractId: uuid('contract_id').notNull(),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month').notNull(),
    amountDue: numeric('amount_due', { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull(),
    paymentDate: date('payment_date', { mode: 'date' }).notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }),
    balanceDelta: numeric('balance_delta', { precision: 12, scale: 2 }).notNull(),
    accumulatedDebtAfter: numeric('accumulated_debt_after', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),
    receiptPdfUrl: text('receipt_pdf_url'),
    registeredByProfileId: uuid('registered_by_profile_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.contractId], foreignColumns: [contracts.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.registeredByProfileId], foreignColumns: [profiles.id] })
      .onDelete('set null'),
    index('payments_tenant_id_idx').on(table.tenantId),
    index('payments_contract_id_idx').on(table.contractId),
    index('payments_period_idx').on(table.periodYear, table.periodMonth),
    index('payments_payment_date_idx').on(table.paymentDate),
  ],
)

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [payments.tenantId], references: [tenants.id] }),
  contract: one(contracts, { fields: [payments.contractId], references: [contracts.id] }),
  registeredByProfile: one(profiles, { fields: [payments.registeredByProfileId], references: [profiles.id] }),
  documentDeliveries: many(documentDeliveries),
}))

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert

// ============================================================================
// DOCUMENT DELIVERIES
// ============================================================================

export const documentDeliveries = pgTable(
  'document_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    documentId: uuid('document_id').notNull(),
    channel: varchar('channel', { length: 50 }).notNull(),
    recipientPhone: varchar('recipient_phone', { length: 20 }),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    whatsappMessageId: varchar('whatsapp_message_id', { length: 255 }),
    errorDetail: text('error_detail'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    sentByProfileId: uuid('sent_by_profile_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.sentByProfileId], foreignColumns: [profiles.id] })
      .onDelete('set null'),
    index('document_deliveries_tenant_id_idx').on(table.tenantId),
    index('document_deliveries_document_type_idx').on(table.documentType),
    index('document_deliveries_status_idx').on(table.status),
  ],
)

export const documentDeliveriesRelations = relations(documentDeliveries, ({ one }) => ({
  tenant: one(tenants, { fields: [documentDeliveries.tenantId], references: [tenants.id] }),
  sentByProfile: one(profiles, { fields: [documentDeliveries.sentByProfileId], references: [profiles.id] }),
}))

export type DocumentDelivery = typeof documentDeliveries.$inferSelect
export type NewDocumentDelivery = typeof documentDeliveries.$inferInsert

// ============================================================================
// AUDIT LOGS
// ============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    actorProfileId: uuid('actor_profile_id'),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    payload: jsonb('payload'),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
      .onDelete('cascade'),
    foreignKey({ columns: [table.actorProfileId], foreignColumns: [profiles.id] })
      .onDelete('set null'),
    index('audit_logs_tenant_id_idx').on(table.tenantId),
    index('audit_logs_created_at_idx').on(table.createdAt),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  ],
)

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [auditLogs.tenantId], references: [tenants.id] }),
  actorProfile: one(profiles, { fields: [auditLogs.actorProfileId], references: [profiles.id] }),
}))

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert