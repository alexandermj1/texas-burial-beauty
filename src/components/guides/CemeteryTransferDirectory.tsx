import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, Search, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterTransferRecords, recordedTransferFee, transferRegions } from "@/lib/cemeteryTransferDirectory";
const PAGE_SIZE = 12;

export default function CemeteryTransferDirectory({ area, scope }: { area?: string; scope?: string }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [page, setPage] = useState(0);
  const matches = filterTransferRecords(query, region, scope);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = matches.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <section id="cemetery-transfer-fees" className="scroll-mt-28 border-t border-foreground/20 py-12 md:py-16" aria-labelledby="transfer-directory-heading">
      <p className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary"><span className="h-px w-10 bg-primary/40" />The cemetery reference</p>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-3xl"><h2 id="transfer-directory-heading" className="font-display text-4xl leading-[1.08] text-foreground md:text-6xl">{area || "Texas"} cemetery transfer fees <span className="italic text-primary">& addresses.</span></h2><p className="mt-4 text-base leading-relaxed text-muted-foreground">{area ? `A local reference for ${area}, showing only cemeteries with a transfer fee in our records.` : "A Texas reference showing only cemeteries with a transfer fee in our records."} Find the address, recorded charge and official website where available.</p></div>
        <p className="shrink-0 text-xs text-muted-foreground">Compiled · October 17, 2026</p>
      </div>

      <aside className="my-7 flex items-start gap-3 border-y border-primary/20 bg-primary/5 px-4 py-5 md:px-6" aria-label="Recorded fee accuracy notice">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm leading-relaxed text-foreground/80"><p><strong className="font-semibold text-foreground">From our records, not a current cemetery quote.</strong> These transfer fees may be outdated or incorrect. Confirm the current fee, whether it applies per space or per transfer, and any additional charges directly with the cemetery before making arrangements.</p><p className="mt-2 text-muted-foreground">The compilation date is not a fee-verification date.</p></div>
      </aside>

      <div className={`mb-5 grid gap-3 ${scope ? "sm:max-w-lg" : "sm:grid-cols-[1fr_240px]"}`}>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search cemeteries, cities or addresses" placeholder="Search cemetery, city or address" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className="h-11 bg-card pl-10" /></div>
        {!scope && <Select value={region} onValueChange={(value) => { setRegion(value); setPage(0); }}><SelectTrigger aria-label="Filter by region" className="h-11 bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Texas regions</SelectItem>{transferRegions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>}
      </div>

      <figure className="relative bg-background">
        {/* Print-style double frame */}
        <div className="border border-foreground/40 p-1.5 md:p-2">
          <div className="border border-foreground/15">
            {/* Masthead */}
            <div className="flex flex-col gap-2 border-b border-foreground/15 px-4 py-5 sm:flex-row sm:items-baseline sm:justify-between md:px-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">{area ? `${area} · Fee register` : "Texas · Fee register"}</p>
              <p className="font-display text-sm italic text-muted-foreground">{matches.length} {matches.length === 1 ? "cemetery" : "cemeteries"} on record</p>
            </div>

            <table className="block w-full md:table md:table-fixed">
              <caption className="sr-only">Cemetery addresses and transfer fees from our records; charges may be outdated or incorrect.</caption>
              <thead className="hidden border-b border-foreground/25 bg-secondary/40 md:table-header-group">
                <tr>
                  {["No.", "Cemetery & location", "Address", "Transfer fee on file"].map((label, index) => (
                    <th key={label} scope="col" className={`px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-primary ${index === 0 ? "w-[6%]" : index === 1 ? "w-[34%]" : index === 2 ? "w-[36%]" : "w-[24%]"}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {visible.map((record, index) => (
                  <tr key={`${record.name}-${record.city}`} className="group grid grid-cols-2 gap-x-4 gap-y-5 border-b border-foreground/10 px-4 py-6 transition-colors last:border-b-0 hover:bg-primary/[0.04] md:table-row md:px-0 md:py-0 md:align-top">
                    <td aria-hidden="true" className="hidden md:table-cell md:px-4 md:py-6"><span className="font-display text-sm italic text-muted-foreground/70">{pad(current * PAGE_SIZE + index + 1)}</span></td>
                    <th scope="row" className="col-span-2 min-w-0 text-left align-top font-normal md:px-4 md:py-6">
                      <p className="break-words font-display text-xl leading-snug text-foreground md:text-2xl">{record.name}</p>
                      <p className="mt-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">{[record.city, record.county ? `${record.county} Co.` : null].filter(Boolean).join(" · ") || record.region}</p>
                      {record.website && <a href={record.website} target="_blank" rel="noopener noreferrer" aria-label={`Official website for ${record.name}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary">Official website <ExternalLink className="h-3 w-3" /></a>}
                    </th>
                    <td className="col-span-2 align-top text-sm leading-relaxed text-foreground/75 md:px-4 md:py-6">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">Address</span>
                      <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" /><span className="break-words">{record.address || "Address not recorded"}{record.address && record.city && <span className="block text-muted-foreground">{record.city}, Texas</span>}</span></div>
                    </td>
                    <td className="col-span-2 align-top md:px-4 md:py-6">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">Transfer fee on file</span>
                      <p className="font-display text-3xl tabular-nums leading-none text-primary md:text-4xl">{recordedTransferFee(record.transferFee)}</p>
                      <p className="mt-2.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{record.transferFee === null ? "Confirm with cemetery" : "Recorded amount · USD"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!visible.length && <p role="status" className="py-12 text-center text-muted-foreground">No cemeteries match this search.</p>}

            {/* Ornament */}
            {visible.length > 0 && (
              <div aria-hidden="true" className="flex items-center justify-center gap-4 py-6">
                <span className="h-px w-16 bg-foreground/20" />
                <span className="text-xs text-primary/70">✦</span>
                <span className="h-px w-16 bg-foreground/20" />
              </div>
            )}

            {/* Pagination bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/15 bg-secondary/30 px-4 py-4 md:px-8">
              <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">{matches.length ? `${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, matches.length)} of ${matches.length}` : "0 cemeteries"}</p>
              <nav aria-label="Cemetery table pages" className="flex items-center gap-3">
                <Button variant="outline" size="icon" aria-label="Previous cemetery page" disabled={current === 0} onClick={() => setPage(current - 1)}><ArrowLeft className="h-4 w-4" /></Button>
                <span className="min-w-14 text-center font-display text-sm italic tabular-nums text-muted-foreground">{current + 1} / {pages}</span>
                <Button variant="outline" size="icon" aria-label="Next cemetery page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}><ArrowRight className="h-4 w-4" /></Button>
              </nav>
            </div>
          </div>
        </div>
        <figcaption className="sr-only">A framed register of recorded cemetery transfer fees and addresses.</figcaption>
      </figure>

      {area && <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-foreground/20 pt-6"><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Moving several spaces on one deed? Ask whether transferring them together can avoid a second transfer charge.</p><Button asChild variant="link" className="h-auto whitespace-normal p-0 text-left"><Link to="/cemetery-transfer-process-texas">Read the transfer guide <ArrowRight className="ml-2 h-4 w-4 shrink-0" /></Link></Button></div>}
    </section>
  );
}
