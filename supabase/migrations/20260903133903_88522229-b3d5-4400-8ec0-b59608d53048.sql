-- ============================================================
-- SmartServe Foundation Schema
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('super_admin','platform_admin','client_admin','branch_manager','staff');
CREATE TYPE public.org_status AS ENUM ('active','trial','suspended','cancelled');
CREATE TYPE public.subscription_status AS ENUM ('TRIAL','ACTIVE','PAYMENT_DUE','GRACE_PERIOD','SUSPENDED','CANCELLED');
CREATE TYPE public.payment_status AS ENUM ('paid','due','failed','none');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- organizations ----------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  business_type text NOT NULL DEFAULT 'restaurant',
  owner_name text NOT NULL DEFAULT '',
  owner_email text NOT NULL DEFAULT '',
  phone text,
  country text DEFAULT 'KE',
  currency text NOT NULL DEFAULT 'KES',
  status public.org_status NOT NULL DEFAULT 'trial',
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- branches ----------
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_branches_org ON public.branches(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- user_roles ----------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, organization_id)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------- plans ----------
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  user_limit integer NOT NULL DEFAULT 5,
  branch_limit integer NOT NULL DEFAULT 1,
  table_limit integer NOT NULL DEFAULT 20,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- feature_flags ----------
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'core',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- ---------- plan_features ----------
CREATE TABLE public.plan_features (
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, feature_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_features TO authenticated;
GRANT ALL ON public.plan_features TO service_role;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- ---------- subscriptions ----------
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'TRIAL',
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz,
  renewal_at timestamptz,
  payment_status public.payment_status NOT NULL DEFAULT 'none',
  last_payment_at timestamptz,
  pending_plan_id uuid REFERENCES public.plans(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- organization_features ----------
CREATE TABLE public.organization_features (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'override',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, feature_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_features TO authenticated;
GRANT ALL ON public.organization_features TO service_role;
ALTER TABLE public.organization_features ENABLE ROW LEVEL SECURITY;

-- ---------- audit_logs ----------
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text NOT NULL,
  target_type text,
  target_id text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_org ON public.audit_logs(organization_id);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------- Future-ready module tables ----------
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 4,
  qr_code text,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2),
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  loyalty_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number text,
  status text NOT NULL DEFAULT 'pending',
  channel text NOT NULL DEFAULT 'pos',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  method text NOT NULL DEFAULT 'cash',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(12,3) NOT NULL DEFAULT 0,
  reorder_level numeric(12,3) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.staff_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['restaurant_tables','menu_categories','menu_items','customers','orders','order_items','payments','inventory_items','staff_activity'] LOOP
    EXECUTE format('CREATE INDEX idx_%I_org ON public.%I(organization_id)', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ============================================================
-- Security helper functions (SECURITY DEFINER, no recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','platform_admin'))
$$;

CREATE OR REPLACE FUNCTION public.user_org_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.belongs_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND organization_id = _org_id)
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'client_admin' AND organization_id = _org_id)
$$;

-- Effective feature access: org override wins, else plan default
CREATE OR REPLACE FUNCTION public.org_has_feature(_org_id uuid, _feature_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.organization_features WHERE organization_id = _org_id AND feature_key = _feature_key),
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      JOIN public.plan_features pf ON pf.plan_id = s.plan_id
      WHERE s.organization_id = _org_id AND pf.feature_key = _feature_key
        AND s.status NOT IN ('CANCELLED')
      ORDER BY s.created_at DESC LIMIT 1
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_org_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.belongs_to_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_has_feature(uuid, text) TO authenticated;

-- ============================================================
-- RLS Policies
-- ============================================================
-- organizations
CREATE POLICY "platform admins manage organizations" ON public.organizations FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "members view own organization" ON public.organizations FOR SELECT TO authenticated
  USING (public.belongs_to_org(auth.uid(), id));
CREATE POLICY "client admins update own organization" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), id)) WITH CHECK (public.is_org_admin(auth.uid(), id));

-- branches
CREATE POLICY "platform admins manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "members view own branches" ON public.branches FOR SELECT TO authenticated
  USING (public.belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "client admins manage own branches" ON public.branches FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id)) WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- profiles
