# Frictionless Product Upgrade — Implementation Plan

**Version:** 1.0  
**Date:** Feb 16, 2025  
**Author:** Principal Full-Stack Engineer + Product Designer + AI Architect

---

## 1. Execution Plan (Task IDs A1–J1)

| Phase | Task ID | Epic | Description | Dependencies |
|-------|---------|------|-------------|--------------|
| 1 | A1 | Dashboard Layout | Increase effective content width; responsive max-width strategy | — |
| 2 | B1 | Company Profile | Redesign into structured sections/cards/tabs/timelines | — |
| 2 | B2 | Add Person Pipeline | Backend person enrichment; Gemini grounding; disambiguation; deterministic upsert | Phase 1 APIs |
| 2 | B3 | Person QC | Confidence score + evidence; reject low-confidence; persist provenance | B2 |
| 2 | C1 | Readiness Layout | Premium layout; cleaner hierarchy; no radar chart | — |
| 2 | C2 | AI Readiness Analysis | Narrative insights; DB cache; keyed by startup + data hash | Phase 1 DB |
| 2 | D1 | AI Chat Persistence | Full chat history per startup/user/thread; unified timeline | Phase 1 DB |
| 2 | D2 | Chat UX Redesign | Thread list; timestamps; grouping; pagination/virtualization | D1 |
| 2 | E1 | Tasks Redesign | Better task cards; priorities; status; due dates; owner; progress | — |
| 2 | E2 | Tasks Filters Fix | All filters functional; URL query-state sync | E1 |
| 2 | E3 | Simulator | Scenario simulator for tasks/planning | — |
| 2 | E4 | Task Validation | File-based validation; human verdict; audit trail | Phase 1 DB |
| 2 | E5 | Completed Tasks | Section + outcome analytics; charts | E1 |
| 2 | F1 | Analytics Redesign | KPI cards; trend blocks; segment views | — |
| 2 | F2 | Analytics Viz | Optional 3D; graceful 2D fallback | F1 |
| 2 | F3 | Analytics KPIs | Additional business/ops/product KPIs | F1 |
| 2 | G1 | Settings Correctness | User/company info; profile photo; clean edit UX | — |
| 2 | G2 | Team Management | Invite flow; acceptance; shared org data | Phase 1 DB |
| 3 | H1 | Public Share Link | Tokenized profile link; permissions/expiry | Phase 1 DB |
| 3 | H2 | Data Room Share | Reliable shared data room links | H1 |
| 3 | H3 | Activity Tracking | Event table; timeline UI | Phase 1 DB |
| 3 | H4 | AI Helper Widget | Floating assistant; key pages | — |
| 3 | H5 | Search Dedup | No duplicate in Pages if in Recent | — |
| 2 | I1 | Investor Profiles | Use investor_universal_profiles; deduped display | — |
| 2 | I2 | Exclude thesis_json | Exclude normalized_thesis_json from display/scoring | I1 |
| 2 | I3 | Fallback Score | 60–90 deterministic pseudo-random when real score missing | I1 |
| 2 | I4 | Investor Logos | Logo from raw_profile_json.logo_url; graceful fallback | I1 |
| 2 | I5 | Match Page Visuals | Cards; profile panel; stage/sector/geo/check-size | I1 |
| 3 | J1 | Optional Pages | Insights Lab; Risk Monitor; Investor Outreach Planner; feature flags | — |

---

## 2. Task Count Summary

| Category | Count |
|----------|-------|
| **Epics** | 10 (Dashboard, Company Profile, Readiness, AI Chat, Tasks, Analytics, Settings, Sharing/Activity, Match/Investor, Optional) |
| **Atomic tasks** | 32 |
| **Phase 1 (Data + APIs)** | 8 foundational items |
| **Phase 2 (UI redesign)** | 18 items |
| **Phase 3 (AI/Cache/Activity/Share)** | 6 items |

---

## 3. Database Changes (SQL Migrations)

### 3.1 New Tables

