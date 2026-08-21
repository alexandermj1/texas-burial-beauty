INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

UPDATE public.profiles SET full_name = 'Simon James'
WHERE email = 'simonjamesphd@gmail.com' AND (full_name IS NULL OR btrim(full_name) = '');

CREATE TABLE public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  detail text,
  assigned_to uuid,
  assigned_name text,
  created_by uuid,
  created_by_name text,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  done_by_name text,
  due_date date,
  priority text NOT NULL DEFAULT 'normal',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_tasks TO authenticated;
GRANT ALL ON public.team_tasks TO service_role;

ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view tasks" ON public.team_tasks
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Team can add tasks" ON public.team_tasks
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Team can edit tasks" ON public.team_tasks
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Team can remove tasks" ON public.team_tasks
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER trg_team_tasks_updated
BEFORE UPDATE ON public.team_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();