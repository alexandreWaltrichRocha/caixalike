/**
 * CaixaLike — Motor de Pagamentos v5.0
 * PIX EMV (valor + código de pedido no txid) + comprovante via WhatsApp + RLUSD (XRPL)
 *
 * Fonte única de preços: atributos data-nome / data-valor no HTML de cada página.
 */

const CONFIG = {
  whatsapp: "5547984459259",
  pix: {
    chave:     "77e8169e-8a5f-4d6b-92b1-c26b1a9aa910",
    nome:      "AQUILES LABOR",
    cidade:    "JOINVILLE",
    descricao: "CAIXALIKE"
  },
  crypto: {
    rlusd: {
      address: "rH5yzozYmmHZdAfHJQwAZyUAJt1uek6gYQ"
    }
  }
};

function tlv(id, val) {
  return String(id).padStart(2, "0") + String(val.length).padStart(2, "0") + val;
}

function crc16(p) {
  let c = 0xFFFF;
  for (let i = 0; i < p.length; i++) {
    c ^= p.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      c = (c & 0x8000) ? (c << 1) ^ 0x1021 : c << 1;
      c &= 0xFFFF;
    }
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}

// PIX EMV exige ASCII sem acentos, em maiúsculas
function limparTexto(txt, max) {
  return String(txt)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .substring(0, max)
    .trim();
}

function gerarPayload(valor, txid) {
  const { chave, nome, cidade, descricao } = CONFIG.pix;
  let p = tlv(0, "01");
  p += tlv(26, tlv(0, "br.gov.bcb.pix") + tlv(1, chave));
  p += tlv(52, "0000");
  p += tlv(53, "986");
  if (valor && valor !== "0.00") p += tlv(54, valor);
  p += tlv(58, "BR");
  p += tlv(59, limparTexto(nome, 25));
  p += tlv(60, limparTexto(cidade, 15));
  p += tlv(62, tlv(5, limparTexto(txid || descricao, 25).replace(/ /g, "") || "***"));
  p += "6304";
  p += crc16(p);
  return p;
}

// ── PEDIDO ──────────────────────────────────────────────────
const estado = { codigo: "", nome: "", nomeSel: "", valorSel: null, valor: 0 };

// Código curto sem caracteres ambíguos (sem I, O, 0, 1). Vai no txid do PIX.
function novoCodigoPedido() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 símbolos
  const bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);
  return "CL" + Array.from(bytes, b => alfabeto[b % alfabeto.length]).join("");
}

function montarMensagemWhatsApp() {
  const valorFmt = estado.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  return [
    "Olá, CaixaLike! Estou enviando o comprovante do meu pedido.",
    "",
    "Pedido: " + estado.codigo,
    "Item: " + estado.nome,
    "Valor: R$ " + valorFmt,
    "Forma de pagamento: PIX (se foi RLUSD, informe também o hash da transação)",
    "",
    "Segue o comprovante:"
  ].join("\n");
}

function atualizarPedido() {
  const box = document.getElementById("pedidoBox");
  if (!box) return;
  const codEl = document.getElementById("pedidoCodigo");
  const btn   = document.getElementById("btnWpp");
  if (codEl) codEl.textContent = estado.codigo;
  if (btn)   btn.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(montarMensagemWhatsApp());
  box.hidden = false;
}

