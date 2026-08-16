import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

const LAST_UPDATED = "August 16, 2026";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-28">
    <h2 className="font-display text-2xl text-foreground mb-3">{title}</h2>
    <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Seo
      title="Privacy Policy | Texas Cemetery Brokers"
      description="How Texas Cemetery Brokers collects, uses, shares, and protects personal information, and the privacy rights available to Texas, California, and other users."
      path="/privacy"
    />
    <Navbar />

    <main className="container mx-auto px-6 pt-32 pb-20 max-w-3xl">
      <p className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground mb-3">Legal</p>
      <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-4">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-10">
        <Section id="intro" title="1. Who we are">
          <p>
            This Privacy Policy explains how Texas Cemetery Brokers ("we", "us", "our") handles personal
            information collected through texascemeterybrokers.com, our email correspondence, our seller and
            buyer portals, and related brokerage services. We work in partnership with Bayer Cemetery Brokers.
          </p>
          <p>
            By using this site or submitting information to us, you agree to the practices described here. If you
            do not agree, please do not use the site or send us personal information.
          </p>
        </Section>

        <Section id="collect" title="2. Information we collect">
          <p>We collect information you give us directly, and a limited amount automatically:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <span className="text-foreground">Contact and inquiry details</span> — name, email address, phone
              number, mailing address, and the content of messages you send us.
            </li>
            <li>
              <span className="text-foreground">Property details</span> — cemetery name, section, lot and space
              numbers, property type, ownership history, timelines, and pricing expectations.
            </li>
            <li>
              <span className="text-foreground">Transaction paperwork</span> — documents you upload or mail to us,
              which may include deeds or certificates of ownership, identification documents, death certificates,
              wills, letters testamentary, affidavits, powers of attorney, and signature information. Some of these
              are sensitive; we ask for them only where they are needed to verify ownership and complete a transfer.
            </li>
            <li>
              <span className="text-foreground">Account information</span> — email address and authentication data
              if you create a seller portal or agent account.
            </li>
            <li>
              <span className="text-foreground">Payment information</span> — payments are processed by Stripe. We
              receive confirmation and limited billing details; we do not receive or store full card numbers.
            </li>
            <li>
              <span className="text-foreground">Technical data</span> — IP address, browser and device type, pages
              viewed, referring page, and similar log data, plus location only if you choose to share it when using
              the cemetery finder.
            </li>
          </ul>
        </Section>

        <Section id="use" title="3. How we use information">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To respond to inquiries, provide valuations, and market listed property.</li>
            <li>To verify ownership and prepare, complete, and record transfer paperwork.</li>
            <li>To operate accounts, portals, and document requests.</li>
            <li>To process payments and keep transaction records.</li>
            <li>To send service messages and, where permitted, occasional updates you can unsubscribe from.</li>
            <li>To maintain security, prevent fraud, resolve disputes, and comply with legal obligations.</li>
          </ul>
          <p>
            We do not sell personal information, and we do not share it for cross-context behavioral advertising.
          </p>
        </Section>

        <Section id="share" title="4. When we share information">
          <p>We share personal information only as needed to deliver our services or as required by law:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Cemeteries and their transfer departments, to process ownership transfers.</li>
            <li>Buyers, sellers, and their representatives as necessary to complete a transaction.</li>
            <li>Bayer Cemetery Brokers, as our brokerage partner.</li>
            <li>
              Service providers who work on our behalf — hosting and database providers, email delivery, e-signature
              and notary services, payment processing (Stripe), and analytics — under obligations to protect the data.
            </li>
            <li>Professional advisers such as attorneys, escrow, or title services when a transaction requires it.</li>
            <li>Government agencies, courts, or others where required by law or to protect legal rights and safety.</li>
            <li>A successor entity in the event of a merger, acquisition, or sale of assets.</li>
          </ul>
        </Section>

        <Section id="retention" title="5. Retention">
          <p>
            We keep personal information for as long as needed to provide our services and to satisfy legal,
            accounting, tax, and recordkeeping obligations that apply to real property and brokerage transactions.
            Completed transaction records are generally retained for several years. When information is no longer
            needed, we delete it or de-identify it.
          </p>
        </Section>

        <Section id="security" title="6. Security">
          <p>
            We use reasonable administrative and technical safeguards, including encrypted connections to our site,
            access controls on staff accounts, and restricted document storage. No method of transmission or storage
            is completely secure, so we cannot guarantee absolute security. Please avoid sending sensitive documents
            through unsecured channels; use the portal links we provide where possible.
          </p>
        </Section>

        <Section id="rights" title="7. Your privacy rights">
          <p>
            Depending on where you live — including under the Texas Data Privacy and Security Act, the California
            Consumer Privacy Act as amended, and similar state laws — you may have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Know what personal information we hold about you and how we use it.</li>
            <li>Request a copy of that information, or a portable copy.</li>
            <li>Request correction of inaccurate information.</li>
            <li>Request deletion, subject to records we must keep by law.</li>
            <li>Opt out of the sale or sharing of personal information (we do not sell or share it).</li>
            <li>Limit the use of sensitive personal information to what is needed for the service.</li>
            <li>Not be discriminated against for exercising these rights.</li>
          </ul>
          <p>
            To make a request, email{" "}
            <a href="mailto:info@texascemeterybrokers.com" className="text-foreground underline underline-offset-4">
              info@texascemeterybrokers.com
            </a>{" "}
            or call (214) 230-4740. We will verify your identity before acting, and you may use an authorized agent.
            We aim to respond within 45 days. If we decline a request, you may appeal by replying to our response.
          </p>
          <p>
            If you are in the EEA or UK, you may also have rights to object to or restrict processing and to lodge a
            complaint with your supervisory authority. Our legal bases are performance of a contract, legitimate
            interests in operating our brokerage, consent where required, and compliance with legal obligations.
          </p>
        </Section>

        <Section id="cookies" title="8. Cookies and tracking">
          <p>
            We use cookies and similar technologies that are necessary for the site to work (such as keeping you
            signed in) and a limited set for analytics that help us understand how pages are used. You can block or
            delete cookies in your browser settings; some features may not work if you do. We honor Global Privacy
            Control signals where required by law. We do not use cookies for targeted advertising.
          </p>
        </Section>

        <Section id="email" title="9. Email and text communications">
          <p>
            We send transactional emails related to your inquiry or transaction, and, if you have opted in,
            occasional listing or market updates. Every marketing email includes an unsubscribe link, and you can
            also email us to opt out. If you provide a phone number, you may receive calls or texts about your
            inquiry; reply STOP to opt out of texts. Message and data rates may apply.
          </p>
        </Section>

        <Section id="children" title="10. Children">
          <p>
            Our services are intended for adults. We do not knowingly collect personal information from anyone under
            18. If you believe a minor has provided us information, contact us and we will delete it.
          </p>
        </Section>

        <Section id="thirdparty" title="11. Third-party sites">
          <p>
            Our site may link to cemeteries, notary services, payment pages, and other third-party websites. Their
            privacy practices are their own, and we are not responsible for them. Please review their policies.
          </p>
        </Section>

        <Section id="changes" title="12. Changes to this policy">
          <p>
            We may update this policy from time to time. The "Last updated" date above reflects the most recent
            version, and material changes will be posted on this page. Continued use of the site after an update
            means you accept the revised policy.
          </p>
        </Section>

        <Section id="contact" title="13. Contact us">
          <p>
            Texas Cemetery Brokers
            <br />
            Email:{" "}
            <a href="mailto:info@texascemeterybrokers.com" className="text-foreground underline underline-offset-4">
              info@texascemeterybrokers.com
            </a>
            <br />
            Phone:{" "}
            <a href="tel:+12142304740" className="text-foreground underline underline-offset-4">
              (214) 230-4740
            </a>
            <br />
            Mailing address (in care of our brokerage partner, Bayer Cemetery Brokers): 100 N Brand Blvd, Ste 213,
            Glendale, CA 91203
          </p>
          <p className="text-xs">
            This page describes our own practices and is provided for general information. It is not legal advice.
          </p>
        </Section>
      </div>
    </main>

    <Footer />
  </div>
);

export default Privacy;