```sql
-- Migration: 001_ai_analysis_cache.sql
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_type text NOT NULL,  -- 'readiness_insight' | 'task_recommendation' | etc
  input_hash text NOT NULL,
  model_version text NOT NULL,
  result_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, analysis_type, input_hash, model_version)
);

CREATE INDEX idx_ai_analysis_cache_lookup 
  ON ai_analysis_cache (org_id, analysis_type, input_hash, model_version);

-- Migration: 002_ai_chat_threads.sql
CREATE TABLE IF NOT EXISTS ai_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  context_type text NOT NULL DEFAULT 'general',  -- 'general' | 'task' | 'readiness'
  context_id uuid,  -- task_id when context_type='task'
  title text DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_threads_org ON ai_chat_threads (org_id, updated_at DESC);

-- Migration: 003_ai_chat_messages.sql (extends task_ai_chat for unified thread)
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  author_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_messages_thread ON ai_chat_messages (thread_id, created_at);

-- Migration: 004_activity_events.sql
CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_events_org ON activity_events (org_id, created_at DESC);

-- Migration: 005_share_links.sql
CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  share_type text NOT NULL,  -- 'company_profile' | 'data_room'
  expires_at timestamptz,
  permissions jsonb DEFAULT '{"view": true}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_links_token ON share_links (token);
CREATE INDEX idx_share_links_org ON share_links (org_id);

-- Migration: 006_team_invites.sql
CREATE TABLE IF NOT EXISTS team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invite_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX idx_team_invites_token ON team_invites (invite_token);
CREATE INDEX idx_team_invites_org ON team_invites (org_id);

-- Migration: 007_task_validation_artifacts.sql
CREATE TABLE IF NOT EXISTS task_validation_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_storage_path text NOT NULL,
  validation_status text NOT NULL DEFAULT 'pending',
  ai_extraction_jsonb jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_validation_task ON task_validation_artifacts (task_id);

-- Migration: 008_task_verdicts.sql
CREATE TABLE IF NOT EXISTS task_verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  verdict text NOT NULL,  -- 'approved' | 'rejected' | 'needs_review'
  verdict_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verdict_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_verdicts_task ON task_verdicts (task_id);

-- Migration: 009_person_provenance.sql (for canonical person + evidence)
CREATE TABLE IF NOT EXISTS person_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  identity_key text NOT NULL,  -- deterministic: sha256(linkedin_url) or sha256(domain+name+role)
  person_jsonb jsonb NOT NULL,
  confidence_score float,
  evidence_links jsonb DEFAULT '[]',
  evidence_snippets jsonb DEFAULT '[]',
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, identity_key)
);

CREATE INDEX idx_person_provenance_org ON person_provenance (org_id);
```

### 3.2 Schema Alignment Notes

- `task_groups` uses `org_id` in current backend; if your DB has `startup_org_id`, add migration:

```sql
-- Only if needed:
ALTER TABLE task_groups RENAME COLUMN startup_org_id TO org_id;
```

- `investor_universal_profiles` is assumed to exist. Suggested columns for integration:
  - `id`, `raw_profile_json`, `metadata`, `logo_url` (or equivalent)
  - Exclude `normalized_thesis_json` from queries per I2.

### 3.3 Rollback Notes

| Migration | Rollback |
|-----------|----------|
| 001 | `DROP TABLE ai_analysis_cache;` |
| 002–003 | `DROP TABLE ai_chat_messages; DROP TABLE ai_chat_threads;` |
| 004 | `DROP TABLE activity_events;` |
| 005 | `DROP TABLE share_links;` |
| 006 | `DROP TABLE team_invites;` |
| 007–008 | `DROP TABLE task_verdicts; DROP TABLE task_validation_artifacts;` |
| 009 | `DROP TABLE person_provenance;` |

---

## 4. API Contracts

### 4.1 Person Enrichment (B2, B3)

**POST `/api/team/add-from-linkedin`** (existing; enhanced)

**Request:**
```json
{
  "org_id": "uuid",
  "linkedin_url": "https://linkedin.com/in/...",
  "role_type": "Founder|Leadership|Other",
  "company_name_override": "optional"
}
```

**Response (success):**
```json
{
  "ok": true,
  "status": "added|already_exists|rejected",
  "person": {
    "full_name": "...",
    "linkedin_url": "...",
    "title": "...",
    "profile_image_url": "...",
    "confidence_score": 0.92,
    "evidence_links": [{"title": "...", "url": "..."}],
    "identity_key": "sha256..."
  },
  "rejection_reason": null
}
```

**Response (rejected, low confidence):**
```json
{
  "ok": false,
  "status": "rejected",
  "rejection_reason": "Ambiguous match; confidence below threshold",
  "suggested_action": "Verify LinkedIn URL or company context"
}
```

