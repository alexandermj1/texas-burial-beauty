## What this adds

When a customer (or email) submits an attachment (deed, POA, ID, statement, etc.), Lovable AI reads it and pulls out the important info — owner name(s), cemetery, section/lot/space, deed number, dates, notarization, etc. — and saves a structured summary on that attachment so it shows in the submission's admin view.

## Cost

Model: `google/gemini-3.1-flash-lite` (cheapest multimodal).

Per typical 1–3 page deed/POA:
- ~1,500–4,000 input tokens + ~300 output tokens
- ≈ **0.01–0.03 credits per document**
- At Pro pricing ($25 / 100 credits = $0.25/credit) → **~$0.0025–$0.0075 per document** (about 130–400 docs per $1)

Large multi-page scans cost more proportionally. We'll cap at the first ~10 pages per file to keep costs predictable.

## Implementation

### 1. Database
Add to `customer_files`:
- `extracted_data jsonb` — structured fields (owner names, cemetery, section/lot/space, deed #, dates, doc subtype, etc.)
- `extracted_summary text` — 1–2 sentence human summary
- `extraction_status text` — `pending` | `done` | `failed` | `unsupported`
- `extraction_error text`
- `extracted_at timestamptz`

### 2. Edge function `extract-attachment-info`
Input: `{ file_id }` (or `{ submission_id }` to batch all of a submission's files).
Steps:
1. Look up `customer_files` row, create signed URL from `customer-files` bucket.
2. Fetch file bytes, base64-encode, build a chat-completions request to Lovable AI Gateway with:
   - model `google/gemini-3.1-flash-lite`
   - image_url block for images, `file` block for PDFs (correct MIME)
   - prompt asking for structured JSON: `{ document_type, owners[], cemetery, section, lot, space, deed_number, issued_date, notarized, parties[], amounts[], notes, summary }`
   - `response_format: json_object`
3. Save parsed JSON to `extracted_data`, summary to `extracted_summary`, set status.
4. Handles 402/429 by setting `extraction_status='failed'` with the error.

### 3. Auto-trigger
- In `attach-seller-files` (form uploads) and `sync-inbox` (email attachments), after the `customer_files` insert, fire-and-forget invoke `extract-attachment-info` for each new file. Status starts as `pending`, updates async.

### 4. Admin UI (`SellerAttachmentsBlock`)
For each attachment, show:
- A small "AI summary" line under the filename (the `extracted_summary`).
- Expandable "Extracted details" panel rendering the key/value pairs from `extracted_data`.
- A "Re-extract" button that re-invokes the function (in case of an early failure or after a model change).
- A status pill: Pending / Done / Failed (with error tooltip) / Unsupported.

### 5. Scope guardrails
- Only PDFs and images (`image/*`, `application/pdf`). Other types get `unsupported`.
- File size cap (e.g. 15 MB) and page cap to bound cost.
- Extraction is best-effort; raw file remains the source of truth — extracted fields are advisory, not auto-applied to the submission's main fields (to avoid silently overwriting customer-entered data). Admin can copy values manually if they want.

## Out of scope (ask if you want these too)
- Auto-populating submission fields (cemetery, plot number) from extracted data.
- Cross-checking extracted owner name vs. submitter's name and flagging mismatches.
- Running extraction retroactively on all existing `customer_files` rows (one-shot backfill).
