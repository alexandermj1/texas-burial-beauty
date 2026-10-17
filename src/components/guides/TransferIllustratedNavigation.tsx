import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import deed from "@/assets/transfer/deed-papers.png";
import family from "@/assets/transfer/family-tree.png";
import cemetery from "@/assets/transfer/cemetery-gates.png";

const topics = [
  { image: deed, number: "01", title: "Start with the deed.", description: "Understand the ownership record and the documents to gather.", href: "#nature", action: "Ownership & paperwork" },
  { image: family, number: "02", title: "Follow the family.", description: "See how inheritance and burial rights affect who needs to sign.", href: "#owner-buried", action: "Who signs the transfer?" },
  { image: cemetery, number: "03", title: "Check the cemetery.", description: "Find addresses and recorded fees, then confirm its current requirements.", href: "#cemetery-transfer-fees", action: "Cemetery fees & addresses" },
];

export default function TransferIllustratedNavigation() {
  return (
    <nav aria-label="Explore the transfer process" className="grid gap-8 border-y border-foreground/20 py-7 sm:grid-cols-3 sm:gap-0">
      {topics.map((topic, index) => (
        <div key={topic.number} className={`group relative min-w-0 px-2 sm:px-5 lg:px-8 ${index ? "border-t border-foreground/15 pt-6 sm:border-l sm:border-t-0 sm:pt-0" : ""}`}>
          <Button asChild variant="ghost" className="h-auto w-full flex-col items-stretch whitespace-normal rounded-md p-0 text-left hover:bg-transparent">
            <a href={topic.href} aria-label={topic.action}>
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"><span>Step {topic.number}</span><ArrowRight className="h-4 w-4 text-primary transition-transform motion-safe:group-hover:translate-x-1" /></div>
              <div className="my-2 flex h-40 items-center justify-center sm:h-44 lg:h-52"><img src={topic.image} alt="" width={1024} height={1024} loading="lazy" className="h-full w-full object-contain transition-transform duration-500 motion-safe:group-hover:scale-105" /></div>
              <h2 className="font-display text-2xl font-normal leading-snug text-foreground lg:text-3xl">{topic.title}</h2>
              <p className="mt-3 text-sm font-normal leading-relaxed text-muted-foreground">{topic.description}</p>
              <span className="mt-5 text-xs font-medium text-primary underline decoration-primary/30 underline-offset-4">{topic.action}</span>
            </a>
          </Button>
        </div>
      ))}
    </nav>
  );
}