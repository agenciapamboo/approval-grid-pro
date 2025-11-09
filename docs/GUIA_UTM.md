# 🔗 Guia Completo de Parâmetros UTM

## 📋 Índice

1. [O que são parâmetros UTM](#o-que-são-parâmetros-utm)
2. [Estrutura de URLs com UTM](#estrutura-de-urls-com-utm)
3. [Parâmetros UTM Detalhados](#parâmetros-utm-detalhados)
4. [Boas Práticas de Nomenclatura](#boas-práticas-de-nomenclatura)
5. [Exemplos por Canal](#exemplos-por-canal)
6. [Gerador de URLs com UTM](#gerador-de-urls-com-utm)
7. [Análise e Atribuição](#análise-e-atribuição)
8. [Erros Comuns](#erros-comuns)

---

## 🎯 O que são parâmetros UTM?

**UTM** (Urchin Tracking Module) são parâmetros adicionados ao final de URLs para rastrear a origem do tráfego em ferramentas de analytics.

### Por que usar UTMs?

✅ **Rastrear campanhas**: Saber exatamente qual anúncio gerou cada conversão  
✅ **Medir ROI**: Calcular retorno sobre investimento por canal  
✅ **Otimizar budget**: Alocar verba nos canais mais eficientes  
✅ **Comparar criativos**: Testar qual imagem/vídeo performa melhor  
✅ **Atribuição precisa**: Creditar conversão ao canal correto

---

## 🔗 Estrutura de URLs com UTM

### Anatomia de uma URL com UTM

```
https://seusite.com/produto
?utm_source=facebook
&utm_medium=cpc
&utm_campaign=black-friday-2024
&utm_content=carousel-sapatos
&utm_term=interesse-moda
```

**Estrutura**:
```
URL_BASE ? PARAMETRO_1 & PARAMETRO_2 & PARAMETRO_3 ...
```

- `?` = Início dos parâmetros
- `&` = Separador entre parâmetros
- `=` = Atribuição de valor

---

## 📊 Parâmetros UTM Detalhados

### 1. `utm_source` (Obrigatório)

**O que é**: A origem do tráfego (onde o visitante clicou no link)

**Exemplos**:
- `facebook` - Posts ou ads no Facebook
- `google` - Busca ou anúncios do Google
- `instagram` - Stories, feed ou anúncios
- `newsletter` - Email marketing
- `linkedin` - Posts ou LinkedIn Ads
- `youtube` - Vídeos ou YouTube Ads

**Formato**: lowercase, sem espaços, use hífens

```
✅ utm_source=facebook
✅ utm_source=google-ads
❌ utm_source=Facebook
❌ utm_source=Google Ads (espaço)
```

---

### 2. `utm_medium` (Obrigatório)

**O que é**: O meio/canal de marketing utilizado

**Valores Comuns**:
- `cpc` - Custo por clique (ads pagos)
- `email` - Email marketing
- `social` - Redes sociais orgânicas
- `organic` - Busca orgânica
- `referral` - Link de outro site
- `display` - Banners display
- `video` - Anúncios em vídeo
- `affiliate` - Marketing de afiliados

```
✅ utm_medium=cpc
✅ utm_medium=email
✅ utm_medium=social
❌ utm_medium=CPC (maiúsculas)
```

---

### 3. `utm_campaign` (Obrigatório)

**O que é**: Nome específico da campanha ou promoção

**Estrutura Recomendada**:
```
{objetivo}-{produto/categoria}-{periodo}
```

**Exemplos**:
```
utm_campaign=black-friday-2024
utm_campaign=lancamento-tenis-esportivos
utm_campaign=conversao-bolsas-nov24
utm_campaign=branding-verao-2025
utm_campaign=retargeting-carrinho-abandonado
```

**Dicas**:
- Use nomes descritivos
- Inclua data ou período (mes-ano)
- Mantenha consistência
- Evite caracteres especiais

---

### 4. `utm_term` (Opcional)

**O que é**: Palavra-chave específica (usado principalmente em Google Ads)

**Quando usar**:
- Campanhas de busca paga (Google Ads, Bing Ads)
- Para rastrear termos que convertem melhor

**Exemplos**:
```
utm_term=sapatos-femininos-couro
utm_term=tenis-corrida-profissional
utm_term=bolsa-trabalho-executiva
```

**Nota**: No Google Ads, você pode usar `{keyword}` para inserção dinâmica:
```
utm_term={keyword}
```

---

### 5. `utm_content` (Opcional)

**O que é**: Variação do anúncio ou conteúdo

**Quando usar**:
- Testes A/B de criativos
- Diferentes CTAs
- Posições de anúncios
- Formatos de mídia

**Exemplos**:
```
utm_content=imagem-a
utm_content=video-15s
utm_content=carousel-4-fotos
utm_content=cta-compre-agora
utm_content=banner-topo
utm_content=stories-swipe-up
```

---

## 📝 Boas Práticas de Nomenclatura

### 1. Use Sempre Lowercase

```
✅ utm_source=facebook
❌ utm_source=Facebook
❌ utm_source=FACEBOOK
```

### 2. Substitua Espaços por Hífens

```
✅ utm_campaign=black-friday-2024
❌ utm_campaign=black friday 2024
❌ utm_campaign=black_friday_2024 (underscores são válidos, mas hífens são preferidos)
```

### 3. Seja Consistente

**❌ Inconsistente**:
```
utm_source=fb
utm_source=facebook
utm_source=Facebook
```

**✅ Consistente**:
```
utm_source=facebook (sempre)
```

### 4. Use Padrões Claros

**Estrutura de Campanha**:
```
{plataforma}-{objetivo}-{periodo}

facebook-conversao-nov2024
google-trafego-blackfriday2024
email-engajamento-natal2024
```

### 5. Evite Caracteres Especiais

```
✅ utm_campaign=promocao-verao
❌ utm_campaign=promoção-verão (acentos)
❌ utm_campaign=promo%cao (símbolos)
```

### 6. Mantenha um Documento de Convenções

Crie uma planilha com suas convenções:

| Parâmetro | Valores Permitidos | Exemplo |
|-----------|-------------------|---------|
| utm_source | facebook, instagram, google, email | facebook |
| utm_medium | cpc, email, social, organic | cpc |
| utm_campaign | {objetivo}-{produto}-{periodo} | conversao-sapatos-nov24 |

---

## 🎯 Exemplos por Canal

### Facebook Ads

**Post no Feed**:
```
utm_source=facebook
utm_medium=cpc
utm_campaign=black-friday-2024
utm_content=imagem-sapatos-vermelhos
utm_term=interesse-moda-feminina
```

**Stories**:
```
utm_source=facebook
utm_medium=stories
utm_campaign=lancamento-colecao-verao
utm_content=video-15s-swipe-up
```

**Carousel**:
```
utm_source=facebook
utm_medium=cpc
utm_campaign=produtos-mais-vendidos
utm_content=carousel-4-itens
```

---

### Instagram

**Feed Orgânico (bio)**:
```
utm_source=instagram
utm_medium=social
utm_campaign=link-bio-principal
```

**Stories Orgânico**:
```
utm_source=instagram
utm_medium=stories
utm_campaign=destaque-produtos
utm_content=stories-destaque-1
```

**Instagram Ads**:
```
utm_source=instagram
utm_medium=cpc
utm_campaign=retargeting-visitantes
utm_content=video-reels-30s
```

---

### Google Ads

**Pesquisa (Search)**:
```
utm_source=google
utm_medium=cpc
utm_campaign=search-sapatos-femininos
utm_term=sapatos-femininos-couro
utm_content=anuncio-texto-a
```

**Display**:
```
utm_source=google
utm_medium=display
utm_campaign=remarketing-site
utm_content=banner-300x250
```

**Shopping**:
```
utm_source=google
utm_medium=shopping
utm_campaign=produtos-catalogo
utm_content=feed-principal
```

**YouTube Ads**:
```
utm_source=youtube
utm_medium=video
utm_campaign=branding-verao
utm_content=video-bumper-6s
```

---

### Email Marketing

**Newsletter Semanal**:
```
utm_source=newsletter
utm_medium=email
utm_campaign=newsletter-semanal-48
utm_content=banner-promocao-topo
```

**Email Transacional (Carrinho Abandonado)**:
```
utm_source=email-transacional
utm_medium=email
utm_campaign=carrinho-abandonado
utm_content=produto-principal
```

**Segmento VIP**:
```
utm_source=newsletter
utm_medium=email
utm_campaign=vip-black-friday
utm_content=oferta-exclusiva
```

---

### TikTok

**TikTok Ads**:
```
utm_source=tiktok
utm_medium=cpc
utm_campaign=viral-sapatos-tendencia
utm_content=video-vertical-9-16
```

---

### LinkedIn

**Post Orgânico**:
```
utm_source=linkedin
utm_medium=social
utm_campaign=post-blog-marketing
```

**LinkedIn Ads**:
```
utm_source=linkedin
utm_medium=cpc
utm_campaign=b2b-geracao-leads
utm_content=carousel-case-estudo
```

---

### WhatsApp

**Status/Stories**:
```
utm_source=whatsapp
utm_medium=social
utm_campaign=status-promocao-semanal
```

**Mensagem Direta**:
```
utm_source=whatsapp
utm_medium=direct
utm_campaign=atendimento-comercial
```

---

### Pinterest

```
utm_source=pinterest
utm_medium=social
utm_campaign=pins-organicos-moda
utm_content=pin-sapatos-verao
```

---

## 🛠️ Gerador de URLs com UTM

### Ferramenta Online (Google)

Use o [Campaign URL Builder do Google](https://ga-dev-tools.google/campaign-url-builder/):

1. Cole a URL base do seu site
2. Preencha os parâmetros UTM
3. Copie a URL final gerada

### Gerador Manual

**Template**:
```
URL_BASE?utm_source=FONTE&utm_medium=MEIO&utm_campaign=CAMPANHA&utm_content=CONTEUDO&utm_term=TERMO
```

**Exemplo**:
```
https://seusite.com/produto?utm_source=facebook&utm_medium=cpc&utm_campaign=black-friday-2024&utm_content=imagem-a&utm_term=interesse-moda
```

### Planilha de Gerenciamento

Crie uma planilha Google Sheets:

| URL Base | utm_source | utm_medium | utm_campaign | utm_content | URL Final |
|----------|-----------|-----------|-------------|------------|----------|
| seusite.com/produto | facebook | cpc | black-friday | carousel | =A2&"?utm_source="&B2... |

---

## 📊 Análise e Atribuição

### Google Analytics 4

**Ver Campanhas**:
1. **Aquisição** → **Aquisição de tráfego**
2. Dimensão primária: **Origem/Mídia**
3. Dimensão secundária: **Campanha**

**Relatório Personalizado**:
```
Explorar → Exploração livre
Dimensões: utm_source, utm_medium, utm_campaign
Métricas: Conversões, Receita, Usuários
```

### Tabela `conversion_events`

**Conversões por Origem**:
```sql
SELECT 
  utm_source,
  COUNT(*) as conversions,
  SUM(value) as revenue,
  AVG(value) as avg_order_value
FROM conversion_events
WHERE event_name = 'Purchase'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY utm_source
ORDER BY revenue DESC;
```

**Top Campanhas**:
```sql
SELECT 
  utm_campaign,
  COUNT(*) as conversions,
  SUM(value) as revenue,
  ROUND(SUM(value) / COUNT(*), 2) as aov
FROM conversion_events
WHERE event_name = 'Purchase'
GROUP BY utm_campaign
ORDER BY revenue DESC
LIMIT 10;
```

**Performance por Conteúdo (Teste A/B)**:
```sql
SELECT 
  utm_content,
  COUNT(*) as clicks,
  SUM(CASE WHEN event_name = 'Purchase' THEN 1 ELSE 0 END) as conversions,
  ROUND(100.0 * SUM(CASE WHEN event_name = 'Purchase' THEN 1 ELSE 0 END) / COUNT(*), 2) as conversion_rate
FROM conversion_events
WHERE utm_campaign = 'black-friday-2024'
GROUP BY utm_content
ORDER BY conversion_rate DESC;
```

---

## ❌ Erros Comuns

### 1. Esquecer o `?` ou `&`

```
❌ seusite.com/produtoutm_source=facebook
✅ seusite.com/produto?utm_source=facebook

❌ seusite.com/produto?utm_source=facebook?utm_medium=cpc
✅ seusite.com/produto?utm_source=facebook&utm_medium=cpc
```

### 2. Usar Maiúsculas

```
❌ utm_source=Facebook
✅ utm_source=facebook
```

### 3. Espaços na URL

```
❌ utm_campaign=black friday
✅ utm_campaign=black-friday
```

### 4. Inconsistência de Nomenclatura

```
❌ utm_source=fb, utm_source=facebook, utm_source=Facebook
✅ utm_source=facebook (sempre)
```

### 5. UTMs em Links Internos

**Não use UTMs em links internos do seu site!**

```
❌ <a href="/produtos?utm_source=menu">Produtos</a>
✅ <a href="/produtos">Produtos</a>
```

UTMs devem ser usados apenas para **tráfego externo**.

### 6. URL muito longa

```
❌ utm_campaign=promocao-de-black-friday-2024-com-descontos-especiais-em-todos-os-produtos
✅ utm_campaign=black-friday-2024
```

### 7. Não documentar UTMs

Sempre mantenha um registro das UTMs usadas para evitar duplicatas e inconsistências.

---

## 📚 Recursos Adicionais

### Ferramentas Úteis

- [Google Campaign URL Builder](https://ga-dev-tools.google/campaign-url-builder/)
- [UTM.io](https://utm.io/) - Gerenciador de UTMs
- [Terminus](https://terminusapp.com/utm-builder) - Gerador de UTMs

### Links de Referência

- [Google Analytics UTM Parameters](https://support.google.com/analytics/answer/1033863)
- [UTM Best Practices](https://blog.hootsuite.com/how-to-use-utm-parameters/)

---

## 🎓 Checklist de UTM

- [ ] Sempre use os 3 parâmetros obrigatórios: source, medium, campaign
- [ ] Mantenha nomenclatura consistente (lowercase, hífens)
- [ ] Documente suas convenções em planilha
- [ ] Teste as URLs antes de compartilhar
- [ ] Use UTMs apenas em links externos
- [ ] Crie URLs curtas com encurtadores (bit.ly) se necessário
- [ ] Revise Analytics regularmente para validar dados
- [ ] Treine sua equipe nas convenções de UTM

---

**Precisa de ajuda?** Entre em contato com o suporte.