**New Backend Logic:**
- Use `gemini-3-flash-preview` with Google Search grounding.
- Compute `identity_key = sha256(linkedin_url_normalized)`.
- Match by: company domain + LinkedIn URL + role evidence.
- Reject if `confidence_score < 0.75`.
- Persist to `person_provenance` and merge into extraction.

### 4.2 Readiness Analysis Cache (C2)

**GET `/api/readiness/analysis?org_id=`**

Returns cached narrative or triggers generation. Cache key:  
`org_id + analysis_type=readiness_insight + input_hash(readiness_data) + model_version`.

**Response:**
```json
{
  "status": "cached|generated",
  "analysis": {
    "insights": "...",
    "strengths": ["..."],
    "risks": ["..."],
    "recommendations": ["..."]
  },
  "cached_at": "iso8601"
}
```

### 4.3 Chat History (D1)

**GET `/api/chat/threads?org_id=&limit=20&offset=0`**
**GET `/api/chat/threads/:thread_id/messages?limit=50&before=`**
**POST `/api/chat/threads`** — create thread  
**POST `/api/chat/threads/:thread_id/messages`** — append message  

### 4.4 Share Links (H1, H2)

**POST `/api/share/create`**
```json
{ "org_id": "...", "share_type": "company_profile|data_room", "expires_hours": 168 }
```
**Response:** `{ "token": "...", "url": "https://.../share/:token" }`

**GET `/api/share/:token`** — public, no auth; returns profile/data-room payload if valid.

### 4.5 Team Invites (G2)

**POST `/api/team/invite`** — `{ org_id, email, role }`  
**GET `/api/team/invite/accept?token=`** — accept flow  
**GET `/api/team/invites`** — list pending

### 4.6 Task Validation (E4)

**POST `/api/tasks/:task_id/validate`** — upload file; returns `validation_artifact_id`  
**POST `/api/tasks/:task_id/verdict`** — `{ verdict, verdict_notes }`

### 4.7 Investor/Match (I1–I5)

**GET `/api/investors`** — from `investor_universal_profiles`; exclude `normalized_thesis_json`.  
**GET `/api/matches?startup_org_id=`** — scores with fallback 60–90 deterministic.  
**Logo:** `raw_profile_json->>'logo_url'` or `metadata->>'logo_url'`.

---

## 5. Frontend File-by-File Changes

### 5.1 Dashboard (A1)

| File | Changes |
|------|---------|
| `src/app/(app)/dashboard/page.tsx` | Fix `startup` undefined; add `const startup = dummyStartups[0]` fallback; increase `max-w-[1400px]` → `max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]`; add responsive padding |
| `src/components/app/AppShell.tsx` | Ensure main content uses full available width; adjust `px-6` to `px-4 xl:px-8 2xl:px-12` |

### 5.2 Company Profile (B1–B3)

| File | Changes |
|------|---------|
| `src/app/(app)/startup/company-profile/page.tsx` | Redesign: tabs (Overview, Team, Financials, Timeline); SectionCard layout; add charts for available data; integrate AddPerson flow |
| `src/components/company-profile/AddPersonModal.tsx` | Show confidence + evidence; rejection UI; deterministic identity feedback |
| `src/components/company-profile/SectionCard.tsx` | Enhance for timeline/card layouts |
| **New:** `src/components/company-profile/ProfileTimeline.tsx` | Timeline for key events |
| **New:** `src/components/company-profile/ProfileCharts.tsx` | Mini charts where data exists |

### 5.3 Readiness (C1, C2)

| File | Changes |
|------|---------|
| `src/app/(app)/startup/readiness/page.tsx` | New layout: hero, category cards, trend sections; remove radar; add AI analysis section below |
| `src/components/readiness/CategoryAccordion.tsx` | Cleaner hierarchy; better cards |
| **New:** `src/components/readiness/AIAnalysisCard.tsx` | Cached narrative; strengths/risks/recommendations |

### 5.4 AI Chat (D1, D2)

| File | Changes |
|------|---------|
| `src/components/tasks/TaskAICompletion.tsx` | Persist messages; load history; unified thread support |
| **New:** `src/app/api/chat/threads/route.ts` | List/create threads |
| **New:** `src/app/api/chat/threads/[threadId]/messages/route.ts` | Get/append messages; pagination |
| **New:** `src/components/chat/ChatThreadList.tsx` | Thread list with timestamps |
| **New:** `src/components/chat/ChatMessageGroup.tsx` | Grouped messages; virtualized list |

