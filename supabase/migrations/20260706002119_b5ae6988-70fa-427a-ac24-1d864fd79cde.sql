
-- Brand enum shared by all marketing tables
CREATE TYPE public.marketing_brand AS ENUM ('texas', 'bayer');
CREATE TYPE public.marketing_campaign_status AS ENUM ('draft', 'sending', 'sent', 'failed');
CREATE TYPE public.marketing_send_status AS ENUM ('pending', 'sent', 'failed', 'bounced', 'complained');

-- =========================
-- marketing_contacts
-- =========================
CREATE TABLE public.marketing_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand public.marketing_brand NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'csv_upload',
  csv_batch_id UUID,
  unsubscribed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX marketing_contacts_brand_email_idx
  ON public.marketing_contacts (brand, lower(email));
CREATE INDEX marketing_contacts_brand_idx ON public.marketing_contacts (brand);
CREATE INDEX marketing_contacts_unsub_idx ON public.marketing_contacts (unsubscribed_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_contacts TO authenticated;
GRANT ALL ON public.marketing_contacts TO service_role;

ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketing contacts"
  ON public.marketing_contacts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER marketing_contacts_updated_at
  BEFORE UPDATE ON public.marketing_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- marketing_campaigns
-- =========================
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand public.marketing_brand NOT NULL,
  name TEXT NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  body_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.marketing_campaign_status NOT NULL DEFAULT 'draft',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  total_opened INTEGER NOT NULL DEFAULT 0,
  total_clicked INTEGER NOT NULL DEFAULT 0,
  total_bounced INTEGER NOT NULL DEFAULT 0,
  total_unsubscribed INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX marketing_campaigns_brand_idx ON public.marketing_campaigns (brand, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketing campaigns"
  ON public.marketing_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- marketing_sends
-- =========================
CREATE TABLE public.marketing_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.marketing_contacts(id) ON DELETE SET NULL,
  brand public.marketing_brand NOT NULL,
  email TEXT NOT NULL,
  status public.marketing_send_status NOT NULL DEFAULT 'pending',
  resend_email_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX marketing_sends_campaign_idx ON public.marketing_sends (campaign_id);
CREATE INDEX marketing_sends_resend_id_idx ON public.marketing_sends (resend_email_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_sends TO authenticated;
GRANT ALL ON public.marketing_sends TO service_role;

ALTER TABLE public.marketing_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view marketing sends"
  ON public.marketing_sends FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================
-- marketing_unsubscribe_tokens
-- =========================
CREATE TABLE public.marketing_unsubscribe_tokens (
  token TEXT NOT NULL PRIMARY KEY,
  brand public.marketing_brand NOT NULL,
  email TEXT NOT NULL,
  contact_id UUID REFERENCES public.marketing_contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);
CREATE INDEX marketing_unsub_tokens_email_idx ON public.marketing_unsubscribe_tokens (brand, lower(email));

-- Unsubscribe tokens are read/written only by the edge functions (service role).
GRANT ALL ON public.marketing_unsubscribe_tokens TO service_role;
GRANT SELECT ON public.marketing_unsubscribe_tokens TO authenticated;

ALTER TABLE public.marketing_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view unsubscribe tokens"
  ON public.marketing_unsubscribe_tokens FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
