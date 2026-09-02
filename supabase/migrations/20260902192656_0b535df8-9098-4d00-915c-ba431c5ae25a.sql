CREATE TABLE public.cemetery_people (
  id uuid primary key default gen_random_uuid(),
  cemetery_id uuid not null references public.texas_cemeteries(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cemetery_people TO authenticated;
GRANT ALL ON public.cemetery_people TO service_role;
ALTER TABLE public.cemetery_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage cemetery people" ON public.cemetery_people
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'agent'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'agent'));
CREATE INDEX idx_cemetery_people_cemetery ON public.cemetery_people(cemetery_id);
CREATE TRIGGER trg_cemetery_people_updated BEFORE UPDATE ON public.cemetery_people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER zzz_prevent_hard_delete BEFORE DELETE ON public.cemetery_people FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();