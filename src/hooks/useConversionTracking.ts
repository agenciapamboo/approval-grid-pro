import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    fbq?: any;
    gtag?: any;
    ttq?: any;
    lintrk?: any;
    pintrk?: any;
  }
}

export function useConversionTracking() {
  const [pixelsLoaded, setPixelsLoaded] = useState(false);

  useEffect(() => {
    loadPixelsAndInject();
  }, []);

  const loadPixelsAndInject = async () => {
    try {
      // Buscar configuração GLOBAL (sem client_id)
      const { data: pixels } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!pixels) {
        console.log('Nenhum pixel global configurado');
        return;
      }

      // Injetar Meta Pixel
      if (pixels.meta_pixel_id) {
        injectMetaPixel(pixels.meta_pixel_id);
      }

      // Injetar Google gtag
      if (pixels.google_ads_conversion_id || pixels.google_analytics_id) {
        injectGoogleGtag(pixels);
      }

      // Injetar TikTok Pixel
      if (pixels.tiktok_pixel_id) {
        injectTikTokPixel(pixels.tiktok_pixel_id);
      }

      // Injetar LinkedIn Insight Tag
      if (pixels.linkedin_partner_id) {
        injectLinkedInTag(pixels.linkedin_partner_id);
      }

      // Injetar Pinterest Tag
      if (pixels.pinterest_tag_id) {
        injectPinterestTag(pixels.pinterest_tag_id);
      }

      setPixelsLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar pixels:', error);
    }
  };

  const trackEvent = async (
    eventName: 'PageView' | 'InitiateCheckout' | 'Purchase' | 'CheckoutError',
    eventData?: {
      value?: number;
      currency?: string;
      subscription_plan?: string;
      subscription_type?: 'monthly' | 'annual';
      error_message?: string;
      plan?: string;
      billing_cycle?: string;
    }
  ) => {
    try {
      // Obter user_id se estiver logado
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const userEmail = user?.email;

      // 1. Disparar eventos client-side
      if (window.fbq) {
        window.fbq('track', eventName, eventData);
      }

      if (window.gtag) {
        const gtagEventName = eventName === 'Purchase' ? 'purchase' :
          eventName === 'InitiateCheckout' ? 'begin_checkout' : 'page_view';
        window.gtag('event', gtagEventName, eventData);
      }

      if (window.ttq) {
        const tiktokEventMap: Record<string, string> = {
          'PageView': 'ViewContent',
          'InitiateCheckout': 'InitiateCheckout',
          'Purchase': 'CompletePayment',
        };
        window.ttq.track(tiktokEventMap[eventName], eventData);
      }

      if (window.lintrk && eventName === 'Purchase') {
        window.lintrk('track', { conversion_id: eventData?.value });
      }

      if (window.pintrk) {
        const pinterestEventMap: Record<string, string> = {
          'PageView': 'pagevisit',
          'Purchase': 'checkout',
          'InitiateCheckout': 'checkout',
        };
        window.pintrk('track', pinterestEventMap[eventName] || 'pagevisit', eventData);
      }

      // 2. Disparar server-side tracking
      const { error } = await supabase.functions.invoke('track-conversion', {
        body: {
          user_id: userId || null,
          event_name: eventName,
          event_source_url: window.location.href,
          user_data: {
            email: userEmail,
            client_ip_address: await getUserIP(),
            client_user_agent: navigator.userAgent,
          },
          custom_data: eventData,
          utm_params: getUTMParams(),
        },
      });

      if (error) {
        console.error('Erro ao rastrear conversão:', error);
      }
    } catch (error) {
      console.error('Erro ao rastrear evento:', error);
    }
  };

  return { trackEvent, pixelsLoaded };
}

// Helper: Extrair parâmetros UTM da URL
function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };
}

// Helper: Obter IP do usuário
async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return '';
  }
}

// Injetar Meta Pixel
function injectMetaPixel(pixelId: string) {
  if (document.getElementById('meta-pixel-script')) return;

  const script = document.createElement('script');
  script.id = 'meta-pixel-script';
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);
}

// Injetar Google gtag
function injectGoogleGtag(pixels: any) {
  if (document.getElementById('gtag-script')) return;

  const script = document.createElement('script');
  script.id = 'gtag-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${pixels.google_ads_conversion_id || pixels.google_analytics_id}`;
  document.head.appendChild(script);

  const inlineScript = document.createElement('script');
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    ${pixels.google_ads_conversion_id ? `gtag('config', '${pixels.google_ads_conversion_id}');` : ''}
    ${pixels.google_analytics_id ? `gtag('config', '${pixels.google_analytics_id}');` : ''}
  `;
  document.head.appendChild(inlineScript);
}

// Injetar TikTok Pixel
function injectTikTokPixel(pixelId: string) {
  if (document.getElementById('tiktok-pixel-script')) return;

  const script = document.createElement('script');
  script.id = 'tiktok-pixel-script';
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  `;
  document.head.appendChild(script);
}

// Injetar LinkedIn Insight Tag
function injectLinkedInTag(partnerId: string) {
  if (document.getElementById('linkedin-insight-script')) return;

  const script = document.createElement('script');
  script.id = 'linkedin-insight-script';
  script.innerHTML = `
    _linkedin_partner_id = "${partnerId}";
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(_linkedin_partner_id);
  `;
  document.head.appendChild(script);

  const script2 = document.createElement('script');
  script2.type = 'text/javascript';
  script2.async = true;
  script2.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  document.head.appendChild(script2);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${partnerId}&fmt=gif" />`;
  document.body.appendChild(noscript);
}

// Injetar Pinterest Tag
function injectPinterestTag(tagId: string) {
  if (document.getElementById('pinterest-tag-script')) return;

  const script = document.createElement('script');
  script.id = 'pinterest-tag-script';
  script.innerHTML = `
    !function(e){if(!window.pintrk){window.pintrk = function () {
    window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
      n=window.pintrk;n.queue=[],n.version="3.0";var
      t=document.createElement("script");t.async=!0,t.src=e;var
      r=document.getElementsByTagName("script")[0];
      r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
    pintrk('load', '${tagId}');
    pintrk('page');
  `;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none;" alt="" src="https://ct.pinterest.com/v3/?event=init&tid=${tagId}&noscript=1" />`;
  document.body.appendChild(noscript);
}
