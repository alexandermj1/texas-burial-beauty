import { lazy, type ComponentType } from "react";

type PageModule = { default: ComponentType<any> };

export type PreloadablePage = ComponentType<any> & { preload: () => Promise<void> };

// Drop-in replacement for React.lazy for route pages. Once a page's code has
// been preloaded it renders straight away with no Suspense fallback, which lets
// the pre-rendered HTML of a page be swapped for the live app without a blank
// frame in between.
export function lazyPage(factory: () => Promise<PageModule>): PreloadablePage {
  let Loaded: ComponentType<any> | null = null;
  const Lazy = lazy(factory);
  const Page = ((props: Record<string, unknown>) =>
    Loaded ? <Loaded {...props} /> : <Lazy {...props} />) as PreloadablePage;
  Page.preload = () =>
    factory().then((m) => {
      Loaded = m.default;
    });
  return Page;
}
