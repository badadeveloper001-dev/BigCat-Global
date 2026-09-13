BEGIN;
CREATE TABLE IF NOT EXISTS public.pilot_feedback (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 category text NOT NULL CHECK (category IN ('bug','confusion','suggestion')),
 description text NOT NULL CHECK (length(description) BETWEEN 1 AND 5000),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pilot_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilot_feedback FROM anon, authenticated;
GRANT ALL ON public.pilot_feedback TO service_role;
COMMIT;
