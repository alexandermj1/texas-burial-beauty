# Roadmap

## Current request
- [ ] Explain Sharon Timmons’ automatic reply status without sending her an email.
- [ ] Replace buyer contact preference with phone and email fields; verify the form.
- [x] Add per-buyer automatic AI reply switch; deployed automatic suppression at selection/draft/final send, six tests pass, signed-in switch saves off across reload and restores on; no email sent, page builds cleanly.
- [x] Integrate Alexander’s transfer-guide copy with light grammar edits, update the introduction and remove endowment care from shared tables; eight directory tests pass, desktop/390px/320px checks pass with no page errors; not published.
- [x] Add recorded-fee-only tables to Houston (12), Dallas–Fort Worth (15), San Antonio (2) and Austin (4); test region scope, search, pagination and 390px/320px layouts.
- [x] Refine transfer guide throughout with Vogue editorial layout, separate unobscured illustrations, revised title/SEO, fee-saving and appointment advice; 11 tests pass, desktop/mobile browser checks pass, not published.
- [x] Restyle transfer guide with selling-page editorial masthead and wider sections; add three custom watercolor navigation illustrations; verify all jumps, table search and no overflow at desktop/390px/320px, six tests pass; existing CDN photos/botanicals unavailable in sandbox, not published
- [x] Add transfer-guide table for 206 cemetery records with addresses, 52 recorded fees, curated websites and accuracy notice; align SEO/sitemap, pass six tests and verify search/filter/pages at desktop, 390px and 320px; not published
- [x] Correct Maria’s deed-only false “Docs complete” label; share document readiness with buyer AI, deploy, pass 10 tests and verify Shawn’s signed-in page now shows “Quote sent”; no email sent
- [x] Correct immediate buyer auto path; enforce minimum 20-minute delay before drafting and automatic sending; six tests plus actual-handler isolated checks pass; deployed without test emails
- [x] Add approval-only Buyer AI drafts with cemetery/type matching, saved prices, private lawn labels and readiness wording
- [x] Defer immediate buyer-form notifications to the eligible scheduled sweep; duplicate checks, persistent pause and processing leases preserved
- [x] Add buyer AI review/approve controls, hidden from Cici; authenticated live draft read back through the UI without sending an email; pricing tests pass
- [x] Round buyer AI prices to clean figures, state the transfer fee plainly as included in the final price, and drop buyer's premium wording; redeployed, both drafts redrafted, no email sent
- [x] Verify the Remove control on matched plots (removed plot leaves the list and the redrafted email); restore plots removed during testing; recover a draft left stuck mid-run
- [ ] Verify automatic new-form timing and approved delivery with a user-authorized test inquiry (no customer or owner emails sent during verification)
- [x] Restore the homepage shopfront with general lawn labels and space counts, percentage savings only, and a single visibility setting
- [x] Include all 20 paid Featured plots and 50 additional paid signed available properties without inventing or altering inventory; Featured priority preserved
- [x] Verify all 70 public records contain no currency or plot identifiers; desktop/mobile controls, inquiry links and layout pass with no page errors (existing hosted background images unavailable in sandbox screenshots)
- [x] Hide the homepage Featured shopfronts for now (import and render commented in Index.tsx); component file kept intact, homepage verified clean with no errors

