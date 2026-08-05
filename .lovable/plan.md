# Ownership proof & document requirements engine

Today every seller follows the same path (inquiry → attachments → quote → accepted → listing agreement), then paperwork diverges. This adds the divergent half: prove who the owners are, work out exactly which documents that particular seller needs, and issue/track every one of them from the submission.

## 1. Ownership intake (the step before the POA)

A new **Ownership & authority** card inside each submission captures the facts that decide everything downstream:

- Names on the cemetery deed / certificate of ownership (one row per owner)
- For each owner: living / deceased, relationship to the seller, whether they will sign
- Original owner deceased? → date of death, whether there was a will, whether probate happened, surviving spouse yes/no, children yes/no
- Cemetery's own requirement notes (some cemeteries insist on their internal transfer form)
- Deed / certificate on file, government ID on file

Answers save onto the submission so the AI drafter, contracts and the checklist all read the same source.

## 2. Requirement engine

A single rules module turns those answers into a required-document list. Rules:

| Situation | Documents required |
|---|---|
| Always | Government photo ID (each signer), cemetery deed or certificate of ownership, Listing Agreement, POA from the seller |
| More than one living owner | POA from every owner (one per owner, tracked separately) |
| An owner is deceased | Death certificate, Affidavit of Heirship (+ second disinterested witness page) |
| Deceased owner left a surviving spouse | Joinder & Consent of Surviving Spouse page |
| Deceased owner's estate went through probate | Letters testamentary / small-estate affidavit instead of the heirship affidavit |
| Owner name differs from seller name (marriage, typo) | Name-change / identity affidavit |
| Cemetery requires its own form | Cemetery transfer form (tracked as a request, not issued by us) |

Each requirement is either **issued by us** (we generate a filled PDF and send it for signature or notarisation) or **requested from the seller** (they upload it).

## 3. Document checklist UI

The submission gets a **Paperwork** panel listing every requirement with status: `not needed`, `required`, `issued`, `awaiting seller`, `received`, `notarised`, `complete`. Each row exposes the right action inline:

- issued docs → Generate / Preview / Send for signature / Send notary packet
- requested docs → Request by email / mark received / open the uploaded file
- an override so an admin can mark any document required or not required manually

A progress bar shows "6 of 9 documents complete" so it is obvious what is blocking a sale.

## 4. Affidavit of Heirship (the uploaded document)

Added as a new issuable contract kind alongside the Listing Agreement and POA:

- Filled from the ownership intake: affiant, decedent, dates, cemetery, section/block/lot, space numbers, deed number, heir table
- Includes the Second Disinterested Witness affidavit and, when there is a surviving spouse, the Joinder & Consent page
- Notarisation required, so it reuses the POA flow exactly: seller confirms their address on a branded page, then receives a styled email with the filled PDF attached, a direct online-notary upload link, and in-person notary instructions
- The separate instructions sheet is sent as guidance text in the email, never merged into the signed document

## Technical notes

- `contract_kind` enum gains `affidavit_heirship`; the same `contracts` table, signing tokens, storage paths and countersign flow are reused.
- Because the affidavit arrived as a Word file rather than a PDF template, its PDF is composed directly with `pdf-lib` (typeset text + rules + checkboxes) instead of coordinate-overlaying a scan. This also gives clean pagination for the variable-length heir table.
- Requirements persist in the existing `submission_documents` table (`document_type`, `label`, `status`, `requested_at`, `received_at`, `file_url`), plus a small migration for the new ownership fields and a manual-override flag.
- The rules module lives in shared code so the edge functions and the admin UI evaluate requirements identically.
- Seller uploads reuse the existing customer-files storage and the mobile QR upload page.