CREATE POLICY "platform admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "members view org profiles" ON public.profiles FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "client admins manage org profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id));

-- user_roles
CREATE POLICY "platform admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "client admins view org roles" ON public.user_roles FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "client admins manage org staff roles" ON public.user_roles FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id) AND role IN ('branch_manager','staff'))
  WITH CHECK (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id) AND role IN ('branch_manager','staff'));

-- plans / feature_flags / plan_features
CREATE POLICY "authenticated read plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "authenticated read feature flags" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform admins manage feature flags" ON public.feature_flags FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "authenticated read plan features" ON public.plan_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform admins manage plan features" ON public.plan_features FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- subscriptions
CREATE POLICY "platform admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "members view own subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.belongs_to_org(auth.uid(), organization_id));

-- organization_features
CREATE POLICY "platform admins manage org features" ON public.organization_features FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "members view own org features" ON public.organization_features FOR SELECT TO authenticated
  USING (public.belongs_to_org(auth.uid(), organization_id));

-- audit_logs
CREATE POLICY "platform admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
CREATE POLICY "platform admins write audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()) AND actor_id = auth.uid());

-- future module tables: platform admins all, org members read, org admins manage
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['restaurant_tables','menu_categories','menu_items','customers','orders','order_items','payments','inventory_items','staff_activity'] LOOP
    EXECUTE format('CREATE POLICY "platform admins manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "members view own %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.belongs_to_org(auth.uid(), organization_id))', t);
    EXECUTE format('CREATE POLICY "client admins manage own %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_org_admin(auth.uid(), organization_id)) WITH CHECK (public.is_org_admin(auth.uid(), organization_id))', t);
  END LOOP;
END $$;

-- ============================================================
-- Seed: plans & feature flags
-- ============================================================
INSERT INTO public.feature_flags (key, name, description, category, sort_order) VALUES
  ('qr_menu','QR Menu','Contactless QR code menus for guests','ordering',1),
  ('waiter_mode','Waiter Mode','Waiter-side order taking on mobile','ordering',2),
  ('kds','Kitchen Display (KDS)','Real-time kitchen ticket screens','operations',3),
  ('analytics','Analytics','Sales and performance dashboards','insights',4),
  ('inventory','Inventory','Stock tracking and reorder alerts','operations',5),
  ('mpesa','M-Pesa','Mobile money payments integration','payments',6),
  ('multi_branch','Multi-Branch','Manage multiple locations under one account','platform',7),
  ('advanced_reports','Advanced Reports','Exportable, scheduled deep-dive reports','insights',8),
  ('ai_insights','AI Insights','Smart alerts and AI-generated recommendations','insights',9);

INSERT INTO public.plans (id, code, name, description, price_monthly, user_limit, branch_limit, table_limit, sort_order) VALUES
  ('11111111-1111-4111-8111-111111111111','starter','Starter','For single-location cafés and small restaurants',29,5,1,20,1),
  ('22222222-2222-4222-8222-222222222222','growth','Growth','For growing restaurants with busy floors',79,15,3,60,2),
  ('33333333-3333-4333-8333-333333333333','pro','Pro','For multi-branch operators and hotels',199,50,10,200,3),
  ('44444444-4444-4444-8444-444444444444','enterprise','Enterprise','Custom limits, SLAs and dedicated support',499,1000,100,2000,4);

