import { useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, Search, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterTransferRecords, recordedTransferFee, transferRegions } from "@/lib/cemeteryTransferDirectory";
const PAGE_SIZE = 12;
export default function CemeteryTransferDirectory() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [page, setPage] = useState(0);
  const matches = filterTransferRecords(query, region);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = matches.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  return (
    <section id="cemetery-transfer-fees" className="scroll-mt-28 border-t border-border py-12 md:py-16" aria-labelledby="transfer-directory-heading">
      <p className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary"><span className="h-px w-10 bg-primary/40" />The cemetery reference</p>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-2xl"><h2 id="transfer-directory-heading" className="font-display text-3xl leading-tight text-foreground md:text-[2.5rem]">Texas cemetery transfer fees <span className="italic text-primary">& addresses.</span></h2><p className="mt-4 text-base leading-relaxed text-muted-foreground">Cemeteries in our coverage records, with locations, official website links where available, and transfer charges on file.</p></div>
        <p className="shrink-0 text-xs text-muted-foreground">Compiled · October 17, 2026</p>
      </div>
      <aside className="my-7 flex items-start gap-3 border-y border-primary/20 bg-primary/5 px-4 py-5 md:px-6" aria-label="Recorded fee accuracy notice">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm leading-relaxed text-foreground/80"><p><strong className="font-semibold text-foreground">From our records, not a current cemetery quote.</strong> These transfer fees may be outdated or incorrect. Confirm the current fee, whether it applies per space or per transfer, and any additional charges directly with the cemetery before making arrangements.</p><p className="mt-2 text-muted-foreground">“Not recorded” means we do not have that information—not that the transfer is free or that endowment care is included. Endowment-care charges may apply separately. The compilation date is not a fee-verification date.</p></div>
      </aside>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_240px]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search cemeteries, cities or addresses" placeholder="Search cemetery, city or address" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className="h-11 bg-card pl-10" /></div>
        <Select value={region} onValueChange={(value) => { setRegion(value); setPage(0); }}><SelectTrigger aria-label="Filter by region" className="h-11 bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Texas regions</SelectItem>{transferRegions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
      </div>
      <table className="block w-full border-b border-border md:table md:table-fixed">
        <caption className="sr-only">Cemetery addresses and transfer fees from our records; charges may be outdated or incorrect.</caption>
        <thead className="hidden border-y border-primary/25 bg-secondary/50 md:table-header-group"><tr>{["Cemetery & location", "Address", "Transfer fee on file", "Endowment care"].map((label, index) => <th key={label} scope="col" className={`px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-primary ${index === 0 ? "w-[31%]" : index === 1 ? "w-[29%]" : "w-[20%]"}`}>{label}</th>)}</tr></thead>
        <tbody className="block md:table-row-group">{visible.map((record) => (
          <tr key={`${record.name}-${record.city}`} className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border px-1 py-6 transition-colors even:bg-secondary/20 md:table-row md:px-0 md:py-0 md:hover:bg-primary/5">
            <th scope="row" className="col-span-2 min-w-0 text-left align-top font-normal md:px-4 md:py-6"><p className="break-words font-display text-xl leading-snug text-foreground">{record.name}</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{[record.city, record.county ? `${record.county} County` : null].filter(Boolean).join(" · ") || record.region}</p>{record.website && <a href={record.website} target="_blank" rel="noopener noreferrer" aria-label={`Official website for ${record.name}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline decoration-primary/30 underline-offset-4">Official website <ExternalLink className="h-3 w-3" /></a>}</th>
            <td className="col-span-2 align-top text-sm leading-relaxed text-foreground/80 md:px-4 md:py-6"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">Address</span><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" /><span className="break-words">{record.address || "Address not recorded"}{record.address && record.city && <span className="block text-muted-foreground">{record.city}, Texas</span>}</span></div></td>
            <td className="align-top md:px-4 md:py-6"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:hidden">Transfer fee on file</span><p className={record.transferFee === null ? "text-sm text-muted-foreground" : "font-display text-2xl tabular-nums text-primary"}>{recordedTransferFee(record.transferFee)}</p><p className="mt-1.5 text-[11px] text-muted-foreground">{record.transferFee === null ? "Confirm with cemetery" : "Recorded amount · USD"}</p></td>
            <td className="align-top text-sm leading-relaxed text-muted-foreground md:px-4 md:py-6"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:hidden">Endowment care</span>{record.endowmentNotes || "Not recorded"}</td>
          </tr>
        ))}</tbody>
      </table>
      {!visible.length && <p role="status" className="border-b border-border py-12 text-center text-muted-foreground">No cemeteries match this search.</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><p aria-live="polite" className="text-xs text-muted-foreground">{matches.length ? `${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, matches.length)} of ${matches.length} cemeteries` : "0 cemeteries"}</p><nav aria-label="Cemetery table pages" className="flex items-center gap-3"><Button variant="outline" size="icon" aria-label="Previous cemetery page" disabled={current === 0} onClick={() => setPage(current - 1)}><ArrowLeft className="h-4 w-4" /></Button><span className="min-w-14 text-center text-xs tabular-nums text-muted-foreground">{current + 1} / {pages}</span><Button variant="outline" size="icon" aria-label="Next cemetery page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}><ArrowRight className="h-4 w-4" /></Button></nav></div>
    </section>
  );
}
