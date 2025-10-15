import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ContentGrid from "./pages/ContentGrid";
import AgencyContentManager from "./pages/AgencyContentManager";
import AdminPasswordReset from "./pages/AdminPasswordReset";
import HeroDemo from "./pages/HeroDemo";
import NotFound from "./pages/NotFound";
import CreativeRequests from "./pages/CreativeRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/linkderecuperacao" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agency/client/:clientId" element={<AgencyContentManager />} />
            <Route path="/agency/creative-requests" element={<CreativeRequests />} />
            <Route path="/agency/creative-requests/:clientId" element={<CreativeRequests />} />
            <Route path="/:agencySlug/:clientSlug" element={<ContentGrid />} />
            <Route path="/a/:agencySlug/c/:clientSlug" element={<ContentGrid />} />
            <Route path="/admin/reset-passwords" element={<AdminPasswordReset />} />
            <Route path="/hero" element={<HeroDemo />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
