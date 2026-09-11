-- ============ Currency defaults: KES ============
ALTER TABLE public.organizations ALTER COLUMN currency SET DEFAULT 'KES';
ALTER TABLE public.plans ALTER COLUMN currency SET DEFAULT 'KES';
ALTER TABLE public.subscriptions ALTER COLUMN currency SET DEFAULT 'KES';
UPDATE public.organizations SET currency = 'KES' WHERE currency <> 'KES';
UPDATE public.plans SET currency = 'KES' WHERE currency <> 'KES';
UPDATE public.subscriptions SET currency = 'KES' WHERE currency <> 'KES';

-- ============ Invitations ============
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text,
  role public.app_role NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  invited_by_email text,
  message text,
  email_sent_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invitations_role_allowed CHECK (role IN ('client_admin','branch_manager','staff')),
  CONSTRAINT invitations_status_allowed CHECK (status IN ('pending','accepted','revoked'))
);

CREATE UNIQUE INDEX invitations_pending_email_idx
  ON public.invitations (organization_id, lower(email))
  WHERE status = 'pending';
CREATE INDEX invitations_email_idx ON public.invitations (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Managers = client_admin or branch_manager of that organization
CREATE OR REPLACE FUNCTION public.is_org_manager(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('client_admin','branch_manager')
  )
$$;
REVOKE ALL ON FUNCTION public.is_org_manager(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_manager(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Org members read their invitations"
  ON public.invitations FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Managers create invitations"
  ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_manager(auth.uid(), organization_id) AND role IN ('branch_manager','staff'));

CREATE POLICY "Managers update invitations"
  ON public.invitations FOR UPDATE TO authenticated
  USING (public.is_org_manager(auth.uid(), organization_id))
  WITH CHECK (public.is_org_manager(auth.uid(), organization_id));

CREATE POLICY "Managers delete invitations"
  ON public.invitations FOR DELETE TO authenticated
  USING (public.is_org_manager(auth.uid(), organization_id));

CREATE TRIGGER trg_invitations_updated
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public preview of an invite link (no PII beyond what the invitee already knows)
CREATE OR REPLACE FUNCTION public.invitation_preview(_token text)
RETURNS TABLE (organization_name text, email text, role public.app_role, expires_at timestamp with time zone, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.name, i.email, i.role, i.expires_at, i.status
  FROM public.invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = _token
$$;
REVOKE ALL ON FUNCTION public.invitation_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invitation_preview(text) TO anon, authenticated, service_role;

-- ============ Signup: honour invitations, never grant platform roles ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_org_name text;
  v_org_id uuid;
  v_slug text;
  v_starter uuid := '11111111-1111-4111-8111-111111111111';
  v_full_name text;
  v_email text;
  v_invite public.invitations%ROWTYPE;
BEGIN
  v_email := lower(COALESCE(NEW.email, ''));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(v_email, '@', 1));
  v_org_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'organization_name', '')), '');

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, COALESCE(NEW.email, ''), v_full_name);

  -- Bootstrap: the first ever user becomes the platform Super Admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    RETURN NEW;
  END IF;

  -- Invited teammate: join the inviting organization with the invited role
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE lower(email) = v_email AND status = 'pending' AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invite.id IS NOT NULL THEN
    UPDATE public.profiles
      SET organization_id = v_invite.organization_id,
          branch_id = v_invite.branch_id,
          full_name = COALESCE(NULLIF(v_full_name, ''), v_invite.full_name, v_full_name)
      WHERE id = NEW.id;

    INSERT INTO public.user_roles (user_id, role, organization_id, branch_id)
    VALUES (NEW.id, v_invite.role, v_invite.organization_id, v_invite.branch_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.invitations
      SET status = 'accepted', accepted_at = now()
      WHERE id = v_invite.id;

    RETURN NEW;
  END IF;

  -- Self-serve owner sign-up: create organization + trial subscription
  IF v_org_name IS NOT NULL THEN
    v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 6);
    INSERT INTO public.organizations (name, slug, owner_name, owner_email, status, currency, last_activity_at)
    VALUES (v_org_name, v_slug, v_full_name, COALESCE(NEW.email, ''), 'trial', 'KES', now())
    RETURNING id INTO v_org_id;

    INSERT INTO public.branches (organization_id, name) VALUES (v_org_id, 'Main Branch');

    INSERT INTO public.subscriptions (organization_id, plan_id, status, price, currency, trial_ends_at, renewal_at, payment_status)
    VALUES (v_org_id, v_starter, 'TRIAL', 0, 'KES', now() + interval '14 days', now() + interval '14 days', 'none');

    UPDATE public.profiles SET organization_id = v_org_id WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role, organization_id) VALUES (NEW.id, 'client_admin', v_org_id);
  END IF;

  RETURN NEW;
END; $function$;