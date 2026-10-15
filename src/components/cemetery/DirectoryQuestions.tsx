import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const questions = [
  {
    q: "How do I buy a cemetery plot in Texas from a private owner?",
    a: "The seller’s ownership and authority to sell are verified with the cemetery, you agree a price, and the cemetery records the transfer under its rules. We coordinate verification, paperwork, payment and a showing where available, so both families know what is being transferred.",
    href: "/cemetery-plots-for-sale-texas", link: "The buying guide",
  },
  {
    q: "Are cemetery plots cheaper bought privately?",
    a: "Usually, yes. Pre-owned plots can cost 30–50% less than comparable cemetery retail, depending on the park, section and available property. The space remains in the same cemetery. Compare the complete buyer price, including the cemetery’s transfer fee and any buyer premium, rather than the plot price alone.",
    href: "/cemetery-plot-cost-texas", link: "Understand the full cost",
  },
  {
    q: "Can I buy a plot in a sold-out section?",
    a: "Often a resale is the only route. If the cemetery has no new space to offer in a section, an existing owner may still be able to transfer unused property there. Tell us the garden or section and whether you need to be near a relative; availability is specific to the location and is never guaranteed.",
    href: "/buy", link: "Tell us where you’re looking",
  },
  {
    q: "What does the cemetery charge to transfer a plot?",
    a: "Each cemetery sets its own transfer or recording fee. Some charge per space; others charge once for the transfer. Laurel Land Fort Worth’s fee on our current file is $595 per space. We confirm the current amount and how it applies to your purchase, and show it separately from the property price.",
    href: "/cemeteries/laurel-land-memorial-park-fort-worth", link: "Laurel Land Fort Worth prices & fees",
  },
  {
    q: "Do you cover my cemetery?",
    a: "Our directory covers parks across Dallas–Fort Worth, Greater Houston, Austin, San Antonio, El Paso and beyond. If yours isn’t listed, ask us anyway. We check the cemetery’s transfer rules and whether we can help with your particular property before recommending a next step.",
    href: "/contact", link: "Ask about your cemetery",
  },
  {
    q: "How do I sell a cemetery plot I inherited?",
    a: "Start with the ownership certificate or deed and the names recorded on it. The cemetery’s rules and the family’s circumstances determine who must sign and which supporting documents are needed. Our ownership questionnaire helps establish that starting point before we prepare the transfer paperwork; a death certificate alone does not establish who can sell.",
    href: "/cemetery-transfer-process-texas", link: "Inherited plots & the transfer process",
  },
];

export default function DirectoryQuestions() {
  return (
    <section aria-labelledby="directory-questions" className="mt-12 border-y border-border bg-background/95 py-10 md:mt-16 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.7fr] lg:gap-16">
        <div>
          <p className="mb-4 text-xs font-medium uppercase text-primary">Before you choose</p>
          <h2 id="directory-questions" className="font-display text-3xl leading-tight text-foreground md:text-4xl">
            The same cemetery.<br /><span className="italic text-primary">Another way to buy.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">Private resale, cemetery fees and inherited ownership — the details worth knowing first.</p>
        </div>
        <Accordion type="single" collapsible className="border-t border-border">
          {questions.map((question, i) => (
            <AccordionItem key={question.q} value={`question-${i}`} className="border-border">
              <AccordionTrigger className="gap-4 py-5 text-left font-display text-lg font-normal leading-snug text-foreground hover:text-primary hover:no-underline md:text-xl">
                <span className="flex items-start gap-4"><span aria-hidden className="mt-1.5 shrink-0 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><span>{question.q}</span></span>
              </AccordionTrigger>
              <AccordionContent className="pl-8 pr-6 text-base leading-relaxed text-muted-foreground">
                <p>{question.a}</p>
                <Link to={question.href} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">{question.link}<ArrowRight aria-hidden className="h-4 w-4 shrink-0" /></Link>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}