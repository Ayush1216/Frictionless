-- ============================================================
-- Migration 013: Fix investor matching tables
--
-- The tables startup_thesis_fit_profiles and startup_investor_matches
-- exist but have incorrect column schemas. This drops and recreates
-- them with the correct columns expected by the backend code.
-- ============================================================

-- 1. startup_thesis_fit_profiles
DROP TABLE IF EXISTS public.startup_thesis_fit_profiles CASCADE;

CREATE TABLE public.startup_thesis_fit_profiles (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  thesis_profile jsonb NOT NULL DEFAULT '{}',
  generated_at  timestamptz DEFAULT now(),
  generator     text DEFAULT 'heuristic_startup_builder_v2',
  llm_refined   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (org_id)
);

ALTER TABLE public.startup_thesis_fit_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on thesis profiles"
  ON public.startup_thesis_fit_profiles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own org thesis profile"
  ON public.startup_thesis_fit_profiles FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM public.org_memberships om
    WHERE om.user_id = auth.uid() AND om.is_active = true
  ));

CREATE INDEX idx_thesis_profiles_org ON public.startup_thesis_fit_profiles(org_id);


-- 2. startup_investor_matches
DROP TABLE IF EXISTS public.startup_investor_matches CASCADE;

CREATE TABLE public.startup_investor_matches (
  id                              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  investor_id                     text NOT NULL,
  fit_score_0_to_100              numeric DEFAULT 0,
  fit_score_if_eligible_0_to_100  numeric DEFAULT 0,
  eligible                        boolean DEFAULT false,
  gate_fail_reasons               jsonb DEFAULT '[]',
  category_breakdown              jsonb DEFAULT '{}',
  investor_profile                jsonb DEFAULT '{}',
  matching_version                text DEFAULT 'manual_deterministic_v2',
  matched_at                      timestamptz DEFAULT now(),
  created_at                      timestamptz DEFAULT now(),
  updated_at                      timestamptz DEFAULT now(),
  UNIQUE (org_id, investor_id)
);

ALTER TABLE public.startup_investor_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on investor matches"
  ON public.startup_investor_matches FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own org investor matches"
  ON public.startup_investor_matches FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM public.org_memberships om 
    WHERE om.user_id = auth.uid() AND om.is_active = true
  ));

CREATE INDEX idx_investor_matches_org ON public.startup_investor_matches(org_id);
CREATE INDEX idx_investor_matches_score ON public.startup_investor_matches(fit_score_0_to_100 DESC);
