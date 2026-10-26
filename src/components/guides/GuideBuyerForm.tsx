import BuyerWizard from "@/components/BuyerWizard";

/** One shared editorial frame for buyer enquiries across guides and metros. */
const GuideBuyerForm = ({ source, inquiryChannel }: { source: string; inquiryChannel: string }) => (
  <section aria-label="Buyer enquiry" className="not-prose my-16 rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 px-5 sm:px-8 pt-8 pb-6 shadow-soft">
    <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-2 text-center">Free buyer concierge</p>
    <p className="text-center text-foreground/70 text-sm sm:text-base max-w-xl mx-auto mb-6">
      Tell us what you're looking for and we'll come back within 24 hours with verified spaces — including sections the cemetery has sold out.
    </p>
    <BuyerWizard variant="embedded" source={source} inquiryChannel={inquiryChannel} />
  </section>
);

export default GuideBuyerForm;