INSERT INTO public.plan_features (plan_id, feature_key) VALUES
  ('11111111-1111-4111-8111-111111111111','qr_menu'),
  ('11111111-1111-4111-8111-111111111111','analytics'),
  ('22222222-2222-4222-8222-222222222222','qr_menu'),
  ('22222222-2222-4222-8222-222222222222','waiter_mode'),
  ('22222222-2222-4222-8222-222222222222','kds'),
  ('22222222-2222-4222-8222-222222222222','analytics'),
  ('22222222-2222-4222-8222-222222222222','mpesa'),
  ('22222222-2222-4222-8222-222222222222','multi_branch'),
  ('33333333-3333-4333-8333-333333333333','qr_menu'),
  ('33333333-3333-4333-8333-333333333333','waiter_mode'),
  ('33333333-3333-4333-8333-333333333333','kds'),
  ('33333333-3333-4333-8333-333333333333','analytics'),
  ('33333333-3333-4333-8333-333333333333','inventory'),
  ('33333333-3333-4333-8333-333333333333','mpesa'),
  ('33333333-3333-4333-8333-333333333333','multi_branch'),
  ('33333333-3333-4333-8333-333333333333','advanced_reports'),
  ('44444444-4444-4444-8444-444444444444','qr_menu'),
  ('44444444-4444-4444-8444-444444444444','waiter_mode'),
  ('44444444-4444-4444-8444-444444444444','kds'),
  ('44444444-4444-4444-8444-444444444444','analytics'),
  ('44444444-4444-4444-8444-444444444444','inventory'),
  ('44444444-4444-4444-8444-444444444444','mpesa'),
  ('44444444-4444-4444-8444-444444444444','multi_branch'),
  ('44444444-4444-4444-8444-444444444444','advanced_reports'),
  ('44444444-4444-4444-8444-444444444444','ai_insights');

-- ============================================================
-- Seed: demo client organizations
-- ============================================================
INSERT INTO public.organizations (id, name, slug, business_type, owner_name, owner_email, phone, status, last_activity_at, created_at) VALUES
  ('a0000000-0000-4000-8000-000000000001','Savanna Grill House','savanna-grill','restaurant','Amina Wanjiru','amina@savannagrill.co.ke','+254 712 345 001','active', now() - interval '2 hours', now() - interval '210 days'),
  ('a0000000-0000-4000-8000-000000000002','Blue Lagoon Beach Resort','blue-lagoon','hotel','David Otieno','david@bluelagoon.co.ke','+254 722 345 002','active', now() - interval '35 minutes', now() - interval '340 days'),
  ('a0000000-0000-4000-8000-000000000003','Kahawa Corner Café','kahawa-corner','cafe','Grace Njeri','grace@kahawacorner.com','+254 733 345 003','trial', now() - interval '1 day', now() - interval '9 days'),
  ('a0000000-0000-4000-8000-000000000004','The Copper Bar','copper-bar','bar','Brian Kipchoge','brian@copperbar.co.ke','+254 700 345 004','suspended', now() - interval '21 days', now() - interval '150 days'),
  ('a0000000-0000-4000-8000-000000000005','Nyama Choma Central','nyama-choma','restaurant','Peter Mwangi','peter@nyamachoma.co.ke','+254 711 345 005','active', now() - interval '4 hours', now() - interval '95 days'),
  ('a0000000-0000-4000-8000-000000000006','Lakeview Boutique Hotel','lakeview-hotel','hotel','Sarah Achieng','sarah@lakeviewhotel.com','+254 745 345 006','active', now() - interval '12 hours', now() - interval '400 days'),
  ('a0000000-0000-4000-8000-000000000007','Urban Bites Express','urban-bites','restaurant','James Kamau','james@urbanbites.co.ke','+254 756 345 007','trial', now() - interval '3 hours', now() - interval '4 days'),
  ('a0000000-0000-4000-8000-000000000008','Mombasa Spice Kitchen','mombasa-spice','restaurant','Fatma Hassan','fatma@mombasaspice.com','+254 767 345 008','active', now() - interval '6 days', now() - interval '60 days');

