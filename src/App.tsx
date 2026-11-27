import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, createRoutesFromElements, matchRoutes } from "react-router-dom";
import { Suspense, type ComponentType, type ReactNode } from "react";
import { lazyPage } from "@/lib/lazyPage";
import { AuthProvider } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import PageTransition from "@/components/PageTransition";


// Eagerly load landing-priority pages — first hits for crawlers and users.
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import NotFound from "./pages/NotFound";

// Lazy-load secondary public pages and all private dashboards. Trims the
// initial JS payload, improving LCP and Core Web Vitals (good for SEO).
const Properties2 = lazyPage(() => import("./pages/Properties2"));
const BuyProperty = lazyPage(() => import("./pages/BuyProperty"));
const SellProperty = lazyPage(() => import("./pages/SellProperty"));
const Auth = lazyPage(() => import("./pages/Auth"));
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const CreateListing = lazyPage(() => import("./pages/CreateListing"));
const PropertyTypes = lazyPage(() => import("./pages/PropertyTypes"));
const Blog = lazyPage(() => import("./pages/Blog"));
const Team = lazyPage(() => import("./pages/Team"));
const Admin = lazyPage(() => import("./pages/Admin"));
const GlendaleScan = lazyPage(() => import("./pages/GlendaleScan"));
const PhotoLibrary = lazyPage(() => import("./pages/admin/PhotoLibrary"));
const AgentDashboard = lazyPage(() => import("./pages/AgentDashboard"));
const Home2 = lazyPage(() => import("./pages/Home2"));
const Partners = lazyPage(() => import("./pages/Partners"));
const CemeteryDirectory = lazyPage(() => import("./pages/CemeteryDirectory"));
const CemeteryDetail = lazyPage(() => import("./pages/CemeteryDetail"));
const Contact = lazyPage(() => import("./pages/Contact"));
const Guides = lazyPage(() => import("./pages/Guides"));
const GuideCemeteryBroker = lazyPage(() => import("./pages/GuideCemeteryBroker"));
const GuideSellingCemeteryPlot = lazyPage(() => import("./pages/GuideSellingCemeteryPlot"));
const GuideBuyingCemeteryPlot = lazyPage(() => import("./pages/GuideBuyingCemeteryPlot"));
const GuideCemeteryPlotCost = lazyPage(() => import("./pages/GuideCemeteryPlotCost"));
const GuideCemeteryPlotWorth = lazyPage(() => import("./pages/GuideCemeteryPlotWorth"));
const GuidePreneedCemeteryPlots = lazyPage(() => import("./pages/GuidePreneedCemeteryPlots"));
const GuideCemeteryTransferProcess = lazyPage(() => import("./pages/GuideCemeteryTransferProcess"));
const GuidePlanningFuneralTexas = lazyPage(() => import("./pages/GuidePlanningFuneralTexas"));
const CityPlotsPage = lazyPage(() => import("./pages/CityPlotsPage"));
import { CITY_PAGES } from "./pages/city-page-data";
const ThankYou = lazyPage(() => import("./pages/ThankYou"));
const ThankYouBuyer = lazyPage(() => import("./pages/ThankYouBuyer"));
const Privacy = lazyPage(() => import("./pages/Privacy"));
const PaymentSuccess = lazyPage(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazyPage(() => import("./pages/PaymentCancelled"));
const Unsubscribe = lazyPage(() => import("./pages/Unsubscribe"));
const SignContract = lazyPage(() => import("./pages/SignContract"));
const SignPurchaseAgreement = lazyPage(() => import("./pages/SignPurchaseAgreement"));
const SelectStarter = lazyPage(() => import("./pages/SelectStarter"));
const SellerPortal = lazyPage(() => import("./pages/SellerPortal"));
const SellerPortalMobileUpload = lazyPage(() => import("./pages/SellerPortalMobileUpload"));
const SellerIntakeUpload = lazyPage(() => import("./pages/SellerIntakeUpload"));
const SellerDocuments = lazyPage(() => import("./pages/SellerDocuments"));
const OwnershipConfirm = lazyPage(() => import("./pages/OwnershipConfirm"));
const OwnershipConfirmV3 = lazyPage(() => import("./pages/OwnershipConfirmV3"));
const FileViewer = lazyPage(() => import("./pages/FileViewer"));



const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite" />
);

