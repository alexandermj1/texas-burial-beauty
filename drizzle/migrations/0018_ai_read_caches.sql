CREATE TABLE public.ai_file_read_cache (
  cache_key text PRIMARY KEY,
  submission_id uuid,
  file_name text,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_file_read_cache TO service_role;
ALTER TABLE public.ai_file_read_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_research_cache (
  fingerprint text PRIMARY KEY,
  submission_id uuid NOT NULL,
  research jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_research_cache_sub_idx ON public.ai_research_cache (submission_id, created_at DESC);
GRANT ALL ON public.ai_research_cache TO service_role;
ALTER TABLE public.ai_research_cache ENABLE ROW LEVEL SECURITY;