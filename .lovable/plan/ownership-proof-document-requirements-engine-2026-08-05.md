# Ownership proof & document requirements engine

Every seller follows the same path up to the signed listing agreement. After that the paperwork diverges completely — the handwritten sheets show it: one seller needs a single POA and a driver's licence, another needs an affidavit of heirship, four sibling POAs, four licences and a death certificate. This builds the divergent half: work out who actually has the right to sell, derive the exact document list for that submission, and issue/track every item.

## 1. Ownership questionnaire

The uploaded intake HTML already contains a sound decision flow. It becomes an in-app **Ownership & authority** wizard on each submission (admin-fillable now; the same component can later be exposed to the seller).

Questions, in the order the flow demands:

```text
Who is on the deed?  living / deceased / trust / organisation
  living   → signing personally or via agent? → POA or guardianship
           → one owner or several? → all alive & willing / one deceased / one blocked
           → marital status: married / divorced / widowed / single
  deceased → is anyone buried in the plot?
           → will?  yes → probate route (letters / muniment / none) → one or several beneficiaries
                    no  → heir class (children / parents / siblings) → heirship route
                          (court order / affidavit of heirship / small estate affidavit / nothing)
                          → surviving spouse?
           → has anyone who would inherit also died since?
  trust    → original or successor trustee
  org      → active or dissolved
ALL → do you have the certificate of ownership? → do names match across deed, ID and court papers?
```

Answers are stored as structured JSON on the submission, so the checklist, contracts and AI drafter all read one source of truth.

## 2. Person roster

The questionnaire produces a **roster of people**, not just a list of documents — this is what the handwritten sheets are: "POA for 4 siblings, driver's licence for 4 siblings". Each row is a named person with a role (owner, co-owner, surviving spouse, heir, executor, trustee, agent) and their own required items, usually a POA plus a photo ID. Rules:

- Every living co-owner signs; a plot can't be split without the cemetery's consent
- A married owner's spouse signs a consent even when not on the deed (vested right of interment, §711.039)
- Divorced or widowed → the decree or the late spouse's death certificate ends that right
- A deceased owner's share passes to heirs; a deceased heir is replaced by their own children, never by their spouse
- In-laws and stepchildren are not heirs
- An occupied plot reserves graves for the spouse and children and is flagged for cemetery review
- More than one death in the chain → each estate needs its own paperwork

## 3. Document catalog

One canonical catalog keyed by the D-codes from the intake tool, so the app, the emails and the paper sheets all use the same names:

| Code | Document | Issued by us | Notarised |
|---|---|---|---|
| D1 | Certificate of ownership / plot deed (or lost-certificate affidavit) | affidavit only | affidavit only |
| D2 | Photo ID for every signer | no | no |
| D3 | Spousal consent / joinder | yes | yes |
| D4 | Final divorce decree | no | no |
| D5 | Marriage certificate / name-change order | no | no |
| D6 | Death certificate | no | no |
| D7–D9 | Will, Letters Testamentary, Muniment of title order | no | no |
| D10 | Letters of Administration / Judgment Determining Heirship | no | no |
| D12 | Affidavit of Heirship (+ second disinterested witness) | yes | yes |
| D13 | Small estate affidavit | no | no |
| D15 | Existing power of attorney held by the seller | no | no |
| D16–D17 | Trust agreement, successor trustee acceptance | no | no |
| D18 | Guardianship letters | no | no |
| D19 | Corporate resolution / good standing | no | no |
| D20 | Cemetery transfer packet and fee | cemetery-specific | varies |
| D21 | Our limited POA | yes | yes |
| D22 | Chain-of-title proof for each estate | no | no |
| — | Listing Agreement | yes | no |

Each requirement carries a state: `not needed`, `maybe`, `needed`, `issued`, `awaiting seller`, `received`, `notarised`, `complete` — matching the NEED / maybe / R marks on the paper sheets.

## 4. Cemetery-specific rules

Requirements are then overlaid with the cemetery's own rules, held on the cemetery profile as structured fields plus its attached forms:

- **Restland** — deceased owner needs the death certificate *and* their Certificate of Kinship form; accepts a durable POA with proof; accepts remote signing and fully virtual appointments; broker signature not required; transfer fee waived if the family arranges the service there
- **Forest Park Westheimer** — wants the original deed; a lost-certificate-of-title form must be done in person; child waiver if there are children; accepts an outside POA, death certificates and driver's licences
- **Bluebonnet Hills** — original copies of the deed, certificate of rights and death certificate; provides its own quitclaim/heirship form if the deed is missing; accepts outside POA
- Per-cemetery flags: requires originals, has its own heirship form, has its own transfer form, accepts outside POA, allows remote/virtual signing, plus free-text notes and uploaded forms

A cemetery rule can add a requirement, mark one "originals only", or replace one of ours with the cemetery's own form.

## 5. Paperwork panel

A new panel on each submission, grouped by person, showing every requirement with its state, who it is waiting on, and the right action inline:

- issued documents → Generate / Preview / Send for signature / Send notary packet
- requested documents → Request by email / mark received / open the uploaded file
- manual override on any row, plus a free-text "why" note, because reality outruns rules
- a header summary — "9 of 14 items complete · waiting on 3 people" — and a one-click summary email listing exactly what is outstanding, which replaces the printed sheets

## 6. Affidavit of Heirship

Added as a new issuable document alongside the Listing Agreement and POA:

- Filled from the questionnaire: affiant, decedent, dates, marital history, heir table, cemetery, section/block/lot, spaces, deed number
- Includes the Second Disinterested Witness affidavit, and the Joinder & Consent of Surviving Spouse page only when there is a surviving spouse
- Notarisation required, so it reuses the POA flow exactly: the seller confirms their address on a branded page, then gets a styled email with the filled PDF attached, the direct online-notary upload link, and in-person notary instructions
- The completion instruction sheet is sent as guidance in the email, never merged into the signed document

## Technical notes

- New shared rules module (questionnaire → roster → requirements) used identically by the admin UI and the edge functions; pure functions with unit tests covering the example sellers from the uploaded sheets.
- `contract_kind` gains `affidavit_heirship` and `spousal_consent`; the existing `contracts` table, tokens, storage and countersign flow are reused.
- Requirements persist per person in `submission_documents` (extended with `person_name`, `person_role`, `doc_code`, `required_state`, `manual_override`); the questionnaire JSON and cemetery rule fields are added by migration.
- The affidavit arrived as Word, so its PDF is typeset directly with `pdf-lib` rather than overlaying a scan — that also handles the variable-length heir table and the optional spouse page.
- Legal references in the intake tool were checked and hold up (§711.039 vested right of interment, §711.0381 recording, §751.031 POA scope, Estates Code §203.001 affidavit of heirship, $75,000 small-estate cap). Edge cases it simplifies — half-siblings, adoption, common-law marriage, the 120-hour survivorship rule, community vs separate property — are surfaced as review flags rather than silently decided.
- Seller uploads reuse the existing customer-files storage and the mobile QR upload page.
