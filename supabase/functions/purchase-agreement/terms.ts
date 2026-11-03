// Purchase Agreement content, shared by the buyer signing page, the staff
// preview, the signed PDF and the document hash. Changing any wording here
// MUST bump TERMS_VERSION so earlier signed agreements stay traceable to the
// exact text the buyer saw.
export const TERMS_VERSION = "tcb-pa-2026-11";

export type AgreementFields = {
  purchaser: { names: string; address: string; phone: string; email: string; dob: string; marital_status: string };
  property: { cemetery: string; city: string; description: string; spaces: number; property_type: string; commodities: string };
  deed: { same_as_purchaser: boolean; holder1: string; holder2: string; names: string; address: string; phone: string; email: string; dob: string; marital_status: string };
  charges: { deposit: number; balance: number; transfer_fee: number; adjustments: number; adjustments_note: string };
};

export const emptyFields = (): AgreementFields => ({
  purchaser: { names: "", address: "", phone: "", email: "", dob: "", marital_status: "" },
  property: { cemetery: "", city: "", description: "", spaces: 1, property_type: "", commodities: "" },
  deed: { same_as_purchaser: true, holder1: "", holder2: "", names: "", address: "", phone: "", email: "", dob: "", marital_status: "" },
  charges: { deposit: 0, balance: 0, transfer_fee: 0, adjustments: 0, adjustments_note: "" },
});

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; };

/** Schedule of Charges lines 3 and 6, always derived — never typed in. */
export function chargeTotals(c: AgreementFields["charges"]) {
  const totalProperty = n(c.deposit) + n(c.balance);
  const totalDue = totalProperty + n(c.transfer_fee) + n(c.adjustments);
  return { totalProperty: n(totalProperty), totalDue: n(totalDue) };
}

/** Fill gaps so older/partial rows always have every key. */
export function normalizeFields(raw: any): AgreementFields {
  const e = emptyFields();
  const f = raw && typeof raw === "object" ? raw : {};
  return {
    purchaser: { ...e.purchaser, ...(f.purchaser ?? {}) },
    property: { ...e.property, ...(f.property ?? {}), spaces: Math.max(1, Number(f.property?.spaces) || 1) },
    deed: { ...e.deed, ...(f.deed ?? {}), same_as_purchaser: f.deed?.same_as_purchaser !== false },
    charges: {
      deposit: n(f.charges?.deposit), balance: n(f.charges?.balance), transfer_fee: n(f.charges?.transfer_fee),
      adjustments: n(f.charges?.adjustments), adjustments_note: String(f.charges?.adjustments_note ?? ""),
    },
  };
}

/** Fields the buyer may complete on the signing page. Everything else is set by staff. */
export const BUYER_EDITABLE = {
  purchaser: ["names", "email", "address", "phone", "dob", "marital_status"] as const,
  deed: ["same_as_purchaser", "holder2", "names", "address", "phone", "email", "dob", "marital_status"] as const,
};

export const ACKNOWLEDGEMENTS = [
  { key: "rules", label: "Cemetery Rules & Fees", text: "I acknowledge receipt of the Cemetery Rules and Fees disclosures and accept that all current and future Cemetery fees, rules, and transfer/resale rights are governed solely by the Cemetery Authority, not the Broker." },
  { key: "verification", label: "Property Verification", text: "I acknowledge that the legal description in the Schedule of Charges is the sole and definitive identification of the property. I accept the property \u201cAS-IS\u201d (whether personally inspected or purchased sight unseen), waive claims against the Broker related to its physical location or condition, and assume full responsibility for verifying the property\u2019s status with the Cemetery Authority." },
] as const;

export const CANCELLATION_NOTICE = "You, the Purchaser, may cancel this transaction at any time prior to midnight of the fifth calendar day after the date of this transaction, provided no transfer of property, interment, or substantial service or merchandise has been provided hereunder. To cancel: mail written notice of your intent to Texas Cemetery Brokers, Dallas, Texas, or send written notice by email to info@texascemeterybrokers.com.";

export const ESIGN_CONSENT = "I agree to use electronic records and signatures for this Agreement. I understand my electronic signature and initials are legally binding under the U.S. E-SIGN Act and the Texas Uniform Electronic Transactions Act (Tex. Bus. & Com. Code ch. 322), that I may request a paper copy at no charge by emailing info@texascemeterybrokers.com, and that I may withdraw this consent before signing.";

export type Section = { heading: string; body: string[] };

