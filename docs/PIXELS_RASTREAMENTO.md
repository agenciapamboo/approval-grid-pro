# 🎯 Guia Completo de Pixels e Rastreamento de Conversões

## 📋 Índice

1. [Introdução](#introdução)
2. [Eventos Rastreados](#eventos-rastreados)
3. [Configuração por Plataforma](#configuração-por-plataforma)
4. [Criação de Públicos Personalizados](#criação-de-públicos-personalizados)
5. [UTM Parameters e Atribuição](#utm-parameters-e-atribuição)
6. [Implementação Técnica](#implementação-técnica)
7. [Testes e Validação](#testes-e-validação)
8. [Troubleshooting](#troubleshooting)

---

## 📖 Introdução

O sistema de rastreamento de conversões permite monitorar ações dos usuários em seu site e enviar esses dados para múltiplas plataformas de publicidade. Isso possibilita:

- **Otimização de Campanhas**: Algoritmos das plataformas aprendem quais usuários convertem
- **Retargeting**: Criar públicos baseados em comportamento
- **Atribuição**: Entender qual canal gerou cada conversão
- **ROI**: Medir retorno sobre investimento em publicidade

### Rastreamento Híbrido (Client-Side + Server-Side)

O sistema utiliza **rastreamento duplo** para máxima precisão:

1. **Client-Side (Pixel JavaScript)**: 
   - Executa no navegador do usuário
   - Rápido e em tempo real
   - Pode ser bloqueado por ad-blockers

2. **Server-Side (Conversions API)**:
   - Executa no servidor
   - Não é bloqueado
   - Mais confiável e preciso
   - Requer access tokens

---

## 🎯 Eventos Rastreados

### Eventos Padrão

| Evento | Descrição | Quando Disparar |
|--------|-----------|----------------|
| **PageView** | Visualização de página | Quando qualquer página carrega |
| **ViewContent** | Visualização de produto/conteúdo | Página de produto, post, etc |
| **AddToCart** | Adicionar ao carrinho | Botão "Adicionar ao Carrinho" |
| **InitiateCheckout** | Iniciar checkout | Página de checkout |
| **Purchase** | Compra concluída | Página de obrigado/confirmação |

### Dados Enviados com Cada Evento

```typescript
{
  event_name: 'Purchase',
  event_time: 1699123456, // Unix timestamp
  event_source_url: 'https://seusite.com/checkout',
  
  // Dados do usuário (hash SHA-256)
  user_data: {
    email_hash: 'abc123...',
    phone_hash: 'def456...',
    client_ip_address: '192.168.1.1',
    client_user_agent: 'Mozilla/5.0...'
  },
  
  // Dados da conversão
  custom_data: {
    currency: 'BRL',
    value: 150.00,
    content_ids: ['produto-123', 'produto-456'],
    content_type: 'product',
    num_items: 2
  },
  
  // Parâmetros UTM
  utm_params: {
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: 'black-friday-2024'
  }
}
```

---

## ⚙️ Configuração por Plataforma

### 1. Meta (Facebook/Instagram)

#### Passo 1: Obter Pixel ID

1. Acesse [Facebook Events Manager](https://business.facebook.com/events_manager2)
2. Selecione seu pixel ou crie um novo
3. Copie o **Pixel ID** (15 dígitos)

#### Passo 2: Obter Access Token (Conversions API)

1. No Events Manager, vá em **Settings** → **Conversions API**
2. Clique em **Generate Access Token**
3. Copie o token gerado (começa com `EAA...`)

#### Passo 3: Configurar no Sistema

No painel de Configurações → Pixels e Rastreamento → Aba Meta:

```
Meta Pixel ID: 123456789012345
Access Token: EAAxxxxxxxxxxxxx
Test Event Code: TEST12345 (opcional, para testes)
```

#### Passo 4: Validar

1. Instale [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper)
2. Acesse seu site
3. Verifique se o pixel está disparando eventos
4. No Events Manager, vá em **Test Events** para ver eventos de teste

---

### 2. Google Ads + Analytics 4

#### Passo 1: Google Ads Conversion ID

1. Acesse [Google Ads](https://ads.google.com)
2. Vá em **Tools** → **Conversions**
3. Crie uma conversão de **Website**
4. Copie o **Conversion ID** (formato: `AW-123456789`)
5. Copie o **Conversion Label** (formato: `AbC1DeFgHiJk2LmN3OpQ`)

#### Passo 2: Google Analytics 4

1. Acesse [Google Analytics](https://analytics.google.com)
2. Em **Admin** → **Data Streams**, selecione seu site
3. Copie o **Measurement ID** (formato: `G-XXXXXXXXXX`)

#### Passo 3: Google Tag Manager (Opcional)

1. Acesse [Tag Manager](https://tagmanager.google.com)
2. Copie o **Container ID** (formato: `GTM-XXXXXXX`)

#### Passo 4: Configurar no Sistema

```
Google Ads Conversion ID: AW-123456789
Conversion Label: AbC1DeFgHiJk2LmN3OpQ
Google Analytics 4 ID: G-XXXXXXXXXX
Google Tag Manager ID: GTM-XXXXXXX
```

---

### 3. TikTok Pixel + Events API

#### Passo 1: Obter Pixel ID

1. Acesse [TikTok Ads Manager](https://ads.tiktok.com)
2. Vá em **Assets** → **Events**
3. Crie ou selecione um pixel
4. Copie o **Pixel ID**

#### Passo 2: Obter Access Token

1. Em **Events**, vá em **Settings**
2. Ative **Events API**
3. Gere um **Access Token**
4. Copie o token

#### Passo 3: Configurar no Sistema

```
TikTok Pixel ID: XXXXXXXXXXXXXX
Access Token: xxxxxxxxxxxxxxx
```

---

### 4. LinkedIn Insight Tag

#### Configuração

1. Acesse [LinkedIn Campaign Manager](https://www.linkedin.com/campaignmanager)
2. Vá em **Account Assets** → **Insight Tag**
3. Copie o **Partner ID**

```
LinkedIn Partner ID: 123456
```

---

### 5. Pinterest Tag

#### Configuração

1. Acesse [Pinterest Ads](https://ads.pinterest.com)
2. Vá em **Ads** → **Conversions**
3. Crie ou selecione um Pinterest Tag
4. Copie o **Tag ID**

```
Pinterest Tag ID: 2612345678901
```

---

## 👥 Criação de Públicos Personalizados

### Meta (Facebook/Instagram)

#### Público de Visitantes do Site

1. Acesse [Audiences](https://business.facebook.com/adsmanager/audiences)
2. Crie **Custom Audience** → **Website**
3. Selecione seu pixel
4. Defina regra: `All website visitors - Last 30 days`

#### Público de Compradores

```
Event: Purchase
Time: Last 180 days
```

#### Público de Carrinho Abandonado

```
Include: AddToCart - Last 30 days
Exclude: Purchase - Last 30 days
```

### Google Ads

#### Criar Lista de Remarketing

1. **Tools** → **Audience Manager**
2. **Custom Audiences** → **Website Visitors**
3. Tag: Sua tag de conversão
4. Regra: `Visitors of a page with specific tag` → `Purchase`

### TikTok

#### Criar Audience

1. **Assets** → **Audiences**
2. **Create Audience** → **Website Traffic**
3. Selecione eventos: `CompletePayment`, `AddToCart`, etc.

---

## 🔗 UTM Parameters e Atribuição

### Estrutura de URL com UTM

```
https://seusite.com/produto?utm_source=facebook&utm_medium=cpc&utm_campaign=black-friday-2024&utm_content=imagem-a&utm_term=sapatos-femininos
```

### Parâmetros UTM

| Parâmetro | Obrigatório | Descrição | Exemplo |
|-----------|-------------|-----------|---------|
| `utm_source` | ✅ Sim | Origem do tráfego | `facebook`, `google`, `instagram` |
| `utm_medium` | ✅ Sim | Meio/canal | `cpc`, `email`, `social`, `organic` |
| `utm_campaign` | ✅ Sim | Nome da campanha | `black-friday-2024`, `lancamento-produto` |
| `utm_term` | ❌ Não | Palavra-chave (Ads) | `sapatos-femininos`, `bolsas-couro` |
| `utm_content` | ❌ Não | Variação do anúncio | `imagem-a`, `video-b`, `carousel` |

### Boas Práticas de Nomenclatura

#### 1. Use lowercase e hífens

```
✅ utm_campaign=black-friday-2024
❌ utm_campaign=Black Friday 2024
```

#### 2. Seja consistente

```
✅ utm_source=facebook (sempre)
❌ utm_source=facebook, fb, Facebook (inconsistente)
```

#### 3. Use padrões claros

```
Estrutura: {plataforma}-{objetivo}-{data}
Exemplo: facebook-conversao-nov2024
```

### Exemplos por Canal

#### Facebook Ads

```
utm_source=facebook
utm_medium=cpc
utm_campaign=black-friday-2024
utm_content=carousel-sapatos
utm_term=interesse-moda
```

#### Google Ads

```
utm_source=google
utm_medium=cpc
utm_campaign=search-sapatos-femininos
utm_term=sapatos-femininos-couro
utm_content=anuncio-texto-a
```

#### Instagram Stories

```
utm_source=instagram
utm_medium=stories
utm_campaign=lancamento-colecao-verao
utm_content=video-15s
```

#### Email Marketing

```
utm_source=newsletter
utm_medium=email
utm_campaign=promocao-clientes-vip
utm_content=banner-topo
```

---

## 🛠️ Implementação Técnica

### Hook React: `useConversionTracking`

```typescript
import { useConversionTracking } from '@/hooks/useConversionTracking';

function CheckoutPage() {
  const { trackEvent } = useConversionTracking({
    clientId: 'uuid-do-cliente',
    enableMeta: true,
    enableGoogle: true,
    enableTikTok: true,
  });

  const handlePurchase = async (orderData) => {
    // Processar compra...
    
    // Rastrear conversão
    await trackEvent('Purchase', {
      currency: 'BRL',
      value: orderData.total,
      content_ids: orderData.items.map(i => i.id),
      num_items: orderData.items.length,
    });
  };

  return (
    // ... seu componente
  );
}
```

### Rastrear Eventos Manualmente

```typescript
// PageView (automático ao carregar)
trackEvent('PageView');

// ViewContent (produto)
trackEvent('ViewContent', {
  content_ids: ['produto-123'],
  content_type: 'product',
  value: 99.90,
  currency: 'BRL',
});

// AddToCart
trackEvent('AddToCart', {
  content_ids: ['produto-123'],
  value: 99.90,
  currency: 'BRL',
});

// InitiateCheckout
trackEvent('InitiateCheckout', {
  value: 299.70,
  currency: 'BRL',
  num_items: 3,
});

// Purchase
trackEvent('Purchase', {
  currency: 'BRL',
  value: 299.70,
  content_ids: ['produto-123', 'produto-456'],
  num_items: 2,
});
```

---

## 🧪 Testes e Validação

### Meta Pixel

1. **Facebook Pixel Helper**:
   - Instale a extensão do Chrome
   - Acesse seu site
   - Verifique ícone verde = funcionando
   - Clique para ver eventos disparados

2. **Test Events (Events Manager)**:
   - Configure `Test Event Code` no sistema
   - Dispare eventos no seu site
   - Veja eventos em tempo real no Events Manager

### Google Ads

1. **Google Tag Assistant**:
   - Instale extensão Tag Assistant
   - Acesse seu site
   - Verifique se gtag está carregando

2. **Conversions no Google Ads**:
   - Vá em **Tools** → **Conversions**
   - Verifique status: "Recording conversions"

### TikTok

1. **TikTok Pixel Helper**:
   - Instale extensão TikTok Pixel Helper
   - Acesse seu site
   - Verifique eventos disparados

---

## 🐛 Troubleshooting

### Problema: Pixel não está disparando

**Soluções**:
- Verifique se o Pixel ID está correto
- Limpe cache do navegador
- Teste em navegador anônimo
- Desative ad-blockers

### Problema: Conversions API retorna erro

**Soluções**:
- Verifique se o Access Token está válido
- Regenere o token se expirado
- Confirme que o Pixel ID está correto
- Verifique logs no Events Manager

### Problema: Eventos duplicados

**Causa**: Client-side e server-side enviando o mesmo evento

**Solução**: O sistema usa `event_id` único para deduplicação automática. Certifique-se de que ambos os métodos usam o mesmo `event_id`.

### Problema: Dados de conversão não aparecem

**Soluções**:
- Aguarde até 24 horas (delay normal)
- Verifique se eventos estão sendo recebidos no painel
- Confirme que a atribuição está configurada corretamente

---

## 📊 Análise de Dados

### Métricas Importantes

1. **Conversões por Origem (utm_source)**:
   - Qual canal traz mais conversões?
   - Facebook, Google, Email, etc.

2. **Taxa de Conversão por Campanha**:
   - Qual campanha tem melhor ROI?
   - Compare `utm_campaign`

3. **Valor Médio de Pedido**:
   - Qual canal traz clientes que gastam mais?

4. **Funil de Conversão**:
   - PageView → ViewContent → AddToCart → InitiateCheckout → Purchase
   - Identifique onde há mais abandono

### Dashboard de Conversões

O sistema registra todos os eventos na tabela `conversion_events`:

```sql
-- Conversões por plataforma (últimos 30 dias)
SELECT 
  platforms,
  COUNT(*) as total_events,
  SUM(value) as total_value
FROM conversion_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY platforms;

-- Top campanhas por conversão
SELECT 
  utm_campaign,
  COUNT(*) as conversions,
  SUM(value) as revenue
FROM conversion_events
WHERE event_name = 'Purchase'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY utm_campaign
ORDER BY revenue DESC
LIMIT 10;
```

---

## 🔐 Privacidade e LGPD

### Hash de Dados Pessoais

O sistema automaticamente faz hash (SHA-256) de dados sensíveis antes de enviar:

- **Email**: `joao@email.com` → `a1b2c3d4e5f6...`
- **Telefone**: `11987654321` → `x1y2z3w4v5u6...`

### Consentimento

Certifique-se de obter consentimento do usuário antes de rastrear:

```typescript
// Exemplo com cookie de consentimento
const hasConsent = document.cookie.includes('tracking_consent=true');

if (hasConsent) {
  trackEvent('PageView');
}
```

---

## 📚 Recursos Adicionais

### Meta

- [Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Pixel Setup Guide](https://www.facebook.com/business/help/952192354843755)
- [Event Reference](https://developers.facebook.com/docs/meta-pixel/reference)

### Google

- [Google Ads Conversion Tracking](https://support.google.com/google-ads/answer/1722022)
- [GA4 Events Guide](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [GTM Documentation](https://developers.google.com/tag-platform/tag-manager)

### TikTok

- [TikTok Events API](https://business-api.tiktok.com/portal/docs?id=1771100865818625)
- [Pixel Implementation](https://ads.tiktok.com/help/article/standard-mode-pixel-implementation)

### LinkedIn

- [LinkedIn Insight Tag](https://business.linkedin.com/marketing-solutions/insight-tag)

### Pinterest

- [Pinterest Tag Help](https://help.pinterest.com/en/business/article/track-conversions-with-pinterest-tag)

---

## 🎓 Próximos Passos

1. ✅ Configure pixels de todas as plataformas que você usa
2. ✅ Implemente rastreamento de eventos em páginas-chave
3. ✅ Configure UTMs em todas as campanhas
4. ✅ Teste eventos com ferramentas de validação
5. ✅ Crie públicos personalizados baseados em comportamento
6. ✅ Monitore conversões e otimize campanhas

---

**Precisa de ajuda?** Entre em contato com o suporte técnico.