### 5.5 Tasks (E1–E5)

| File | Changes |
|------|---------|
| `src/app/(app)/startup/tasks/page.tsx` | Wire filters to URL (`?status=&priority=&category=`); fix filter logic to combine; add completed section |
| `src/components/tasks/TaskCard.tsx` | Stronger hierarchy; owner; due date; progress |
| `src/components/tasks/TaskList.tsx` | Apply filters; URL sync |
| `src/components/tasks/TaskBoard.tsx` | Same |
| **New:** `src/components/tasks/TaskSimulator.tsx` | Scenario simulator |
| **New:** `src/components/tasks/TaskValidationFlow.tsx` | File upload + human verdict |
| **New:** `src/components/tasks/CompletedTasksSection.tsx` | Done tasks + outcome analytics |

### 5.6 Analytics (F1–F3)

| File | Changes |
|------|---------|
| `src/app/(app)/startup/analytics/page.tsx` | Redesign; KPI cards; trend blocks; remove radar; add optional 3D or 2D fallback |
| `src/components/analytics/ExtractionChart.tsx` | Enhance |
| **New:** `src/components/analytics/KPICardGrid.tsx` | Business/ops/product KPIs |

### 5.7 Settings (G1, G2)

| File | Changes |
|------|---------|
| `src/app/(app)/settings/page.tsx` | Proper user/company from auth/API; profile photo upload |
| `src/app/(app)/settings/team/page.tsx` | Invite flow; list invites; acceptance |
| **New:** `src/app/api/team/invite/route.ts` | Create invite |
| **New:** `src/app/api/team/invite/accept/route.ts` | Accept |

### 5.8 Sharing + Activity (H1–H5)

| File | Changes |
|------|---------|
| `src/components/data-room/ShareModal.tsx` | Use new share API; tokenized link |
| **New:** `src/app/share/[token]/page.tsx` | Public profile/data-room view |
| **New:** `src/components/activity/ActivityTimelineFull.tsx` | Full activity from `activity_events` |
| **New:** `src/components/ai/AIHelperWidget.tsx` | Floating widget; bottom-right |

**SpotlightSearch (H5):**  
In `src/components/app/SpotlightSearch.tsx`:
- Compute `recentHrefs = new Set(recentItems.map(r => r.href))`
- Filter `pageItems` so items with `href in recentHrefs` are not shown in Pages group (or merge and dedupe by href)

### 5.9 Match/Investor (I1–I5)

| File | Changes |
|------|---------|
| `src/lib/dummy-data/investors.ts` | Replace with API fetch from `investor_universal_profiles` |
| `src/components/matches/MatchCard.tsx` | Use logo from best source; dedup fields |
| `src/components/matches/InvestorProfileHeader.tsx` | Same; stage/sector/geo/check-size |
| `src/components/matches/MatchDetailTabs.tsx` | Exclude `normalized_thesis_json` |
| **New:** `src/app/api/investors/route.ts` | Proxy to backend |
| **New:** `src/lib/investor-score-fallback.ts` | Deterministic 60–90 from investor id/domain |

### 5.10 Optional Pages (J1)

| File | Changes |
|------|---------|
| `src/lib/feature-flags.ts` | `insightsLab`, `riskMonitor`, `investorOutreachPlanner` |
| **New:** `src/app/(app)/startup/insights-lab/page.tsx` | Behind `insightsLab` |
| **New:** `src/app/(app)/startup/risk-monitor/page.tsx` | Behind `riskMonitor` |
| **New:** `src/app/(app)/startup/investor-outreach/page.tsx` | Behind `investorOutreachPlanner` |
| `src/components/app/Sidebar.tsx` | Conditionally show nav items from feature flags |

---

## 6. AI Pipeline & Caching

### 6.1 Readiness Analysis Cache

- **Key:** `org_id + analysis_type=readiness_insight + sha256(scored_rubric_json + score_summary_json) + model_version`
- **Invalidation:** On readiness rescore or extraction update.
- **TTL:** No expiry; invalidate on data change only.

### 6.2 Person Enrichment

- **Model:** `gemini-3-flash-preview` with `google_search` grounding.
- **Identity key:** `sha256(normalize_linkedin_url(linkedin_url))` for deterministic upsert.
- **Evidence:** Extract from `grounding_chunks`; store in `person_provenance`.

