import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import PageTransition from "@/components/PageTransition";


// Eagerly load landing-priority pages — first hits for crawlers and users.
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import NotFound from "./pages/NotFound";

// Lazy-load secondary public pages and all private dashboards. Trims the
// initial JS payload, improving LCP and Core Web Vitals (good for SEO).
const Properties2 = lazy(() => import("./pages/Properties2"));
const BuyProperty = lazy(() => import("./pages/BuyProperty"));
const SellProperty = lazy(() => import("./pages/SellProperty"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const PropertyTypes = lazy(() => import("./pages/PropertyTypes"));
const Blog = lazy(() => import("./pages/Blog"));
const Team = lazy(() => import("./pages/Team"));
const Admin = lazy(() => import("./pages/Admin"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const Home2 = lazy(() => import("./pages/Home2"));
const Partners = lazy(() => import("./pages/Partners"));
const CemeteryDirectory = lazy(() => import("./pages/CemeteryDirectory"));
const CemeteryDetail = lazy(() => import("./pages/CemeteryDetail"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite" />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          
          <Suspense fallback={<RouteFallback />}>
            <Routes>
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
                <Route path="/agent" element={<AgentDashboard />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/cemeteries" element={<CemeteryDirectory />} />
                <Route path="/cemeteries/:slug" element={<CemeteryDetail />} />
                {/* Redirects for old routes */}
                <Route path="/listings" element={<Navigate to="/properties" replace />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