function gerarQR(elementId, texto, tentativa = 0) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (!window.QRCode) {
    if (tentativa < 25) setTimeout(() => gerarQR(elementId, texto, tentativa + 1), 200);
    else el.textContent = "QR Code indisponível — use o código copia e cola.";
    return;
  }
  el.innerHTML = "";
  new QRCode(el, {
    text: texto, width: 200, height: 200,
    colorDark: "#000000", colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
}

function atualizarPIX(valor, veioDoInput = false, nome) {
  const num = parseFloat(String(valor).replace(",", "."));
  if (isNaN(num) || num <= 0) return;

  if (!veioDoInput) {
    // Clique em plano/serviço: novo pedido
    estado.nomeSel  = nome || "";
    estado.valorSel = nome ? num : null;
    estado.codigo   = novoCodigoPedido();
  } else if (!estado.codigo) {
    estado.codigo = novoCodigoPedido();
  }
  const igualAoSelecionado = estado.valorSel !== null && Math.abs(num - estado.valorSel) < 0.005;
  estado.nome  = igualAoSelecionado ? estado.nomeSel : "Valor personalizado";
  estado.valor = num;

  const payload = gerarPayload(num.toFixed(2), estado.codigo);
  const valorFmt = num.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const codeEl  = document.getElementById("pixCodigo");
  const tagEl   = document.getElementById("pixValueTag");
  const resEl   = document.getElementById("pixResult");
  const inputEl = document.getElementById("valorPix");
  const okEl    = document.getElementById("pixConfirm");
  const btnEl   = document.getElementById("btnCopyPix");

  // Só preenche o campo quando o valor vem de um clique (plano/serviço);
  // senão o texto "pularia" enquanto o usuário digita. Sem separador de milhar.
  if (inputEl && !veioDoInput) inputEl.value = num.toFixed(2).replace(".", ",");
  if (codeEl)  codeEl.value = payload;
  if (tagEl)   tagEl.textContent = "R$ " + valorFmt;
  if (resEl)   resEl.classList.add("visible");
  if (okEl)    okEl.classList.remove("visible");
  if (btnEl)   { btnEl.textContent = "Copiar"; btnEl.classList.remove("copied"); }

  atualizarPedido();
  setTimeout(() => gerarQR("qrcode-pix", payload), 50);
}

// Marca o item escolhido, mostra o resumo e gera o PIX.
// opts: { grupo: seletor dos irmãos, classe: classe de seleção, sufixo: texto após o valor }
function selecionarItem(el, opts = {}) {
  const { grupo, classe = "selected", sufixo = "" } = opts;
  if (grupo) document.querySelectorAll(grupo).forEach(n => {
    n.classList.remove(classe);
    if (n.getAttribute("role") === "button") n.setAttribute("aria-pressed", "false");
  });
  el.classList.add(classe);
  if (el.getAttribute("role") === "button") el.setAttribute("aria-pressed", "true");

  const nome  = el.dataset.nome;
  const valor = parseFloat(el.dataset.valor);

  const pill = document.getElementById("selectedPill");
  if (pill) {
    pill.textContent = "";
    const strong = document.createElement("strong");
    strong.textContent = nome;
    pill.append("✓ ", strong, " — R$ " + valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + sufixo);
    pill.classList.add("visible");
  }

  atualizarPIX(valor, false, nome);

  const bloco = document.getElementById("bloco-pagamento");
  if (bloco) {
    const reduz = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setTimeout(() => {
      bloco.scrollIntoView({ behavior: reduz ? "auto" : "smooth", block: "start" });
      bloco.focus({ preventScroll: true });
    }, 100);
  }
}

function iniciarPIX() {
  const input = document.getElementById("valorPix");
  if (!input || input._pixIniciado) return;
  input._pixIniciado = true;

  input.addEventListener("input", function() {
    let v = this.value.replace(/[^\d,]/g, "");
    const pts = v.split(",");
    if (pts.length > 2) v = pts[0] + "," + pts.slice(1).join("").substring(0, 2);
    else if (pts.length === 2) v = pts[0] + "," + pts[1].substring(0, 2);
    this.value = v;

    const num = parseFloat(v.replace(",", "."));
    if (!isNaN(num) && num > 0) {
      atualizarPIX(num, true);
    } else {
      const resEl = document.getElementById("pixResult");
      const qrEl  = document.getElementById("qrcode-pix");
      const pedEl = document.getElementById("pedidoBox");
      if (pedEl) pedEl.hidden = true;
      if (resEl) resEl.classList.remove("visible");
      if (qrEl)  qrEl.innerHTML = "";
    }
  });
}

function copiarPix() {
  const code = document.getElementById("pixCodigo");
  const btn  = document.getElementById("btnCopyPix");
  const ok   = document.getElementById("pixConfirm");
  if (!code || !code.value) return;

  navigator.clipboard.writeText(code.value).then(() => {
    if (btn) { btn.textContent = "✓ Copiado"; btn.classList.add("copied"); }
    if (ok)  { ok.textContent = "✓ Código copiado! Cole no app do banco."; ok.classList.add("visible"); }
    setTimeout(() => {
      if (btn) { btn.textContent = "Copiar"; btn.classList.remove("copied"); }
      if (ok)  ok.classList.remove("visible");
    }, 3500);
  }).catch(() => {
    code.select();
    try { document.execCommand("copy"); } catch (e) {}
    if (ok) { ok.textContent = "Código selecionado — copie manualmente (Ctrl+C)."; ok.classList.add("visible"); }
  });
}

function copiarEndereco(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input || !input.value) return;

  navigator.clipboard.writeText(input.value).then(() => {
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = "✓ Copiado";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove("copied");
      }, 3000);
    }
  }).catch(() => {
    input.select();
    try { document.execCommand("copy"); } catch (e) {}
  });
}

function preencherEnderecos() {
  const el = document.getElementById("endereco-rlusd");
  if (el) el.value = CONFIG.crypto.rlusd.address;
}

function preencherBeneficiario() {
  const el = document.getElementById("pixBenef");
  if (el) el.textContent = "No app do banco, o recebedor aparecerá como " + limparTexto(CONFIG.pix.nome, 25) + ".";
}

// Cards de plano (sem botão interno) e linhas da tabela de serviços ficam
// focáveis e acionáveis por Enter/Espaço.
function habilitarTeclado() {
  document.querySelectorAll(".plano-card[data-valor], #tabela-servicos tr[data-valor]").forEach(el => {
    el.tabIndex = 0;
    if (el.classList.contains("plano-card")) {
      const v = parseFloat(el.dataset.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      el.setAttribute("role", "button");
      el.setAttribute("aria-pressed", "false");
      el.setAttribute("aria-label", el.dataset.nome + ", R$ " + v + " por mês. Selecionar e pagar.");
    }
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarPIX();
  preencherEnderecos();
  preencherBeneficiario();
  habilitarTeclado();
});

window.copiarPix = copiarPix;
window.copiarEndereco = copiarEndereco;

window.CaixaLike = {
  iniciarPIX,
  atualizarPIX,
  selecionarItem,
  preencherEnderecos,
  CONFIG
};