- [x] Refine the Featured sign with layered framing, warm paper, dimensional sloped stripes and rounded scallops; visually verified at 1381, 390 and 320px with no overflow or page errors
- [x] Use the latest reference for a full-width muted shop sign and striped awning above the plots
- [x] Shuffle the automatic cycle, wrap to fill desktop rows, omit visible totals and preserve muted artwork; every unique card verified automatically on desktop and phone, including pause and inquiry links
- [x] Add verified broad retail/resale ranges only; comparisons available for 18 records, remaining records use inquiry fallback; 1280/768/390/320 layouts and all phone cards checked
- [x] Replace shopfront artwork with supplied backgrounds, tighten spacing and refine names; move below the map
- [x] Use 20 verified paid Featured/legacy Featured properties only; check live inventory, all rotation pages, mobile text fit and inquiry links; hosted backgrounds verified (local screenshots use the same uploaded images)
- [x] Add botanical homepage shopfronts, rotating pages and inquiry links; desktop/mobile presentation checked with saved inventory examples
- [x] Verify live homepage inventory read — added a visitor-safe inventory view (public_listing_cards) exposing only cemetery, city, plot type, section and spaces; signed-out desktop and phone checks now show the cards
- [x] Integrate Muse’s cost-guide quick answer and relevant FAQs, with grounded pricing and editorial styling
- [x] Improve directory introduction and add useful buying, transfer and inherited-sale questions without changing exclusions
- [x] Update cost and Laurel Land Fort Worth metadata and correct the directory title truncation; desktop/mobile links, metadata and three regression tests verified; publication remains owner-controlled
- [x] Keep the mobile navigation menu compact with Guides as a single row; verify desktop menu cards remain
- [x] Give the buy page a consistent wide layout and replace the savings banner with refined editorial design; verified all five buying steps, matching 1536px section widths and mobile presentation
- [x] Redesign broker value in the sell page’s editorial style, move below available properties, and verify presentation and links
- [x] Add an on-brand sell-page broker-value section with estimated timelines, document guidance, viewings, financing and industry connections; verify desktop/mobile
- [x] Verify four new live payment links load correct amounts without charging; add October AI guidance and fix missing private-package admin labels
- [x] Check quote-to-agreement routing and checkbox mapping; full paid transaction remains untested
- [x] Show only three public packages with genuine $200 October savings and a Texas-time countdown
- [x] Verify quote payment amounts and tier IDs with tests, inspect agreement checkbox mapping, test simulated confirmation redirect; real Stripe transaction not performed
- [x] Replace standard listing fees across public pages, indexed metadata, quote/payment flows and new contracts; preserve historical agreements and promised fees
- [x] Update AI's latest versioned playbook and runtime guidance; verify fees and unchanged benefits
- [x] Centre plot-worth editorial text, increase brand contrast, and build a curved-arrow visual lead-in to the calculator; verify desktop/mobile
- [x] Enrich the plot-worth article around the calculator with existing cemetery photography, honest staff attribution, local links and valuation guidance; verify desktop/mobile
- [x] Create a tool-led Texas plot-worth article using existing public guide content and link it from the guides hub and calculator
- [x] Verify new article, related-guide links, estimates and desktop/mobile presentation
- [x] Keep the full calculator in the cost article; use a shorter compact version in selling and transfer guides; verify desktop, 390px and 320px phones and a real estimate
- [x] Integrate calculator into cost, selling and inherited-plot transfer guides; retire standalone page with a redirect
- [x] Make reference-inspired graphic motion more visible and verify all three placements
- [x] Align cost guide with transfer guide: brand palette, centred single column, rounded edges; verify
- [x] Emphasise calculator sale timelines and refine centred graphics; verify the finished presentation
- [x] Refresh calculator graphics and fluid animations; improve article colour and remove Roman numerals
- [x] Offer the complete cemetery directory and tolerant, private section matching
- [x] Verify estimator matching and calculator desktop/mobile interactions
- [x] Audit and correct Alexander's test cemetery/location mismatch; verify prepared document contents
- [x] Let staff-directed AI distinguish cemetery reassignment from the shared selling-location field
- [x] Refine seller document page on desktop and mobile with restrained blue brand styling and no overlapping controls
- [x] Prepare and attach blank affidavits in AI-assisted document requests, with staff review before sending
- [x] Remove outdated Texas licensing claims from articles and FAQs without misrepresenting repealed law

- [x] Map seller document, communication, and email infrastructure
- [x] Design safe weekly follow-up eligibility and suppression rules
- [x] Implement branded auto follow-up, scheduling, audit trail, and admin tag
- [x] Verify reminder selection, duplicate prevention, and email-chain display
- [x] Match reminders to the established branded submission-email design
- [x] Send unlabelled customer-view previews only to Alexander's personal inbox
- [x] Build and verify the new two-column seller record summary

## Seller record cleanup
- [x] Consolidate cemetery, document insights, deed preview, and reply controls in the seller summary
- [x] Correct seller plot image and per-plot pricing displays
- [x] Restrict Accepted to explicit email acceptance or a manual free-option move
- [x] Make long email chains compact, modern, and easy to navigate
- [x] Correct Robert's inaccurate accepted state and verify the seller record
- [x] Keep quote emails visible in the compact feed while preserving normal collapsed messages

## Apple-style seller workspace
- [x] Make every cemetery action visibly functional
- [x] Use one editable selling location across quote, agreement, family tree, and document request
- [x] Rebuild the seller header and workflow sidebar without duplicate contact details or grave imagery
- [x] Align record stages with the global pipeline and preserve all automated steps
- [x] Verify seller workflows and desktop/mobile presentation

## Integrated seller workspace
- [x] Make cemetery and canonical selling location the dominant record facts
- [x] Make the stage timeline read-only and separate deliberate manual moves
- [x] Remove or conditionally hide duplicated form, contact, and ownership details
- [x] Integrate email, family tree/paperwork, notes, and files into one seller workspace
- [x] Restore reliable admin loading and verify every workspace tab/action
- [x] Make location editing deliberate and resync unsigned paperwork/doc requests
- [x] Rebalance list/detail widths and polish the manual stage control
- [x] Verify quote-to-document location consistency and desktop/mobile workflows

## Guided seller workflow restoration
- [x] Restore the visible family tree and all seller-provided ownership answers
- [x] Restore complete historical notes across the seller profile and submission
- [x] Replace the full detail pipeline with the current stage and a guided next action
- [x] Make the document-request review and send action prominent again
- [x] Move archive and delete controls to the bottom of the open submission
- [x] Verify each guided action opens the correct email, agreement, family-tree, or document-request workflow
- [x] Make next-step buttons reliably wait for and scroll to their exact seller-profile action