INSERT INTO public.branches (organization_id, name, city, address) VALUES
  ('a0000000-0000-4000-8000-000000000001','Westlands','Nairobi','Ring Road, Westlands'),
  ('a0000000-0000-4000-8000-000000000001','Karen','Nairobi','Karen Road'),
  ('a0000000-0000-4000-8000-000000000002','Main Resort','Diani','Diani Beach Road'),
  ('a0000000-0000-4000-8000-000000000002','Pool Bar','Diani','Diani Beach Road'),
  ('a0000000-0000-4000-8000-000000000002','Sunset Restaurant','Diani','Diani Beach Road'),
  ('a0000000-0000-4000-8000-000000000003','Kilimani','Nairobi','Argwings Kodhek Rd'),
  ('a0000000-0000-4000-8000-000000000004','CBD','Nairobi','Kimathi Street'),
  ('a0000000-0000-4000-8000-000000000005','Lavington','Nairobi','James Gichuru Rd'),
  ('a0000000-0000-4000-8000-000000000005','Thika Road','Nairobi','TRM Mall'),
  ('a0000000-0000-4000-8000-000000000006','Main Hotel','Kisumu','Oginga Odinga St'),
  ('a0000000-0000-4000-8000-000000000006','Rooftop Lounge','Kisumu','Oginga Odinga St'),
  ('a0000000-0000-4000-8000-000000000006','Garden Bistro','Kisumu','Oginga Odinga St'),
  ('a0000000-0000-4000-8000-000000000006','Conference Café','Kisumu','Oginga Odinga St'),
  ('a0000000-0000-4000-8000-000000000007','Ngong Road','Nairobi','Prestige Plaza'),
  ('a0000000-0000-4000-8000-000000000008','Nyali','Mombasa','Links Road');

INSERT INTO public.subscriptions (organization_id, plan_id, status, price, started_at, trial_ends_at, renewal_at, payment_status, last_payment_at) VALUES
  ('a0000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','ACTIVE',79, now() - interval '210 days', NULL, now() + interval '18 days','paid', now() - interval '12 days'),
  ('a0000000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333','ACTIVE',199, now() - interval '340 days', NULL, now() + interval '6 days','paid', now() - interval '24 days'),
  ('a0000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','TRIAL',0, now() - interval '9 days', now() + interval '5 days', now() + interval '5 days','none', NULL),
  ('a0000000-0000-4000-8000-000000000004','22222222-2222-4222-8222-222222222222','SUSPENDED',79, now() - interval '150 days', NULL, now() - interval '20 days','failed', now() - interval '50 days'),
  ('a0000000-0000-4000-8000-000000000005','22222222-2222-4222-8222-222222222222','PAYMENT_DUE',79, now() - interval '95 days', NULL, now() - interval '2 days','due', now() - interval '32 days'),
  ('a0000000-0000-4000-8000-000000000006','44444444-4444-4444-8444-444444444444','ACTIVE',499, now() - interval '400 days', NULL, now() + interval '41 days','paid', now() - interval '19 days'),
  ('a0000000-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111111','TRIAL',0, now() - interval '4 days', now() + interval '10 days', now() + interval '10 days','none', NULL),
  ('a0000000-0000-4000-8000-000000000008','11111111-1111-4111-8111-111111111111','GRACE_PERIOD',29, now() - interval '60 days', NULL, now() - interval '4 days','failed', now() - interval '34 days');

INSERT INTO public.organization_features (organization_id, feature_key, enabled, source) VALUES
  ('a0000000-0000-4000-8000-000000000002','ai_insights', true, 'override'),
  ('a0000000-0000-4000-8000-000000000001','inventory', true, 'override');

-- ============================================================
-- New user bootstrap trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_name text;
  v_org_id uuid;
  v_slug text;
  v_starter uuid := '11111111-1111-4111-8111-111111111111';
  v_full_name text;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''),'@',1));
  v_org_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'organization_name','')), '');

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, COALESCE(NEW.email,''), v_full_name);

  -- Bootstrap: the first ever user becomes the platform Super Admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    RETURN NEW;
  END IF;

  -- Self-serve client sign-up: create organization + trial subscription
  IF v_org_name IS NOT NULL THEN
    v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 6);
    INSERT INTO public.organizations (name, slug, owner_name, owner_email, status, last_activity_at)
    VALUES (v_org_name, v_slug, v_full_name, COALESCE(NEW.email,''), 'trial', now())
    RETURNING id INTO v_org_id;

    INSERT INTO public.branches (organization_id, name) VALUES (v_org_id, 'Main Branch');

    INSERT INTO public.subscriptions (organization_id, plan_id, status, price, trial_ends_at, renewal_at, payment_status)
    VALUES (v_org_id, v_starter, 'TRIAL', 0, now() + interval '14 days', now() + interval '14 days', 'none');

    UPDATE public.profiles SET organization_id = v_org_id WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role, organization_id) VALUES (NEW.id, 'client_admin', v_org_id);
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();