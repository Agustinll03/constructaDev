CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cuit TEXT,
  razon_social TEXT,
  condicion_iva TEXT,
  address TEXT,
  phone TEXT,
  email TEXT NOT NULL,
  logo_url TEXT,
  brand_color TEXT,
  pdf_footer TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT,
  plan_contract_limit INTEGER,
  whatsapp_phone_number_id TEXT,
  whatsapp_access_token_enc TEXT,
  whatsapp_receipt_template_id TEXT,
  whatsapp_liquidation_template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tenants_slug_idx ON tenants(slug);
CREATE INDEX tenants_email_idx ON tenants(email);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_tenant" ON tenants
  FOR ALL USING (
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_tenant_idx ON profiles(tenant_id);
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE UNIQUE INDEX profiles_tenant_email_idx ON profiles(tenant_id, email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "admins_read_tenant_profiles" ON profiles
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- owners table
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dni_cuit TEXT,
  email TEXT,
  phone_whatsapp TEXT,
  cbu TEXT,
  bank_alias TEXT,
  notes TEXT,
  portal_last_access_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX owners_tenant_idx ON owners(tenant_id);
CREATE INDEX owners_email_idx ON owners(email);
CREATE INDEX owners_dni_cuit_idx ON owners(dni_cuit);

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_access_owners" ON owners
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- owner_magic_links table
CREATE TABLE IF NOT EXISTS owner_magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX owner_magic_links_tenant_idx ON owner_magic_links(tenant_id);
CREATE INDEX owner_magic_links_owner_idx ON owner_magic_links(owner_id);
CREATE INDEX owner_magic_links_token_idx ON owner_magic_links(token);
CREATE INDEX owner_magic_links_expires_at_idx ON owner_magic_links(expires_at);

ALTER TABLE owner_magic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_insert_magic_links" ON owner_magic_links
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND owner_id IN (SELECT id FROM owners WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "agency_users_read_magic_links" ON owner_magic_links
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "public_read_magic_link_by_token" ON owner_magic_links
  FOR SELECT USING (true);

-- tenants_table (renters/inquilinos)
CREATE TABLE IF NOT EXISTS tenants_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dni TEXT,
  email TEXT,
  phone_whatsapp TEXT,
  previous_address TEXT,
  guarantor_name TEXT,
  guarantor_dni TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tenants_table_tenant_idx ON tenants_table(tenant_id);
CREATE INDEX tenants_table_email_idx ON tenants_table(email);
CREATE INDEX tenants_table_dni_idx ON tenants_table(dni);

ALTER TABLE tenants_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_access_renters" ON tenants_table
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  street_address TEXT NOT NULL,
  unit TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  property_type TEXT,
  surface_m2 NUMERIC(8,2),
  cadastral_number TEXT,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX properties_tenant_idx ON properties(tenant_id);
CREATE INDEX properties_owner_idx ON properties(owner_id);
CREATE INDEX properties_status_idx ON properties(status);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_access_properties" ON properties
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES tenants_table(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_rent_amount NUMERIC(12,2) NOT NULL,
  current_rent_amount NUMERIC(12,2) NOT NULL,
  index_type TEXT,
  adjustment_frequency TEXT,
  next_adjustment_date DATE,
  commission_type TEXT,
  commission_value NUMERIC(8,4),
  commission_includes_vat BOOLEAN DEFAULT false,
  deposit_amount NUMERIC(12,2),
  special_clauses TEXT,
  status TEXT NOT NULL,
  accumulated_debt NUMERIC(12,2) DEFAULT 0,
  parent_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX contracts_tenant_idx ON contracts(tenant_id);
CREATE INDEX contracts_property_idx ON contracts(property_id);
CREATE INDEX contracts_renter_idx ON contracts(renter_id);
CREATE INDEX contracts_owner_idx ON contracts(owner_id);
CREATE INDEX contracts_status_idx ON contracts(status);
CREATE INDEX contracts_parent_idx ON contracts(parent_contract_id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_access_contracts" ON contracts
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- index_values table
CREATE TABLE IF NOT EXISTS index_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_type TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  coefficient NUMERIC(12,8) NOT NULL,
  source TEXT,
  source_reference TEXT,
  loaded_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX index_values_type_period_idx ON index_values(index_type, period_year, period_month);
CREATE INDEX index_values_loaded_by_idx ON index_values(loaded_by_profile_id);

ALTER TABLE index_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_index_values" ON index_values
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admins_insert_index_values" ON index_values
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admins_update_index_values" ON index_values
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- adjustments table
CREATE TABLE IF NOT EXISTS adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  index_value_id UUID NOT NULL REFERENCES index_values(id) ON DELETE RESTRICT,
  applied_at DATE NOT NULL,
  previous_rent NUMERIC(12,2) NOT NULL,
  coefficient_applied NUMERIC(12,8) NOT NULL,
  new_rent NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX adjustments_tenant_idx ON adjustments(tenant_id);
CREATE INDEX adjustments_contract_idx ON adjustments(contract_id);
CREATE INDEX adjustments_index_value_idx ON adjustments(index_value_id);
CREATE INDEX adjustments_applied_at_idx ON adjustments(applied_at);

ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_access_adjustments" ON adjustments
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- liquidations table
CREATE TABLE IF NOT EXISTS liquidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  rent_amount NUMERIC(12,2) NOT NULL,
  adjustment_applied BOOLEAN DEFAULT false,
  adjustment_id UUID REFERENCES adjustments(id) ON DELETE SET NULL,
  commission_amount NUMERIC(12,2),
  commission_vat NUMERIC(12,2),
  additional_expenses NUMERIC(12,2),
  net_to_owner NUMERIC(12,2),
  status TEXT NOT NULL,
  confirmed_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX liquidations_tenant_idx ON liquidations(tenant_id);
CREATE INDEX liquidations_contract_idx ON liquidations(contract_id);
CREATE INDEX liquidations_period_idx ON liquidations(period_year, period_month);
CREATE INDEX liquidations_adjustment_idx ON liquidations(adjustment_id);
CREATE INDEX liquidations_confirmed_by_idx ON liquidations(confirmed_by_profile_id);
CREATE INDEX liquidations_status_idx ON liquidations(status);

ALTER TABLE liquidations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_access_liquidations" ON liquidations
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  amount_due NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  balance_delta NUMERIC(12,2),
  accumulated_debt_after NUMERIC(12,2),
  notes TEXT,
  receipt_pdf_url TEXT,
  registered_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_tenant_idx ON payments(tenant_id);
CREATE INDEX payments_contract_idx ON payments(contract_id);
CREATE INDEX payments_period_idx ON payments(period_year, period_month);
CREATE INDEX payments_payment_date_idx ON payments(payment_date);
CREATE INDEX payments_registered_by_idx ON payments(registered_by_profile_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_access_payments" ON payments
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- document_deliveries table
CREATE TABLE IF NOT EXISTS document_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  channel TEXT NOT NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  status TEXT NOT NULL,
  whatsapp_message_id TEXT,
  error_detail TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  sent_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX document_deliveries_tenant_idx ON document_deliveries(tenant_id);
CREATE INDEX document_deliveries_document_idx ON document_deliveries(document_type, document_id);
CREATE INDEX document_deliveries_status_idx ON document_deliveries(status);
CREATE INDEX document_deliveries_sent_by_idx ON document_deliveries(sent_by_profile_id);
CREATE INDEX document_deliveries_sent_at_idx ON document_deliveries(sent_at);

ALTER TABLE document_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_users_access_deliveries" ON document_deliveries
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- audit_logs table (insert-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_tenant_idx ON audit_logs(tenant_id);
CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_profile_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "authenticated_users_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND actor_profile_id = auth.uid()
  );

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER tenants_updated_at_trigger
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER owners_updated_at_trigger
  BEFORE UPDATE ON owners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER owner_magic_links_updated_at_trigger
  BEFORE UPDATE ON owner_magic_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tenants_table_updated_at_trigger
  BEFORE UPDATE ON tenants_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER properties_updated_at_trigger
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER contracts_updated_at_trigger
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER index_values_updated_at_trigger
  BEFORE UPDATE ON index_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER adjustments_updated_at_trigger
  BEFORE UPDATE ON adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER liquidations_updated_at_trigger
  BEFORE UPDATE ON liquidations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER document_deliveries_updated_at_trigger
  BEFORE UPDATE ON document_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_logs_updated_at_trigger
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();