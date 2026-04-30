// Cemetery Plot Quoting Tool — deterministic UI per spec.
// Loads sales_for_app.csv (in /public), computes quote in-browser, no backend.

import { useEffect, useMemo, useState } from "react";
import {
  loadSales,
  getCemeteryOptions,
  getLawnOptions,
  computeQuote,
  PROPERTY_TYPES,
  fmtMoney,
  fmtPct,
  type SaleRow,
  type QuoteResult,
} from "@/lib/quoteEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_BADGE: Record<number, { label: string; className: string }> = {
  1: { label: "Direct match", className: "bg-emerald-600 text-white hover:bg-emerald-600" },
  2: { label: "Cemetery + lawn", className: "bg-lime-500 text-white hover:bg-lime-500" },
  3: { label: "Cemetery + plot type", className: "bg-amber-500 text-white hover:bg-amber-500" },
  4: { label: "Cemetery only", className: "bg-orange-500 text-white hover:bg-orange-500" },
};

const CONF_COLOR: Record<string, string> = {
  HIGH: "bg-emerald-100 text-emerald-800 border-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-orange-100 text-orange-800 border-orange-300",
  VERY_LOW: "bg-rose-100 text-rose-800 border-rose-300",
};

function ComboBox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  allowEmpty,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                  <span className="italic text-muted-foreground">(any / unknown)</span>
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const QuoteEstimatorPanel = () => {
  const [rows, setRows] = useState<SaleRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [cem, setCem] = useState("");
  const [lawn, setLawn] = useState("");
  const [ptype, setPtype] = useState<string>("SINGLE_GRAVE");
  const [retail, setRetail] = useState<string>("");
  const [qty, setQty] = useState<string>("1");

  const [result, setResult] = useState<QuoteResult | null>(null);

  useEffect(() => {
    loadSales()
      .then(setRows)
      .catch((e) => setLoadErr(e?.message || String(e)));
  }, []);

  const cemOptions = useMemo(() => (rows ? getCemeteryOptions(rows) : []), [rows]);
  const lawnOptions = useMemo(
    () => (rows && cem ? getLawnOptions(rows, cem) : []),
    [rows, cem],
  );

  // Recompute on change with 200ms debounce
  useEffect(() => {
    if (!rows) return;
    const retailNum = Number(retail);
    const qtyNum = Math.max(1, Math.floor(Number(qty) || 1));
    if (!cem || !ptype || !retailNum || retailNum <= 0) {
      setResult(null);
      return;
    }
    const t = setTimeout(() => {
      const r = computeQuote(rows, {
        cem_key: cem,
        lawn_key: lawn,
        ptype_norm: ptype,
        retail_price: retailNum,
        quantity: qtyNum,
      });
      setResult(r);
    }, 200);
    return () => clearTimeout(t);
  }, [rows, cem, lawn, ptype, retail, qty]);

  // Reset lawn when cemetery changes if lawn no longer valid
  useEffect(() => {
    if (lawn && !lawnOptions.includes(lawn)) setLawn("");
  }, [lawnOptions, lawn]);

  const maxWeight = result?.topComps?.[0]?.weight ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cemetery Plot Quoting Tool</h1>
        <p className="text-sm text-muted-foreground">
          Backtested MAE: 7–9 percentage points · 80% interval coverage: ~75%
        </p>
      </div>

      {loadErr && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
          Failed to load sales data: {loadErr}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* LEFT — Inputs */}
        <Card className="lg:sticky lg:top-4 self-start">
          <CardHeader>
            <CardTitle className="text-lg">Quote Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cemetery *</Label>
              <ComboBox
                value={cem}
                onChange={setCem}
                options={cemOptions}
                placeholder={rows ? "Select cemetery" : "Loading..."}
                disabled={!rows}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Lawn / Garden</Label>
              <ComboBox
                value={lawn}
                onChange={setLawn}
                options={lawnOptions}
                placeholder={cem ? "Select lawn (optional)" : "Pick cemetery first"}
                disabled={!cem}
                allowEmpty
              />
            </div>

            <div className="space-y-1.5">
              <Label>Property Type *</Label>
              <Select value={ptype} onValueChange={setPtype}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Retail Price ($) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={retail}
                onChange={(e) => setRetail(e.target.value)}
                placeholder="11500"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              Quote auto-recomputes as you type.
            </p>
          </CardContent>
        </Card>

        {/* RIGHT — Output */}
        <div className="space-y-6">
          {!result && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Enter cemetery, property type, and retail price to generate a quote.
              </CardContent>
            </Card>
          )}

          {result?.refuse && (
            <Card className="border-rose-300 bg-rose-50">
              <CardContent className="py-6 flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5" />
                <div className="text-sm text-rose-900">
                  <div className="font-semibold mb-1">Cannot quote</div>
                  <div>
                    No comparable sales found at this cemetery. The model refuses to quote because
                    cross-cemetery data is not predictive. Recommend manual review.
                  </div>
                  {result.reason && <div className="mt-2 text-xs opacity-80">{result.reason}</div>}
                </div>
              </CardContent>
            </Card>
          )}

          {result && !result.refuse && (
            <>
              {/* Headline */}
              <Card>
                <CardContent className="py-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={TIER_BADGE[result.tier!].className}>
                      Tier {result.tier} · {TIER_BADGE[result.tier!].label}
                    </Badge>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        CONF_COLOR[result.confidence!],
                      )}
                    >
                      {result.confidence!.replace("_", " ")} confidence
                    </span>
                    <span className="text-xs text-muted-foreground">
                      n = {result.nComps} sales · effN = {result.effN!.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Predicted Sale Price
                    </div>
                    <div className="text-4xl font-bold">{fmtMoney(result.predictedSaleDollars!)}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      80% range: {fmtMoney(result.lowerDollars!)} – {fmtMoney(result.upperDollars!)}{" "}
                      · {fmtPct(result.predictedSalePct!)} of retail
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Owner quote tiers */}
              <div className="grid gap-4 md:grid-cols-3">
                <OfferCard
                  label="AGGRESSIVE"
                  subtitle="Best for company"
                  pct={30}
                  amount={result.offers!.aggressive}
                  className="border-sky-400 bg-sky-50"
                  accent="text-sky-900"
                />
                <OfferCard
                  label="STANDARD"
                  subtitle="Balanced"
                  pct={35}
                  amount={result.offers!.standard}
                  className="border-emerald-400 bg-emerald-50"
                  accent="text-emerald-900"
                />
                <OfferCard
                  label="GENEROUS"
                  subtitle="Best acceptance"
                  pct={40}
                  amount={result.offers!.generous}
                  className="border-amber-400 bg-amber-50"
                  accent="text-amber-900"
                />
              </div>

              {/* Rationale */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Rationale</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {result.rationale}
                </CardContent>
              </Card>

              {/* Comp table */}
              <Card>
                <Collapsible defaultOpen>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer">
                      <CardTitle className="text-base flex items-center justify-between">
                        Top {result.topComps!.length} comparable sales
                        <ChevronsUpDown className="h-4 w-4 opacity-60" />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year</TableHead>
                            <TableHead>Lawn</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Retail $</TableHead>
                            <TableHead className="text-right">Sold $</TableHead>
                            <TableHead className="text-right">Resale %</TableHead>
                            <TableHead className="text-right">Adj %</TableHead>
                            <TableHead className="text-right">Weight</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.topComps!.map((c, i) => {
                            const intensity = Math.min(1, c.weight / (maxWeight || 1));
                            const bg = `rgba(16, 185, 129, ${0.08 + intensity * 0.45})`;
                            return (
                              <TableRow key={i}>
                                <TableCell>{c.year ?? "—"}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{c.lawn_key || "—"}</TableCell>
                                <TableCell className="text-xs">{c.ptype_norm}</TableCell>
                                <TableCell className="text-right">{fmtMoney(c.retail_price)}</TableCell>
                                <TableCell className="text-right">{fmtMoney(c.resale_price)}</TableCell>
                                <TableCell className="text-right">{fmtPct(c.resale_pct)}</TableCell>
                                <TableCell className="text-right">{fmtPct(c.adjustedPct)}</TableCell>
                                <TableCell className="text-right tabular-nums" style={{ background: bg }}>
                                  {c.weight.toFixed(3)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* About the model */}
              <Card>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer">
                      <CardTitle className="text-sm flex items-center justify-between text-muted-foreground">
                        About the model · validated accuracy
                        <ChevronsUpDown className="h-4 w-4 opacity-60" />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="text-xs space-y-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tier</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead className="text-right">Typical $ error</TableHead>
                            <TableHead className="text-right">80% coverage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow><TableCell>1</TableCell><TableCell>Cemetery + Lawn + Plot type</TableCell><TableCell className="text-right">~7%</TableCell><TableCell className="text-right">~80%</TableCell></TableRow>
                          <TableRow><TableCell>2</TableCell><TableCell>Cemetery + Lawn</TableCell><TableCell className="text-right">~15%</TableCell><TableCell className="text-right">~50%</TableCell></TableRow>
                          <TableRow><TableCell>3</TableCell><TableCell>Cemetery + Plot type</TableCell><TableCell className="text-right">~11%</TableCell><TableCell className="text-right">~75%</TableCell></TableRow>
                          <TableRow><TableCell>4</TableCell><TableCell>Cemetery only</TableCell><TableCell className="text-right">~10%</TableCell><TableCell className="text-right">~90%</TableCell></TableRow>
                        </TableBody>
                      </Table>
                      <p className="text-muted-foreground">
                        Methodology: 25% holdout backtest on 2024–2026 sales (n=255). Overall MAE
                        of percentage prediction = 6.97 pp. Bias after calibration ≈ −0.10 pp.
                      </p>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function OfferCard({
  label,
  subtitle,
  pct,
  amount,
  className,
  accent,
}: {
  label: string;
  subtitle: string;
  pct: number;
  amount: number;
  className: string;
  accent: string;
}) {
  return (
    <Card className={cn("border-2", className)}>
      <CardContent className="py-5">
        <div className={cn("text-xs font-bold tracking-wider", accent)}>{label}</div>
        <div className="text-xs text-muted-foreground mb-3">{subtitle}</div>
        <div className={cn("text-3xl font-bold", accent)}>{fmtMoney(amount)}</div>
        <div className="text-xs text-muted-foreground mt-1">{pct}% of predicted sale</div>
      </CardContent>
    </Card>
  );
}

export default QuoteEstimatorPanel;
