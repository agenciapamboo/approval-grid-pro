import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";

// Lazy load all pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ContentGrid = lazy(() => import("./pages/ContentGrid"));
const AgencyContentManager = lazy(() => import("./pages/AgencyContentManager"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Success = lazy(() => import("./pages/Success"));
const MySubscription = lazy(() => import("./pages/MySubscription"));
const MyAccount = lazy(() => import("./pages/MyAccount"));
const HeroDemo = lazy(() => import("./pages/HeroDemo"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreativeRequests = lazy(() => import("./pages/CreativeRequests"));
const SocialConnect = lazy(() => import("./pages/SocialConnect"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DataDeletion = lazy(() => import("./pages/DataDeletion"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const BlockedIPs = lazy(() => import("./pages/BlockedIPs"));
const ClientHistory = lazy(() => import("./pages/ClientHistory"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/linkderecuperacao" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/planos" element={<Pricing />} />
              <Route path="/success" element={<Success />} />
              <Route path="/minha-assinatura" element={<MySubscription />} />
              <Route path="/minha-conta" element={<MyAccount />} />
              <Route path="/agency/client/:clientId" element={<AgencyContentManager />} />
              <Route path="/agency/creative-requests" element={<CreativeRequests />} />
              <Route path="/agency/creative-requests/:clientId" element={<CreativeRequests />} />
              <Route path="/:agencySlug/:clientSlug" element={<ContentGrid />} />
              <Route path="/a/:agencySlug/c/:clientSlug" element={<ContentGrid />} />
              
              <Route path="/hero" element={<HeroDemo />} />
              <Route path="/social-connect" element={<SocialConnect />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/data-deletion" element={<DataDeletion />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/central-de-ajuda" element={<HelpCenter />} />
              <Route path="/admin/blocked-ips" element={<BlockedIPs />} />
              <Route path="/client/:clientId/history" element={<ClientHistory />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
