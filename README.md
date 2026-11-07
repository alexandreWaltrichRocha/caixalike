# CaixaLike 💳

> Portal de pagamentos estático — criação de sites, serviços digitais e planos mensais, com **PIX (copia e cola + QR Code)** e **RLUSD (XRPL)**.

[![Deploy](https://img.shields.io/github/actions/workflow/status/alexandreWaltrichRocha/caixalike/deploy.yml?label=deploy&style=flat-square)](../../actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

---

## 🗂️ Estrutura

```
caixalike/
├── index.html              # Início — planos de criação + pagamento
├── servicos/               # 31 serviços avulsos
├── planos/                 # Planos mensais VIP
├── sobre/                  # Quem somos, serviços e como funciona
├── contato/                # Formulário de contato (FormSubmit)
├── privacidade/            # Política de Privacidade (LGPD)
├── termos/                 # Termos de Serviço
├── 404.html                # Página de erro
├── css/style.css           # Design system global
├── js/pagamentos.js        # Motor PIX EMV (BR Code) + pedido + RLUSD
├── js/qrcode.min.js        # QR Code (hospedado localmente)
├── img/                    # favicon, ícones e imagem Open Graph
├── .github/workflows/      # CI/CD → GitHub Pages
└── deploy.sh               # Commit + push
```

---

## 💳 Como o pagamento funciona

1. O cliente clica em um plano/serviço (ou digita um valor).
2. O site gera um **código de pedido** (ex.: `CLX6B4MP2G`) e um **PIX estático com valor**, com o código gravado no campo `txid` do BR Code. Assim cada pagamento fica identificável no extrato.
3. O cliente paga no app do banco e clica em **Enviar comprovante no WhatsApp**, que abre a conversa com uma mensagem pronta (pedido, item e valor). O comprovante é anexado manualmente.
4. Para **RLUSD**, o cliente paga no endereço XRPL exibido e informa o código do pedido e o hash da transação pelo WhatsApp.

> ℹ️ **Limites desta abordagem:** não existe cobrança dinâmica nem confirmação automática. O PIX é *estático com valor* e a conferência é manual (extrato + comprovante). Para confirmação automática seria preciso um provedor de pagamentos com webhook (ex.: Mercado Pago, Efí).
>
> Os planos de criação de sites mostram preço **inicial** ("a partir de"); o PIX gerado corresponde a esse valor, e o escopo/valor final é confirmado por escrito (veja `termos/`).

---

## ⚙️ Configuração

Edite **apenas** o bloco `CONFIG` em `js/pagamentos.js`:

```javascript
const CONFIG = {
  whatsapp: "5547984459259",       // DDI+DDD+número, só dígitos
  pix: {
    chave:     "sua-chave-pix",
    nome:      "SEU NOME",         // máx 25 chars (acentos são removidos)
    cidade:    "SUA CIDADE",       // máx 15 chars
    descricao: "CAIXALIKE"         // usada só se não houver código de pedido
  },
  crypto: {
    rlusd: { address: "rSEU_ENDERECO_XRPL" }
  }
};
```

- O endereço RLUSD também aparece no `value` do `#endereco-rlusd` de cada página; o JS sobrescreve com o valor do `CONFIG`.
- **Preços:** a fonte única são os atributos `data-nome` / `data-valor` no HTML de cada página. Ao mudar um preço, altere também o texto exibido e o JSON-LD da página.
- O nome do recebedor mostrado ao cliente ("No app do banco, o recebedor aparecerá como …") vem de `CONFIG.pix.nome`.

---

## 🔒 Privacidade e rastreamento

O site carrega o script **RB2B** (identificação de visitantes) nas páginas `index`, `servicos`, `planos`, `sobre` e `contato`. Ele está descrito na Política de Privacidade (`privacidade/`), incluindo o direito de oposição. Se remover ou trocar essa ferramenta, atualize a política. Antes de publicar, preencha na política e nos termos a razão social/CNPJ, se houver, e peça revisão jurídica.

---

## 🔎 SEO e acessibilidade

- Open Graph, Twitter Card, `canonical` e JSON-LD (`Organization`, `WebSite`, `OfferCatalog`, `BreadcrumbList`, `ContactPage`) em todas as páginas.
- `sitemap.xml`, `robots.txt` e `404.html` (com `noindex`).
- Link "Pular para o conteúdo", `<main>`, `aria-current`, rótulos de formulário, foco visível, cards e linhas de serviço acionáveis por teclado (Enter/Espaço) e `prefers-reduced-motion`.

---

## 🚀 Deploy

```bash
git add -A
git commit -m "feat: atualização"
git push origin main
```

O GitHub Pages atualiza automaticamente via Actions. O workflow valida os arquivos essenciais e publica apenas os arquivos públicos. **Páginas novas precisam ser adicionadas à lista do passo "Montar pasta do site"** em `.github/workflows/deploy.yml`.

**Site:** `https://caixalike.com.br/`

> Primeira vez: em *Settings → Pages → Source* escolha **GitHub Actions**. Ou use `bash deploy.sh`.

---

## 🛠️ Local

```bash
python3 -m http.server 8080
# Acesse: http://localhost:8080
```

---

## 📄 Licença

MIT © 2026 CaixaLike