const routeElements = (
              <Route element={<PageTransition />}>
                <Route path="/" element={<Index />} />
                <Route path="/home2" element={<Home2 />} />
                <Route path="/property-types" element={<PropertyTypes />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/properties-2" element={<Properties2 />} />
                <Route path="/buy" element={<BuyProperty />} />
                <Route path="/sell" element={<SellProperty />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create-listing" element={<CreateListing />} />
                <Route path="/edit-listing/:id" element={<CreateListing />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<Blog />} />
                <Route path="/team" element={<Team />} />
<Route path="/admin" element={<Admin />} />
                <Route path="/admin/glendale-scan" element={<GlendaleScan />} />
                <Route path="/admin/photos" element={<PhotoLibrary />} />
                <Route path="/agent" element={<AgentDashboard />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/cemeteries" element={<CemeteryDirectory />} />
                <Route path="/cemeteries/:slug" element={<CemeteryDetail />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/guides" element={<Guides />} />
                <Route path="/guides/what-does-a-cemetery-broker-do" element={<GuideCemeteryBroker />} />
                <Route path="/sell-cemetery-plot-texas" element={<GuideSellingCemeteryPlot />} />
                <Route path="/cemetery-plots-for-sale-texas" element={<GuideBuyingCemeteryPlot />} />
                <Route path="/cemetery-plot-cost-texas" element={<GuideCemeteryPlotCost />} />
                <Route path="/what-is-my-cemetery-plot-worth-texas" element={<GuideCemeteryPlotWorth />} />
                <Route path="/cemetery-plot-value-calculator" element={<Navigate to="/cemetery-plot-cost-texas#plot-value-calculator" replace />} />
                <Route path="/preneed-cemetery-plots-texas" element={<GuidePreneedCemeteryPlots />} />
                <Route path="/cemetery-transfer-process-texas" element={<GuideCemeteryTransferProcess />} />
                <Route path="/guides/planning-a-funeral-in-texas" element={<GuidePlanningFuneralTexas />} />
                {CITY_PAGES.map((c) => (
                  <Route key={c.slug} path={`/cemetery-plots-for-sale-${c.slug}`} element={<CityPlotsPage />} />
                ))}
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/thank-you/buyer" element={<ThankYouBuyer />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/select-starter" element={<SelectStarter />} />
                <Route path="/seller-portal" element={<SellerPortal />} />
                <Route path="/seller-portal/upload/mobile" element={<SellerPortalMobileUpload />} />
                <Route path="/seller-upload" element={<SellerIntakeUpload />} />
                <Route path="/documents" element={<SellerDocuments />} />
                <Route path="/confirm" element={<OwnershipConfirm />} />
                <Route path="/confirm-v3" element={<OwnershipConfirmV3 />} />
                <Route path="/file-viewer" element={<FileViewer />} />


                <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="/sign/:token" element={<SignContract />} />
                <Route path="/purchase-agreement/:token" element={<SignPurchaseAgreement />} />
                <Route path="/buying-a-cemetery-plot-in-texas" element={<Navigate to="/cemetery-plots-for-sale-texas" replace />} />
                {/* Redirects for old routes */}
                <Route path="/listings" element={<Navigate to="/properties" replace />} />
                <Route path="/blog" element={<Navigate to="/guides" replace />} />
                <Route path="/blog/sell-cemetery-plot-texas" element={<Navigate to="/sell-cemetery-plot-texas" replace />} />
                <Route path="/blog/:slug" element={<Navigate to="/guides" replace />} />
                <Route path="/guides/selling-a-cemetery-plot-in-texas" element={<Navigate to="/sell-cemetery-plot-texas" replace />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Route>
);

// Loads the code for the page at `pathname` ahead of the first render, so a
// pre-rendered page is replaced by the live one without a blank frame.
export async function preloadRouteFor(pathname: string): Promise<void> {
  const matches = matchRoutes(createRoutesFromElements(routeElements), pathname) ?? [];
  await Promise.all(
    matches.map((m) => {
      const type = (m.route.element as { type?: { preload?: () => Promise<void> } } | undefined)?.type;
      return type?.preload?.();
    }),
  );
}

type RouterComponent = ComponentType<{ children?: ReactNode }>;

// The whole app with a pluggable router: the browser uses BrowserRouter, the
// build-time page renderer (src/entry-prerender.tsx) passes a StaticRouter.
export const AppShell = ({ Router }: { Router: RouterComponent }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <ScrollToTop />
          
          <Suspense fallback={<RouteFallback />}>
            <Routes>{routeElements}</Routes>
          </Suspense>
        </Router>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

const App = () => <AppShell Router={BrowserRouter} />;

export default App;