export const TERMS: Section[] = [
  { heading: "Article I. Definitions and Preliminary Clauses", body: [
    "For the purpose of definition: \u201cBroker\u201d and \u201cCompany\u201d mean Texas Cemetery Brokers and/or its assigns, acting on behalf of the record owner of the Interment Right(s) under a written listing agreement. \u201cSeller\u201d means the Broker acting for that record owner. \u201cPurchaser\u201d means the party contracting for interment rights and/or services.",
    "I.2 Perpetual Care Fund. The Purchaser acknowledges that any existing interest in the Cemetery\u2019s Perpetual Care Fund associated with the plot will be transferred in accordance with the exclusive rules and approval of the Cemetery Authority. The Purchaser understands that the Perpetual Care Fund\u2019s transfer, management, and future requirements are governed solely by the rules and discretion of the Cemetery Authority, and not by the Broker.",
  ] },
  { heading: "Article II. Property Description and Transfer", body: [
    "II.1 Property Description. The subject of this Agreement is the sale of Interment Right(s) (the \u201cProperty\u201d), which grants the Purchaser the exclusive privilege of interment in the specific space(s) as described in the Schedule of Charges.",
    "II.2 Nature of Right. The Purchaser acknowledges that the Interment Right conveyed is a right of burial or inurnment only and does not constitute a fee simple interest or ownership of the underlying land. The right is and shall remain subject to the rules and regulations of the Cemetery.",
    "II.3 Transfer of Title. Upon the Broker\u2019s confirmation of receipt of the Total Amount Due in full (in cleared funds) pursuant to Section VII.3, the Broker shall initiate the process to formally transfer the Interment Right(s) to the Purchaser\u2019s name (or the named Deed Holders) on the records of the Cemetery. The Broker\u2019s obligation for the conveyance is complete upon the submission of all necessary, fully executed transfer documents to the appropriate Cemetery authority.",
  ] },
  { heading: "Article III. Dispute Resolution and Miscellaneous Provisions", body: [
    "III.1 General Contract Provisions. (a) Entire Agreement: This Agreement constitutes the entire agreement between the Parties and supersedes all prior agreements, negotiations, and discussions, whether oral or written. (b) Severability: If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the provision shall be modified to the minimum extent necessary to make it valid and enforceable, and the remaining provisions shall remain in full force and effect. (c) Force Majeure: Neither Party shall be liable for any failure or delay in performing its obligations under this Agreement where such failure or delay is caused by events beyond the reasonable control of the non-performing Party, including acts of God, war, terrorism, government restrictions, or natural disasters. (d) Notices: All notices shall be in writing and deemed effective upon (i) personal delivery; (ii) one business day after deposit with a nationally recognized overnight courier; (iii) three business days after deposit in the U.S. Mail, certified or registered, postage prepaid; or (iv) email to the addresses set forth in this Agreement. (e) Counterparts: This Agreement may be executed in counterparts, and electronic signatures shall have the same force and effect as original signatures.",
    "III.2 Dispute Resolution, Costs, and Governing Law. (a) Mandatory Arbitration and Venue: Any dispute or claim arising out of or relating to this Agreement, or the breach thereof, shall be exclusively and finally settled by binding arbitration in Dallas, Texas, in accordance with the then-current rules of the American Arbitration Association (AAA). (b) Cost Allocation: The Purchaser shall bear all costs associated with the arbitration, including the administrative fees, hearing fees, and the fees of the arbitrator, without right of reimbursement unless otherwise mandated by law. (c) Prevailing Party Fees: In the event that any legal action (including arbitration) is commenced to enforce, interpret, or defend the terms of this Agreement, the prevailing Party shall be entitled to recover its reasonable attorneys\u2019 fees, expert witness fees, and costs, in addition to any other relief awarded. (d) Governing Law: This Agreement shall be governed and construed exclusively in accordance with the laws of the State of Texas, without regard to its conflicts of laws principles.",
    "III.3 Cemetery Authority Rules and Fees. The Purchaser acknowledges that the Interment Right(s) are subject to the exclusive rules, regulations, fees, and approval of the Cemetery Authority. The Broker is not responsible for, and does not guarantee or warrant: (i) Transferability or Resale \u2014 the right to resell, assign, or transfer the plot or any associated commodities (e.g., opening/closing, vault/liner); or (ii) External Charges \u2014 any current or future fees, assessments, or charges levied by the Cemetery, including transfer fees, maintenance fees, or installation costs. The Purchaser accepts all risk that the Cemetery Authority may prevent or restrict transfer, resale, or impose new fees, and shall have no claim against the Broker for the value of any rejected or changed items or costs.",
  ] },
  { heading: "Article IV. Indemnification and Limitation of Liability", body: [
    "IV.1 Broker\u2019s Limitation of Liability. Broker\u2019s liability arising out of or in connection with this Agreement, whether in contract, tort (including negligence), or otherwise, shall be limited to the amount paid to Broker under this Agreement. In no event shall Broker be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, even if advised of the possibility of such damages.",
    "IV.2 Limitation of Liability Regarding Cemetery Operations. Purchaser acknowledges that Broker is a brokerage agent separate from the cemetery. Broker\u2019s duties and responsibilities are complete upon the successful transfer of the Interment Rights from the record owner to Purchaser. Broker shall not be held liable for any acts, errors, or omissions of the cemetery, including claims arising from errors in plot location, pre-existing burials, or any other issues related to cemetery management after title has been transferred.",
    "IV.3 Purchaser\u2019s Indemnification of Broker. The Purchaser hereby agrees to defend, indemnify, and hold harmless the Broker, its directors, officers, agents, and employees from and against any and all claims, demands, liabilities, losses, damages, costs and expenses (including reasonable attorneys\u2019 fees) arising out of the Purchaser\u2019s breach of this Agreement or the Purchaser\u2019s use of the Property.",
  ] },
  { heading: "Article V. Representations and Warranties", body: [
    "V.1 Broker Representations (Limitations). (a) Authority: The Broker represents that it holds written authority from the record owner to enter into and perform this Agreement and to arrange the conveyance of the Interment Right(s) described herein. (b) Encumbrances: As of the Final Transfer of Title, the Interment Right(s) shall be transferred free and clear of any liens, mortgages, or encumbrances created by the Broker. (c) Physical Condition and Environment: The Broker makes no representations or warranties regarding the physical condition, surroundings, accessibility, or aesthetic qualities of the Interment Right(s) property or the adjacent area. The Purchaser assumes all risk regarding the property\u2019s proximity to any feature, structure, or boundary maintained or permitted by the Cemetery, whether known or unknown to the Broker.",
    "V.2 Purchaser Representations. The Purchaser represents and warrants to the Broker that: (a) Review and Acknowledgment: the Purchaser has carefully reviewed this Agreement and the Schedule of Charges, and acknowledges receipt of the applicable statutory notices; (b) Independent Brokerage: the Purchaser understands that the Broker is acting solely as a cemetery brokerage agent and is not the Cemetery/Memorial Park owner or operator, and has no control over cemetery management, maintenance, or operations; (c) Cemetery Rules: the Purchaser\u2019s use of the Property is subject to the Cemetery\u2019s existing and future Rules and Regulations, and the Broker makes no guarantee concerning those rules; (d) Intended Use: the Purchaser is acquiring the Interment Right(s) for the bona fide use of the Purchaser or individuals designated by the Purchaser for interment, and not for the primary purpose of investment, immediate resale, or commercial speculation; (e) Independent Verification and Acceptance: the sole and definitive identification of the Property is the legal description (Cemetery, Section, Lot, Space) set forth in the Schedule of Charges; the Purchaser has conducted all necessary independent investigation, including direct verification with the Cemetery Authority, and accepts the Property \u201cAS-IS\u201d based solely on that legal description, waiving any claim against the Broker arising from any prior visual representation, map, photograph, or verbal communication.",
  ] },
  { heading: "Article VI. Purchaser Liability and Payment Finality", body: [
    "VI.1 Finality of Payment. All financial obligations of the Purchaser are contingent upon the final, complete, and irrevocable clearance and settlement of funds in the Broker\u2019s account.",
    "VI.2 Subsequent Purchaser Liability for Payment Failure. If any payment (including credit card, check, or electronic transfer) is subsequently dishonored, reversed, or returned unpaid (including a chargeback) for any reason, the Purchaser shall be deemed to be in immediate and material breach of this Agreement. (a) If the Broker has provided services, transferred Interment Rights, or issued a refund based upon a payment that subsequently fails, the Purchaser shall be fully liable to the Broker for the total amount of the failed payment or the full Fair Market Value of the property or services transferred, whichever is higher. (b) The Broker retains all legal and equitable remedies, including the right to demand the rescission and/or voiding of any property transfer and to immediately re-market the Interment Rights.",
    "VI.3 Recovery Costs. The Purchaser shall be fully liable for any and all costs incurred by the Broker related to a payment failure, including recovery of the outstanding balance or transferred property, returned item fees, bank fees, chargeback fees, collection costs, and reasonable attorneys\u2019 fees.",
  ] },
  { heading: "Article VII. Price and Payment", body: [
    "VII.1 Total Amount Due. The Total Amount Due for the Interment Rights and associated services is set forth in the Schedule of Charges, being the Total Property Price (the Commitment Deposit, if any, plus the Balance of Property Price) together with the Cemetery Transfer Fee and any listed adjustments.",
    "VII.2 Commitment Deposit (Administrative Fee). Where a Commitment Deposit is shown in the Schedule of Charges, it is paid upon execution of this Agreement as independent consideration for the Broker reserving the designated property, freezing its price, preparing the contract and file, and committing to sell the property to the Purchaser at the stated price. Except as provided in Sections VIII.2, IX.2 and IX.4, the Commitment Deposit is fully earned on execution and is non-refundable.",
    "VII.3 Payment and Cleared Funds. Once this Agreement is countersigned by the Broker, the Broker will issue a secure online payment link for the Total Amount Due. Payment may be made by card through that link, or by certified check, wire transfer, or other immediately available funds acceptable to the Broker, no later than the date of Final Transfer of Title. Payment is not deemed received until all funds have irrevocably cleared and settled in the Broker\u2019s account, and the transfer of the Interment Property will not be initiated until the Broker confirms receipt of the Total Amount Due in full.",
  ] },
  { heading: "Article VIII. Broker\u2019s Right to Terminate", body: [
    "VIII.1 Broker\u2019s Unilateral Right to Terminate. The Broker reserves the right to terminate this Agreement for its convenience at any time prior to the Final Transfer of Title, for any reason or no reason, in the Broker\u2019s sole and absolute discretion.",
    "VIII.2 Effect of Broker\u2019s Termination. (a) The Purchaser\u2019s exclusive and sole remedy shall be the full refund of all monies paid by the Purchaser to the Broker, including any Commitment Deposit. (b) Upon refund of the full amount paid, the Broker shall be immediately and fully discharged from all obligations under this Agreement and shall not be liable for any additional damages, including incidental, consequential, special, reliance, punitive, or exemplary damages, or the cost of obtaining similar Interment Rights from a third party.",
    "VIII.3 Notice. Broker shall provide written notice of termination to the Purchaser. The refund shall be made within ten (10) business days following the date the termination notice is delivered.",
  ] },
  { heading: "Article IX. Cancellation and Default", body: [
    "IX.1 Purchaser\u2019s Default and Liquidated Damages. TIME IS OF THE ESSENCE with respect to all of Purchaser\u2019s obligations. Should the Purchaser fail to complete any required payment by the due date, or otherwise materially breach this Agreement, such failure shall constitute an immediate Default. (a) Upon Default, the Agreement shall terminate immediately and all monies paid to the Broker shall be forfeited to the Broker as liquidated damages, which the parties agree is a reasonable estimate of the Broker\u2019s loss and not a penalty. (b) The Broker may retain the forfeited funds and immediately re-market the Interment Rights, retaining all other rights and remedies.",
    "IX.2 Purchaser\u2019s Right of Cancellation. Notwithstanding Sections VII.2 and IX.1: (a) the Purchaser may cancel this Agreement prior to midnight of the fifth calendar day after the date of this transaction; (b) if the Purchaser exercises this right by valid written notice within that period, the full amount paid shall be returned to the Purchaser within five (5) business days of the Broker receiving the notice.",
    "IX.3 Refund Contingency for Dishonored Payments. If the Purchaser cancels within the cancellation period and any payment is subsequently dishonored or returned unpaid: (a) the Purchaser shall be liable for the full amount of the returned payment plus all returned item fees, bank fees, chargeback fees and collection costs (including reasonable attorneys\u2019 fees); (b) the Broker\u2019s refund obligation is fulfilled upon issuing the refund within the applicable timeframe, but the Purchaser remains financially responsible for the payment failure.",
    "IX.4 Broker\u2019s Failure to Perform (Exclusive Remedy). If the Broker is unable to complete the transfer of the specific Interment Rights for reasons solely attributable to the Broker\u2019s own default, the Purchaser\u2019s exclusive and sole remedy shall be the full refund of all monies paid to the Broker, and the Broker shall not be liable for any additional or consequential damages, including the cost of purchasing similar rights elsewhere.",
  ] },
  { heading: "Article X. Electronic Signatures and Execution", body: [
    "X.1 Electronic Records. The parties agree to conduct this transaction by electronic means. Each party\u2019s electronic signature and initials, together with the audit trail recorded with this Agreement (signer name and email, date and time, IP address, device information and a SHA-256 fingerprint of the signed content), are attributable to that party and have the same legal effect as handwritten signatures under the U.S. E-SIGN Act and the Texas Uniform Electronic Transactions Act.",
    "X.2 Effective Date. This Agreement becomes binding on the Broker when countersigned by an authorized representative of Texas Cemetery Brokers. The date of this transaction for the purposes of the cancellation right in Section IX.2 is the date the Purchaser signs.",
    "X.3 Copies. A fully executed PDF copy of this Agreement is emailed to the Purchaser after countersignature and may be requested at any time from info@texascemeterybrokers.com.",
  ] },
];

/** Canonical text the buyer agrees to — used for the SHA-256 document fingerprint. */
export function canonicalDocument(fields: AgreementFields, version = TERMS_VERSION): string {
  return JSON.stringify({
    version, fields: normalizeFields(fields), totals: chargeTotals(normalizeFields(fields).charges),
    cancellation: CANCELLATION_NOTICE, acknowledgements: ACKNOWLEDGEMENTS.map((a) => a.text), esign: ESIGN_CONSENT,
    terms: TERMS,
  });
}
