import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import PageTransition from "@/components/PageTransition";
import BottomPagePill from "@/components/BottomPagePill";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import Properties2 from "./pages/Properties2";
import BuyProperty from "./pages/BuyProperty";
import SellProperty from "./pages/SellProperty";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateListing from "./pages/CreateListing";
import NotFound from "./pages/NotFound";
import PropertyTypes from "./pages/PropertyTypes";
import Blog from "./pages/Blog";
import Team from "./pages/Team";
import Admin from "./pages/Admin";
import AgentDashboard from "./pages/AgentDashboard";
import Home2 from "./pages/Home2";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <BottomPagePill />
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
              {/* Redirects for old routes */}
              <Route path="/listings" element={<Navigate to="/properties" replace />} />
              <Route path="/cemeteries" element={<Navigate to="/properties" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
