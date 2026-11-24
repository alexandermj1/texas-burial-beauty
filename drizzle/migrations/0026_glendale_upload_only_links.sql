CREATE TABLE public.glendale_scan_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token_hash text NOT NULL UNIQUE,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.glendale_scan_links TO service_role;
ALTER TABLE public.glendale_scan_links ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER glendale_scan_links_no_delete BEFORE DELETE ON public.glendale_scan_links FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER glendale_scan_links_audit AFTER UPDATE ON public.glendale_scan_links FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TABLE public.glendale_scan_uploads (
 id uuid PRIMARY KEY,
 link_id uuid NOT NULL REFERENCES public.glendale_scan_links(id),
 name text NOT NULL,
 pages jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.glendale_scan_uploads TO service_role;
ALTER TABLE public.glendale_scan_uploads ENABLE ROW LEVEL SECURITY;
CREATE INDEX glendale_scan_uploads_link ON public.glendale_scan_uploads(link_id);
CREATE TRIGGER glendale_scan_uploads_no_delete BEFORE DELETE ON public.glendale_scan_uploads FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER glendale_scan_uploads_audit AFTER UPDATE ON public.glendale_scan_uploads FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();