### 6.3 Task Chat

- **Persistence:** Use existing `task_ai_chat_messages`; extend to support `ai_chat_threads` for global chat.
- **Model:** `OPENAI_CHAT_MODEL` (gpt-4.1-mini) per existing config.

---

## 7. Security/Permissions for Sharing

### 7.1 Share Links

- **Token:** Cryptographically random (e.g., `crypto.randomBytes(32).toString('hex')`).
- **Expiry:** Optional; stored in `share_links.expires_at`.
- **Permissions:** `view` (default); future: `download`, `comment`.

### 7.2 Data Room Share

- Signed URLs for files; token validates org + share_type + expiry.
- RLS: Share link access does not require auth; validate token server-side.

### 7.3 Team Invites

- **Invite token:** Random; single-use; expires (e.g., 7 days).
- On accept: create `org_memberships`; mark invite `accepted`; user gains access to shared org data.

---

## 8. QA Test Cases

### 8.1 Unit

| Area | Cases |
|------|-------|
| Person identity key | `sha256(linkedin_url)` deterministic |
| Fallback score | 60–90; same input → same output |
| Cache key | `org_id + type + hash + model` stable |
| Search dedup | No duplicates in Pages when in Recent |

### 8.2 Integration

| Area | Cases |
|------|-------|
| Add person | LinkedIn URL → enrichment → upsert; reject low confidence |
| Readiness analysis | First call generates; second returns cached |
| Chat | Send message → reload → history persists |
| Share link | Create → access without auth → expiry works |
| Team invite | Invite → accept → new user sees org data |

### 8.3 UI Acceptance

| Page | Checklist |
|------|-----------|
| Dashboard | Wider content; no overflow on tablet/mobile |
| Company Profile | Sections/tabs; Add Person with confidence UI |
| Readiness | Clean layout; AI analysis below |
| Tasks | Filters work; URL sync; completed section; simulator |
| Analytics | KPI cards; no radar; 2D/3D fallback |
| Settings | Profile photo; team invite flow |
| Match | Logos; no thesis_json; fallback score; no dupes |

---

## 9. Rollout + Rollback Plan

### 9.1 Rollout

1. **Phase 1 (Week 1):** DB migrations; backend endpoints (person enrichment, share, invites, activity, cache).
2. **Phase 2 (Week 2–3):** UI redesign per page; integrate new APIs.
3. **Phase 3 (Week 4):** AI helper; activity; search fix; optional pages behind flags.

### 9.2 Feature Flags

- New optional pages: OFF by default.
- AI helper widget: ON by default; toggle in settings if needed.

### 9.3 Rollback

- **DB:** Run reverse migrations in order (009 → 001).
- **APIs:** Versioned routes; revert to previous deployment.
- **Frontend:** Feature flags disable optional pages; revert UI components via deploy.

---

## 10. Done Criteria Checklist

- [ ] A1: Dashboard max-width increased; responsive; no overflow
- [ ] B1: Company profile redesigned (sections/tabs)
- [ ] B2: Add Person uses Gemini + grounding; disambiguation; identity key
- [ ] B3: Confidence + evidence; reject low; provenance stored
- [ ] C1: Readiness layout premium; no radar
- [ ] C2: AI analysis cached; shown below readiness
- [ ] D1: Chat history persists; task chats in timeline
- [ ] D2: Thread list; timestamps; grouping; pagination
- [ ] E1: Tasks redesigned (cards, hierarchy)
- [ ] E2: Filters work; URL sync
- [ ] E3: Simulator present
- [ ] E4: Validation + verdict flow; audit trail
- [ ] E5: Completed section + analytics
- [ ] F1: Analytics premium layout
- [ ] F2: 3D or 2D fallback
- [ ] F3: Extra KPIs
- [ ] G1: Settings correct; profile photo
- [ ] G2: Team invite end-to-end
- [ ] H1: Public share link works
- [ ] H2: Data room share reliable
- [ ] H3: Activity events + timeline
- [ ] H4: AI helper widget
- [ ] H5: Search no duplicates
- [ ] I1: investor_universal_profiles used
- [ ] I2: thesis_json excluded
- [ ] I3: Fallback score 60–90 deterministic
- [ ] I4: Logos render
- [ ] I5: Match page clean; no dupes
- [ ] J1: Optional pages behind flags

---

*End of Frictionless Upgrade Plan*