## Plain-English document reasoning
- [x] Replace the family-tree diagram with a short relationship-and-signing explanation
- [x] Use low-cost AI to explain only non-obvious documents and joint POAs
- [x] Keep each explained POA clickable for checking and editing
- [x] Label POAs in the request as needed, without a separate prepared status
- [x] Rebuild every unsigned request document when cemetery or selling location changes
- [x] Verify Patricia Perkins and the seller workflow on desktop and mobile
## Seller profile Apple refinement
- [x] Apply the selected Apple workspace hierarchy and spacing across the seller profile
- [x] Collapse family confirmation and seller answers by default
- [x] Replace cemetery button clutter with clear inline information and working edit controls
- [x] Put cemetery and its submission count on the right side of the identity header
- [x] Keep family-tree status out of Email, Notes, and Attachments views
- [x] Verify cemetery and selling-location updates across unsigned documents, request email, and seller pages

## Cemetery transfer process guide
- [x] Build Issue 5 from the supplied human-written inheritance article
- [x] Add legal-source links, diagrams, internal links, and search metadata
- [x] Add a rules-generated complex sample family, signer diagram, and broker pathway
- [x] Enrich the chapter rail with restrained botanical detail and replace the dark closing panel
- [x] Verify desktop/mobile presentation and publish
- [ ] Request Google indexing for the live guide — blocked until Search Console access is available

## Cemetery directory card redesign
- [x] Generate 3 design directions (rejected — wants cemetery name prioritized, photos on only some cards)
- [x] Regenerate directions: name-first hierarchy, photos on select anchor cards only
- [x] Implement the chosen card style on the Texas cemetery directory page
- [x] Use uploaded cemetery photos where available
- [x] Verify desktop and mobile presentation

## Planning a funeral guide redesign
- [x] Use the cemetery directory's metro-area imagery throughout the article
- [x] Redesign the first-48-hours section as an editorial timeline
- [x] Redesign all ten steps with clearer numbered hierarchy
- [x] Add useful internal and authoritative external links
- [x] Replace highlighted FAQ cards with restrained accordion rows
- [x] Replace bespoke related-guide cards with the existing guide carousel
- [x] Verify the final desktop and mobile article presentation
- [x] Vary how metro-area photos are integrated throughout the article
- [x] Add the statewide cemetery map with clickable metro-area sorting
- [x] Verify the revised photography and map on desktop and mobile

## Quote email calculation
- [x] Remove buyer commission from the quote calculation and deduction
- [x] Clarify the property price, one-time cemetery fee, and seller proceeds without changing the figures
- [x] Send the revised customer quote email to alexandermaclarenjames@gmail.com for review

## Multi-plot accepted prices
- [x] Correct John Gaylord and the other exact multiplied-total records
- [x] Keep paid and free listing selections from multiplying accepted per-plot prices
- [x] Align Price Sheet per-plot and all-plots columns with the saved quote
- [x] Verify corrected records and both acceptance paths

## AI Seller Agent
- [x] Restrict the AI agent to sellers only
- [x] Study recent staff email replies to build the tone/protocol knowledge base
- [x] Update the plan with the knowledge base findings
- [x] Phase 1: playbook, seller-only agent, approval inbox (shadow/approval mode)
- [x] Phase 2: automatic reviews on new seller email / staff note; stale suggestions auto-cleared
- [ ] Phase 3: turn on autonomous sending per action type once approval rates are high
- [x] Add guarded 10% quote-increase proposals for sellers seeking more; staff review and send through the existing quote email and acceptance chain
- [x] Send an isolated branded non-actionable quote preview to Alexander's address with an introduction and verified figures (no live payment links)
- [x] Reduce unnecessary AI input/output (read scans only when needed; omit unused model reasoning summary) without switching models or dropping relevant context
- [x] AI: never auto-suggest document requests; keep ability to send them (with greeting/email note/page note) when staff ask

## Menu guide cards and sell-form example name
- [x] Keep the lined grid texture on the menu guide cards and swap the pricing guide for the preneed guide; verified desktop/mobile
- [x] Replace the "Jane Doe" example name at the start of the sell-your-plot form with another name
- [x] Guides menu: drop the panel-wide background grid (cards keep theirs); replace the "Most read guides / All guides" header row with a vertical Vogue side rail reading "Most read" and "All seven guides"; verified desktop/mobile
- [x] Guides menu: replace the upside-down side label with a proper contents rail — "Also in the series" listing N°00 Planning a Funeral in Texas, N°02 Cemetery Plots for Sale, N°03 What a Plot Costs in Texas, then "All seven guides →"; cards now stretch to fill the panel so the dead space below is gone (panel 297px → 250px); verified desktop/mobile
- [x] Buyer AI: check record first (prior contact, notes, phone) before drafting; target uncontacted buyers or new matches; auto emails wait for owner go-ahead
- [x] Buyer AI auto replies ~20 min after inquiry (10-min sweep)
