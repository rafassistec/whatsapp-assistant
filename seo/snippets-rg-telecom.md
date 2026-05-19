# SEO Snippets — RG Telecom

Pacote pronto para implantação no WordPress (rgtelecom.com.br).
Recomendado: instale o plugin **Rank Math SEO** (gratuito) e use os blocos 1–5 nos campos do plugin. Como alternativa, use o **WPCode (Insert Headers and Footers)** para colar tudo no `<head>`.

---

## 1. Title Tag

Atual: `RG Telecom – Atendemos todo Brasil` (33 chars — fraco em keywords)

**Novo:**
```
RG Telecom – Assistência Técnica Apple em BH | iPhone, iPad e Mac
```
63 caracteres — dentro do limite visível do Google.

---

## 2. Meta Description

```
Assistência técnica especializada em produtos Apple há mais de 20 anos em Belo Horizonte. Conserto de iPhone, iPad e Mac. Atendemos todo o Brasil. Fale conosco!
```
158 caracteres — máximo recomendado.

---

## 3. H1 da Home (faltando hoje)

Adicione como **primeira heading visível** na home (acima do primeiro H2):

```
Assistência Técnica Apple em Belo Horizonte – iPhone, iPad e Mac há mais de 20 anos
```

No Elementor: edite o primeiro título do hero → propriedade **HTML Tag** = `H1`.

---

## 4. Open Graph + Twitter Card

Colar no `<head>` (via WPCode → Header, ou via Rank Math, que faz isso automaticamente):

```html
<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="RG Telecom">
<meta property="og:title" content="RG Telecom – Assistência Técnica Apple em BH">
<meta property="og:description" content="Assistência técnica especializada em produtos Apple há mais de 20 anos em Belo Horizonte. Conserto de iPhone, iPad e Mac. Atendemos todo o Brasil.">
<meta property="og:url" content="https://rgtelecom.com.br/">
<meta property="og:image" content="https://rgtelecom.com.br/wp-content/uploads/og-rgtelecom-1200x630.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="pt_BR">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="RG Telecom – Assistência Técnica Apple em BH">
<meta name="twitter:description" content="Assistência técnica Apple há +20 anos em BH. Conserto de iPhone, iPad e Mac. Atendemos todo o Brasil.">
<meta name="twitter:image" content="https://rgtelecom.com.br/wp-content/uploads/og-rgtelecom-1200x630.jpg">
```

> ⚠️ Crie uma imagem dedicada **1200×630px** (logo + slogan + foto de loja). Faça upload pela mediateca com o nome `og-rgtelecom-1200x630.jpg`. O logo redondo atual não funciona bem em preview de WhatsApp/Facebook.

---

## 5. JSON-LD `LocalBusiness` (Schema.org)

Colar no `<head>` ou no `<body>` (Google aceita em qualquer local). Use o tipo `ElectronicsStore` (subclasse de LocalBusiness) — mais específico para sua atividade.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ElectronicsStore",
  "@id": "https://rgtelecom.com.br/#business",
  "name": "RG Telecom",
  "alternateName": "RG Telecom Assistência Técnica Apple",
  "description": "Assistência técnica especializada em produtos Apple (iPhone, iPad, Mac) há mais de 20 anos em Belo Horizonte. Atendemos todo o Brasil.",
  "url": "https://rgtelecom.com.br/",
  "logo": "https://rgtelecom.com.br/wp-content/uploads/cropped-logo_rgtelecom.png",
  "image": "https://rgtelecom.com.br/wp-content/uploads/og-rgtelecom-1200x630.jpg",
  "telephone": "+553135686567",
  "email": "contato@rgtelecom.com.br",
  "priceRange": "$$",
  "foundingDate": "2005",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua Rio de Janeiro, 462 - Sala 1007/1008",
    "addressLocality": "Belo Horizonte",
    "addressRegion": "MG",
    "postalCode": "30160-040",
    "addressCountry": "BR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -19.9227,
    "longitude": -43.9377
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "09:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "09:00",
      "closes": "13:00"
    }
  ],
  "areaServed": {
    "@type": "Country",
    "name": "Brasil"
  },
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "telephone": "+5531992346211",
      "contactType": "customer service",
      "areaServed": "BR",
      "availableLanguage": ["Portuguese"]
    }
  ],
  "sameAs": [
    "https://www.facebook.com/rgtelecom",
    "https://www.instagram.com/rgtelecom",
    "https://g.page/rgtelecom"
  ],
  "makesOffer": [
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Troca de tela de iPhone" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Troca de bateria de iPhone" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Conserto de placa lógica" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Conserto de MacBook" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Conserto de iPad" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Recuperação de dados" } }
  ]
}
</script>
```

> ⚠️ **Confirme antes de publicar:**
> - `postalCode` — confira o CEP real do prédio
> - `geo.latitude/longitude` — pegue no Google Maps clicando com o botão direito no endereço
> - `openingHoursSpecification` — ajuste para seu horário real
> - `sameAs` — substitua pelos URLs reais das suas redes sociais
> - `foundingDate` — ajuste para o ano real de fundação
> - `priceRange` — `$` (barato), `$$` (médio), `$$$` (premium)
>
> Teste depois em: https://search.google.com/test/rich-results

---

## 6. JSON-LD `BreadcrumbList` (para páginas internas)

Em cada página que não seja a home, adicione um breadcrumb. Exemplo para `/atendimento-personalizado/`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://rgtelecom.com.br/" },
    { "@type": "ListItem", "position": 2, "name": "Atendimento Personalizado", "item": "https://rgtelecom.com.br/atendimento-personalizado/" }
  ]
}
</script>
```

