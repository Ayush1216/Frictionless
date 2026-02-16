# Frictionless Backend (FastAPI)

Python FastAPI service for Apollo enrichment and startup extraction pipeline (OCR, founder, charts, KV).

## Setup

1. **Create virtual environment** (recommended):
   ```bash
   python -m venv venv
   .\venv\Scripts\activate   # Windows
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment** – copy `.env.example` to `.env` and set:
   - `APOLLO_API_KEY` – from [Apollo](https://app.apollo.io)
   - `SUPABASE_URL` – your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key (for backend writes)
   - `MISTRAL_API_KEY` – for OCR (from [Mistral](https://mistral.ai))
   - `GEMINI_API_KEY` – for founder, charts, KV extraction (from [Google AI](https://aistudio.google.com))

4. **Run Supabase migrations** in SQL Editor:
   - `docs/supabase_apollo_enrichment.sql`
   - `docs/supabase_startup_extraction_results.sql`

5. **Start the server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Frontend Integration

Add to `Frictionless-Frontend/.env.local`:
```
FRICTIONLESS_BACKEND_URL=http://localhost:8000
```

## Flow

1. **Website** → Apollo enrichment → `apollo_organization_enrichment`
2. **Pitch deck** → upload to storage → triggers extraction pipeline (background)
3. **Extraction** → OCR (Mistral) + founder (Gemini+Search) + charts (Gemini) + KV (Gemini) → `startup_extraction_results`
