ALTER TABLE public.people DROP CONSTRAINT IF EXISTS people_user_id_fkey;
ALTER TABLE public.sources DROP CONSTRAINT IF EXISTS sources_user_id_fkey;
ALTER TABLE public.relationships DROP CONSTRAINT IF EXISTS relationships_user_id_fkey;
ALTER TABLE public.hints_searches DROP CONSTRAINT IF EXISTS hints_searches_user_id_fkey;
ALTER TABLE public.evidence_summary DROP CONSTRAINT IF EXISTS evidence_summary_user_id_fkey;
ALTER TABLE public.next_steps DROP CONSTRAINT IF EXISTS next_steps_user_id_fkey;
ALTER TABLE public.downloads DROP CONSTRAINT IF EXISTS downloads_user_id_fkey;

ALTER TABLE public.people FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.people;
CREATE POLICY "service_bypass" ON public.people FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.sources FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.sources;
CREATE POLICY "service_bypass" ON public.sources FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.relationships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.relationships;
CREATE POLICY "service_bypass" ON public.relationships FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.hints_searches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.hints_searches;
CREATE POLICY "service_bypass" ON public.hints_searches FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.evidence_summary FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.evidence_summary;
CREATE POLICY "service_bypass" ON public.evidence_summary FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.next_steps FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.next_steps;
CREATE POLICY "service_bypass" ON public.next_steps FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.downloads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.downloads;
CREATE POLICY "service_bypass" ON public.downloads FOR ALL TO service_role USING (true) WITH CHECK (true);
