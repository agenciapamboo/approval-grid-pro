import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrackingConfig {
  clientId: string;
  enableMeta?: boolean;
  enableGoogle?: boolean;
  enableTikTok?: boolean;
  enableLinkedIn?: boolean;
  enablePinterest?: boolean;
}

interface TrackEventData {
  currency?: string;
  value?: number;
  content_ids?: string[];
  content_type?: string;
  content_category?: string;
  num_items?: number;
}

declare global {
  interface Window {
    fbq?: any;
    gtag?: any;
    ttq?: any;
    lintrk?: any;
    pintrk?: any;
  }
}

export function useConversionTracking(config: TrackingConfig) {
  const [pixelsLoaded, setPixelsLoaded] = useState(false);

  useEffect(() => {
    loadPixelsAndInject();
  }, [config.clientId]);

  const loadPixelsAndInject = async () => {
    const { data: pixels } = await supabase
      .from('tracking_pixels')
      .select('*')
      .eq('client_id', config.clientId)
      .eq('is_active', true)
      .single();

    if (!pixels) return;

    // Injetar Meta Pixel
    if (config.enableMeta && pixels.meta_pixel_id) {
      injectMetaPixel(pixels.meta_pixel_id);
    }

    // Injetar Google gtag
    if (config.enableGoogle && (pixels.google_ads_conversion_id || pixels.google_analytics_id)) {
      injectGoogleGtag(pixels);
    }

    // Injetar TikTok Pixel
    if (config.enableTikTok && pixels.tiktok_pixel_id) {
      injectTikTokPixel(pixels.tiktok_pixel_id);
    }

    // Injetar LinkedIn Insight Tag
    if (config.enableLinkedIn && pixels.linkedin_partner_id) {
      injectLinkedInTag(pixels.linkedin_partner_id);
    }

    // Injetar Pinterest Tag
    if (config.enablePinterest && pixels.pinterest_tag_id) {
      injectPinterestTag(pixels.pinterest_tag_id);
    }

    setPixelsLoaded(true);
  };

  const trackEvent = async (
    eventName: 'PageView' | 'InitiateCheckout' | 'Purchase' | 'AddToCart' | 'ViewContent',
    eventData?: TrackEventData
  ) => {
    // 1. Disparar eventos client-side
    if (window.fbq) {
      window.fbq('track', eventName, eventData);
    }
    
    if (window.gtag) {
      const gtagEventName = eventName === 'Purchase' ? 'purchase' : 
                           eventName === 'InitiateCheckout' ? 'begin_checkout' :
                           eventName === 'AddToCart' ? 'add_to_cart' :
                           eventName === 'ViewContent' ? 'view_item' : 'page_view';
      window.gtag('event', gtagEventName, eventData);
    }
    
    if (window.ttq) {
      const tiktokEventMap: Record<string, string> = {
        'PageView': 'ViewContent',
        'InitiateCheckout': 'InitiateCheckout',
        'Purchase': 'CompletePayment',
        'AddToCart': 'AddToCart',
        'ViewContent': 'ViewContent',
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
        'AddToCart': 'addtocart',
        'ViewContent': 'pagevisit',
      };
      window.pintrk('track', pinterestEventMap[eventName] || 'pagevisit', eventData);
    }

    // 2. Enviar para backend (server-side tracking)
    try {
      const utmParams = getUTMParams();
      
      await supabase.functions.invoke('track-conversion', {
        body: {
          client_id: config.clientId,
          event_name: eventName,
          event_source_url: window.location.href,
          user_data: {
            client_user_agent: navigator.userAgent,
          },
          custom_data: eventData,
          utm_params: utmParams,
        },
      });
    } catch (error) {
      console.error('Error sending server-side conversion:', error);
    }
  };

  return { trackEvent, pixelsLoaded };
}

// Helper para obter parâmetros UTM da URL
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

// Injetar Meta Pixel
function injectMetaPixel(pixelId: string) {
  if (window.fbq) return; // Já carregado

  const script = document.createElement('script');
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
  if (window.gtag) return;

  const conversionId = pixels.google_ads_conversion_id || pixels.google_analytics_id;
  if (!conversionId) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
  document.head.appendChild(script);

  const inlineScript = document.createElement('script');
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${conversionId}');
  `;
  document.head.appendChild(inlineScript);
}

// Injetar TikTok Pixel
function injectTikTokPixel(pixelId: string) {
  if (window.ttq) return;

  const script = document.createElement('script');
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
  if (window.lintrk) return;

  const script = document.createElement('script');
  script.innerHTML = `
    _linkedin_partner_id = "${partnerId}";
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(_linkedin_partner_id);
  `;
  document.head.appendChild(script);

  const asyncScript = document.createElement('script');
  asyncScript.async = true;
  asyncScript.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  document.head.appendChild(asyncScript);
}

// Injetar Pinterest Tag
function injectPinterestTag(tagId: string) {
  if (window.pintrk) return;

  const script = document.createElement('script');
  script.innerHTML = `
    !function(e){if(!window.pintrk){window.pintrk = function () {
    window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
      n=window.pintrk;n.queue=[],n.version="3.0";var
      t=document.createElement("script");t.async=!0,t.src=e;var
      r=document.getElementsByTagName("script")[0];
      r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
    pintrk('load', '${tagId}', {em: '<user_email_address>'});
    pintrk('page');
  `;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none;" alt="" src="https://ct.pinterest.com/v3/?event=init&tid=${tagId}&noscript=1" />`;
  document.body.appendChild(noscript);
}
