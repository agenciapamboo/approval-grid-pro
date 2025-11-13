import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useConversionTracking } from "@/hooks/useConversionTracking";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ClientApproval = lazy(() => import("./pages/ClientApproval"));
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
const Clientes = lazy(() => import("./pages/Clientes"));
const ClienteDetalhes = lazy(() => import("./pages/ClienteDetalhes"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Agencias = lazy(() => import("./pages/Agencias"));
const AgenciaDetalhes = lazy(() => import("./pages/AgenciaDetalhes"));
const Notifications = lazy(() => import("./pages/Notifications"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const AgencyTicketsManager = lazy(() => import("./pages/admin/AgencyTicketsManager"));
const SupportTicketsAdmin = lazy(() => import("./pages/admin/SupportTicketsAdmin"));
const UsersManager = lazy(() => import("./pages/admin/UsersManager"));
const UserAuditLog = lazy(() => import("./pages/admin/UserAuditLog"));
const StripeConfig = lazy(() => import("./pages/admin/StripeConfig"));
const StripeSync = lazy(() => import("./pages/admin/StripeSync"));
const StripeDiagnostic = lazy(() => import("./pages/admin/StripeDiagnostic"));
const ActiveSessions = lazy(() => import("./pages/admin/ActiveSessions"));
const TwoFactorHistory = lazy(() => import("./pages/admin/TwoFactorHistory"));
const SecurityDashboard = lazy(() => import("./pages/admin/SecurityDashboard"));
const TrustedIPs = lazy(() => import("./pages/admin/TrustedIPs"));
const ManageApprovers = lazy(() => import("./pages/ManageApprovers"));
const CheckoutLoading = lazy(() => import("./pages/CheckoutLoading"));

const queryClient = new QueryClient();

// Componente para gerenciar pixels e PageView
function PixelManager() {
  const { pixelsLoaded } = useConversionTracking();

  useEffect(() => {
    if (pixelsLoaded) {
      console.log('✅ Pixels globais carregados');
    }
  }, [pixelsLoaded]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PixelManager />
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
                <Route path="/aprovar" element={<ClientApproval />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/data-deletion" element={<DataDeletion />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/central-de-ajuda" element={<HelpCenter />} />
                <Route path="/checkout-loading" element={<CheckoutLoading />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/planos" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
                <Route path="/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />
                <Route path="/minha-assinatura" element={<ProtectedRoute><MySubscription /></ProtectedRoute>} />
                <Route path="/minha-conta" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                <Route path="/clientes/:clientId" element={<ProtectedRoute><ClienteDetalhes /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
                <Route path="/agencias" element={<ProtectedRoute><Agencias /></ProtectedRoute>} />
                <Route path="/agencias/:id" element={<ProtectedRoute><AgenciaDetalhes /></ProtectedRoute>} />
                <Route path="/agency/client/:clientId" element={<ProtectedRoute><AgencyContentManager /></ProtectedRoute>} />
                <Route path="/agency/creative-requests" element={<ProtectedRoute><CreativeRequests /></ProtectedRoute>} />
                <Route path="/agency/creative-requests/:clientId" element={<ProtectedRoute><CreativeRequests /></ProtectedRoute>} />
                <Route path="/social-connect" element={<ProtectedRoute><SocialConnect /></ProtectedRoute>} />
                <Route path="/admin/blocked-ips" element={<ProtectedRoute><BlockedIPs /></ProtectedRoute>} />
                <Route path="/client/:clientId/history" element={<ProtectedRoute><ClientHistory /></ProtectedRoute>} />
                <Route path="/hero" element={<ProtectedRoute><HeroDemo /></ProtectedRoute>} />
                <Route path="/notificacoes" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/meus-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
                <Route path="/agencia/tickets" element={<ProtectedRoute><AgencyTicketsManager /></ProtectedRoute>} />
                <Route path="/admin/tickets" element={<ProtectedRoute><SupportTicketsAdmin /></ProtectedRoute>} />
                <Route path="/admin/usuarios" element={<ProtectedRoute><UsersManager /></ProtectedRoute>} />
                <Route path="/admin/auditoria-usuarios" element={<ProtectedRoute><UserAuditLog /></ProtectedRoute>} />
                <Route path="/admin/stripe" element={<ProtectedRoute><StripeConfig /></ProtectedRoute>} />
                <Route path="/admin/stripe-sync" element={<ProtectedRoute><StripeSync /></ProtectedRoute>} />
                <Route path="/admin/stripe-diagnostic" element={<ProtectedRoute><StripeDiagnostic /></ProtectedRoute>} />
                <Route path="/admin/sessoes-2fa" element={<ProtectedRoute><ActiveSessions /></ProtectedRoute>} />
                <Route path="/admin/historico-2fa" element={<ProtectedRoute><TwoFactorHistory /></ProtectedRoute>} />
                <Route path="/admin/dashboard-seguranca" element={<ProtectedRoute><SecurityDashboard /></ProtectedRoute>} />
                <Route path="/admin/ips-confiaveis" element={<ProtectedRoute><TrustedIPs /></ProtectedRoute>} />
                <Route path="/meus-aprovadores" element={<ProtectedRoute><ManageApprovers /></ProtectedRoute>} />
                <Route path="/content-grid" element={<ProtectedRoute><ContentGrid /></ProtectedRoute>} />
                
                {/* Public approval pages */}
                <Route path="/:agencySlug/:clientSlug" element={<ContentGrid />} />
                <Route path="/a/:agencySlug/c/:clientSlug" element={<ContentGrid />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
