
-- Cache table for Gmail messages so we only fetch + AI-analyze each email once
CREATE TABLE public.email_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_message_id TEXT NOT NULL UNIQUE,
  gmail_thread_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT,
  subject TEXT,
  snippet TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  -- AI analysis fields
  ai_summary TEXT,
  ai_intent TEXT, -- 'quote_accepted' | 'quote_declined' | 'question' | 'document_submission' | 'new_inquiry' | 'other'
  ai_draft_reply TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  -- Matching
  matched_submission_id UUID REFERENCES public.contact_submissions(id) ON DELETE SET NULL,
  match_confidence TEXT, -- 'high' | 'medium' | 'low' | 'none'
  -- Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_messages_received_at ON public.email_messages(received_at DESC);
CREATE INDEX idx_email_messages_from_email ON public.email_messages(from_email);
CREATE INDEX idx_email_messages_thread_id ON public.email_messages(gmail_thread_id);
CREATE INDEX idx_email_messages_matched_submission ON public.email_messages(matched_submission_id);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all emails"
  ON public.email_messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert emails"
  ON public.email_messages FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update emails"
  ON public.email_messages FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete emails"
  ON public.email_messages FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_messages_updated_at
  BEFORE UPDATE ON public.email_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add column to flag email-only submissions (created from an inbound email, not a form)
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS source_email_id UUID REFERENCES public.email_messages(id) ON DELETE SET NULL;
