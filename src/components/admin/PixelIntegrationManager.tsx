import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Facebook, Chrome, TrendingUp, Linkedin, Pin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientSelector } from "./ClientSelector";

interface PixelConfig {
  meta_pixel_id?: string;
  meta_access_token?: string;
  meta_test_event_code?: string;
  google_ads_conversion_id?: string;
  google_ads_conversion_label?: string;
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  tiktok_pixel_id?: string;
  tiktok_access_token?: string;
  linkedin_partner_id?: string;
  pinterest_tag_id?: string;
  pinterest_access_token?: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

export function PixelIntegrationManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [config, setConfig] = useState<PixelConfig>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadPixelConfig();
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, slug')
      .order('name');

    if (data) {
      setClients(data);
    }
  };

  const loadPixelConfig = async () => {
    if (!selectedClientId) return;

    const { data, error } = await supabase
      .from('tracking_pixels')
      .select('*')
      .eq('client_id', selectedClientId)
      .single();

    if (data) {
      setConfig({
        meta_pixel_id: data.meta_pixel_id,
        meta_test_event_code: data.meta_test_event_code,
        google_ads_conversion_id: data.google_ads_conversion_id,
        google_ads_conversion_label: data.google_ads_conversion_label,
        google_analytics_id: data.google_analytics_id,
        google_tag_manager_id: data.google_tag_manager_id,
        tiktok_pixel_id: data.tiktok_pixel_id,
        linkedin_partner_id: data.linkedin_partner_id,
        pinterest_tag_id: data.pinterest_tag_id,
      });
    } else {
      setConfig({});
    }
  };

  const savePixelConfig = async () => {
    if (!selectedClientId) {
      toast.error('Selecione um cliente primeiro');
      return;
    }

    setLoading(true);
    try {
      const encryptedConfig: any = {
        client_id: selectedClientId,
        meta_pixel_id: config.meta_pixel_id,
        meta_test_event_code: config.meta_test_event_code,
        google_ads_conversion_id: config.google_ads_conversion_id,
        google_ads_conversion_label: config.google_ads_conversion_label,
        google_analytics_id: config.google_analytics_id,
        google_tag_manager_id: config.google_tag_manager_id,
        tiktok_pixel_id: config.tiktok_pixel_id,
        linkedin_partner_id: config.linkedin_partner_id,
        pinterest_tag_id: config.pinterest_tag_id,
      };

      // Criptografar tokens se fornecidos
      if (config.meta_access_token) {
        const { data: encrypted } = await supabase.rpc('encrypt_social_token', {
          token: config.meta_access_token,
        });
        encryptedConfig.meta_access_token_encrypted = encrypted;
      }

      if (config.tiktok_access_token) {
        const { data: encrypted } = await supabase.rpc('encrypt_social_token', {
          token: config.tiktok_access_token,
        });
        encryptedConfig.tiktok_access_token_encrypted = encrypted;
      }

      if (config.pinterest_access_token) {
        const { data: encrypted } = await supabase.rpc('encrypt_social_token', {
          token: config.pinterest_access_token,
        });
        encryptedConfig.pinterest_access_token_encrypted = encrypted;
      }

      const { error } = await supabase
        .from('tracking_pixels')
        .upsert(encryptedConfig);

      if (error) throw error;

      toast.success('Configurações de pixels salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ClientSelector
        clients={clients}
        selectedClientId={selectedClientId}
        onClientSelect={setSelectedClientId}
      />

      {selectedClientId && (
        <Card>
          <CardHeader>
            <CardTitle>Pixels de Rastreamento e Conversão</CardTitle>
            <CardDescription>
              Configure pixels para Meta, Google, TikTok, LinkedIn e Pinterest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="meta" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="meta">
                  <Facebook className="h-4 w-4 mr-2" />
                  Meta
                </TabsTrigger>
                <TabsTrigger value="google">
                  <Chrome className="h-4 w-4 mr-2" />
                  Google
                </TabsTrigger>
                <TabsTrigger value="tiktok">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  TikTok
                </TabsTrigger>
                <TabsTrigger value="linkedin">
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </TabsTrigger>
                <TabsTrigger value="pinterest">
                  <Pin className="h-4 w-4 mr-2" />
                  Pinterest
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meta" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Configure o Meta Pixel e a Conversions API para rastrear eventos no Facebook e Instagram.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="meta_pixel_id">Meta Pixel ID</Label>
                  <Input
                    id="meta_pixel_id"
                    placeholder="123456789012345"
                    value={config.meta_pixel_id || ''}
                    onChange={(e) => setConfig({ ...config, meta_pixel_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_access_token">Access Token (Conversions API)</Label>
                  <Input
                    id="meta_access_token"
                    type="password"
                    placeholder="Access token para Conversions API"
                    value={config.meta_access_token || ''}
                    onChange={(e) => setConfig({ ...config, meta_access_token: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Obtenha em: Events Manager → Settings → Conversions API
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_test_code">Test Event Code (opcional)</Label>
                  <Input
                    id="meta_test_code"
                    placeholder="TEST12345"
                    value={config.meta_test_event_code || ''}
                    onChange={(e) => setConfig({ ...config, meta_test_event_code: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="google" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Configure Google Ads, Analytics 4 e Tag Manager para rastreamento completo.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="google_ads_id">Google Ads Conversion ID</Label>
                  <Input
                    id="google_ads_id"
                    placeholder="AW-123456789"
                    value={config.google_ads_conversion_id || ''}
                    onChange={(e) => setConfig({ ...config, google_ads_conversion_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_ads_label">Conversion Label</Label>
                  <Input
                    id="google_ads_label"
                    placeholder="AbC1DeFgHiJk2LmN3OpQ"
                    value={config.google_ads_conversion_label || ''}
                    onChange={(e) => setConfig({ ...config, google_ads_conversion_label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_analytics_id">Google Analytics 4 ID</Label>
                  <Input
                    id="google_analytics_id"
                    placeholder="G-XXXXXXXXXX"
                    value={config.google_analytics_id || ''}
                    onChange={(e) => setConfig({ ...config, google_analytics_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_tag_manager_id">Google Tag Manager ID</Label>
                  <Input
                    id="google_tag_manager_id"
                    placeholder="GTM-XXXXXXX"
                    value={config.google_tag_manager_id || ''}
                    onChange={(e) => setConfig({ ...config, google_tag_manager_id: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="tiktok" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Configure o TikTok Pixel e Events API para rastrear conversões.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="tiktok_pixel_id">TikTok Pixel ID</Label>
                  <Input
                    id="tiktok_pixel_id"
                    placeholder="XXXXXXXXXXXXXX"
                    value={config.tiktok_pixel_id || ''}
                    onChange={(e) => setConfig({ ...config, tiktok_pixel_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok_access_token">Access Token (Events API)</Label>
                  <Input
                    id="tiktok_access_token"
                    type="password"
                    placeholder="Access token para TikTok Events API"
                    value={config.tiktok_access_token || ''}
                    onChange={(e) => setConfig({ ...config, tiktok_access_token: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Obtenha em: TikTok Ads Manager → Assets → Events
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="linkedin" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Configure o LinkedIn Insight Tag para rastreamento de conversões.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_partner_id">LinkedIn Partner ID</Label>
                  <Input
                    id="linkedin_partner_id"
                    placeholder="123456"
                    value={config.linkedin_partner_id || ''}
                    onChange={(e) => setConfig({ ...config, linkedin_partner_id: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Obtenha em: Campaign Manager → Account Assets → Insight Tag
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="pinterest" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Configure o Pinterest Tag para rastreamento de conversões.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="pinterest_tag_id">Pinterest Tag ID</Label>
                  <Input
                    id="pinterest_tag_id"
                    placeholder="2612345678901"
                    value={config.pinterest_tag_id || ''}
                    onChange={(e) => setConfig({ ...config, pinterest_tag_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pinterest_access_token">Access Token (opcional)</Label>
                  <Input
                    id="pinterest_access_token"
                    type="password"
                    placeholder="Access token para Pinterest Conversions API"
                    value={config.pinterest_access_token || ''}
                    onChange={(e) => setConfig({ ...config, pinterest_access_token: e.target.value })}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex gap-2">
              <Button onClick={savePixelConfig} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
