import { Link } from "react-router-dom";
import { emmaEditorial, type EmmaTopic } from "@/data/emmaEditorial";

export default function EmmaEditorialPassage({ topic }: { topic: EmmaTopic }) {
  const passage = emmaEditorial[topic];
  return <section data-emma-editorial={topic} className="my-10 border-t border-border py-8 md:my-14 md:py-10">
    <h2 data-simon-review className="mb-5 font-display text-3xl leading-tight text-foreground md:text-4xl">{passage.title}</h2>
    <div className="space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">
      {passage.paragraphs.map((paragraph) => <p data-simon-review key={paragraph}>{paragraph}</p>)}
    </div>
  </section>;
}

export function CemeteryEditorialNote({ name }: { name: string }) {
  return <section data-emma-editorial="cemetery" className="border-y border-border bg-background py-10 md:py-14">
    <div className="container mx-auto max-w-6xl px-6">
      <h2 data-simon-review className="mb-5 font-display text-3xl leading-tight text-foreground">Before choosing or selling a space at {name}</h2>
      <p data-simon-review className="mb-4 text-base leading-relaxed text-muted-foreground">Look beyond the cemetery name to the actual position: the route from the road, whether relatives can reach it comfortably, and whether the space is near the people or features that matter to the family. A plot, niche and crypt each serve different needs. Confirm the permitted use, capacity and marker rules with {name} before choosing.</p>
      <p data-simon-review className="text-base leading-relaxed text-muted-foreground">For a sale, the ownership record and required signatures matter as much as the location. A missing deed or an inherited space needs review, not an assumption that it cannot be sold—or that one relative can sign for everyone. The cemetery’s precision protects both families. These are questions to check, not a statement that this cemetery has a particular policy or available inventory.</p>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-primary">
        <Link className="underline underline-offset-4" to="/property-types">Compare property types</Link>
        <Link className="underline underline-offset-4" to="/cemetery-transfer-process-texas">Ownership and transfer requirements</Link>
      </div>
    </div>
  </section>;
}