---

## 7. Eventos de conversão no GA4 (via GTM)

Hoje o GA4 está instalado mas provavelmente não rastreia cliques no WhatsApp/telefone como conversão. Configure no GTM (`GTM-M7W5ZL45`):

### 7.1 Trigger para clique em WhatsApp
- Tipo: **Just Links**
- Condição: `Click URL contains wa.me` OU `Click URL contains api.whatsapp`

### 7.2 Trigger para clique em telefone
- Tipo: **Just Links**
- Condição: `Click URL starts with tel:`

### 7.3 Tag GA4 Event
- Tag type: **Google Analytics: GA4 Event**
- Configuration Tag: sua tag GA4 principal (G-ETHGMBLJTW)
- Event Name: `contact_click`
- Event Parameters:
  - `method` = `whatsapp` ou `phone` (use variável)
  - `link_url` = `{{Click URL}}`
- Trigger: usar os dois triggers acima

### 7.4 Marcar como conversão no GA4
- Admin → Events → ligar a chavinha "Mark as conversion" em `contact_click`

---

## 8. Tag de evento manual (alternativa sem GTM)

Se preferir, adicione no `<head>` (depois do gtag) e troque os links `<a href="https://wa.me/...">` por:

```html
<a href="https://wa.me/5531992346211" onclick="gtag('event','contact_click',{method:'whatsapp'})">
  Atendimento Online
</a>

<a href="tel:+553135686567" onclick="gtag('event','contact_click',{method:'phone'})">
  (31) 3568-6567
</a>
```

Depois marque `contact_click` como conversão no GA4 (passo 7.4).

---

## 9. Atributos de acessibilidade nos botões

Adicione `aria-label` nos links de ícone (redes sociais, WhatsApp flutuante):

```html
<a href="https://wa.me/5531992346211" aria-label="Falar com a RG Telecom no WhatsApp" rel="noopener">...</a>
<a href="https://instagram.com/rgtelecom" aria-label="Instagram da RG Telecom" rel="noopener">...</a>
```

---

## 10. Decisão sobre os 2 GTMs

O site carrega dois contêineres GTM: `GTM-M7W5ZL45` e `GTM-TZHJXWR`. Isso geralmente causa eventos duplicados.

**Ação:** identifique qual contêiner está sendo realmente usado (qual tem tags ativas) e remova o outro do plugin "HFCM by 99 Robots" (visto na meta generator do site).

---

## Ordem de implementação sugerida

| # | Tarefa | Tempo | Impacto |
|---|--------|-------|---------|
| 1 | Instalar Rank Math e preencher title + meta description (blocos 1, 2) | 15 min | 🔴 alto |
| 2 | Trocar H1 no Elementor (bloco 3) | 5 min | 🔴 alto |
| 3 | Adicionar JSON-LD LocalBusiness (bloco 5) via WPCode | 10 min | 🔴 alto |
| 4 | Criar imagem OG 1200×630 e ativar Open Graph (bloco 4) | 30 min | 🟠 médio |
| 5 | Configurar conversões no GA4 (bloco 7) | 30 min | 🔴 alto (para Ads) |
| 6 | Remover GTM duplicado (bloco 10) | 5 min | 🟡 baixo |
| 7 | BreadcrumbList nas páginas internas (bloco 6) | 15 min | 🟡 baixo |

**Total estimado:** ~1h50 para ganho substancial de SEO e qualidade de Ads.
