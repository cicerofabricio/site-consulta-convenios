"use strict";

/**
 * Consulta independente de transferências especiais do Transferegov.
 * Fonte: https://api-publica.transferegov.gestao.gov.br/especiais/docs
 * Não utiliza banco de dados, chaves, proxy externo ou dados demonstrativos.
 */
const API_BASE = "https://api-publica.transferegov.gestao.gov.br/especiais";
const API_PAGE_SIZE = 200;
const RECIPIENTS = Object.freeze([
  {key:"prefeitura", cnpj:"46523239000147", name:"Prefeitura do Município de São Bernardo do Campo"},
  {key:"saude", cnpj:"13961905000170", name:"Fundo Municipal de Saúde de São Bernardo do Campo"}
]);
const MAX_ROWS = 20000;
const TABLE_PAGE_SIZE = 25;
const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numberFmt = new Intl.NumberFormat("pt-BR");
const node = id => document.getElementById(id);
const state = { beneficiaries: new Map(), currentBeneficiaries: [], rows: [], filtered: [], page: 1, beneficiaryToken: 0, searchToken: 0, busy: false, selectedName: "", missingRecipients: [] };

function normalized(value) {
  return String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase("pt-BR").trim();
}
function asNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const v = value.trim().replace(/\s/g, "");
    const parsed = v.includes(",") ? Number(v.replace(/\./g,"").replace(",", ".")) : Number(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function status(message, kind = "info") {
  const el = node("status");
  el.textContent = message;
  el.className = "status " + kind;
}
function setBusy(value) {
  state.busy = value;
  node("searchBtn").disabled = value;
  node("searchBtn").textContent = value ? "Consultando..." : "Consultar emendas";
}
function friendlyError(error) {
  const msg = error && error.message ? error.message : String(error);
  if (/Failed to fetch|NetworkError|Load failed|CORS/i.test(msg)) {
    return "Não foi possível acessar a API do Transferegov a partir do navegador. A origem pode estar indisponível ou bloquear solicitações entre sites (CORS). Nenhum resultado foi inventado.";
  }
  if (/timed out|tempo limite/i.test(msg)) return "Tempo limite excedido ao consultar a API oficial. Tente novamente.";
  return "Falha na consulta à API oficial: " + msg;
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function getJSON(path, params = {}, tries = 2) {
  const url = new URL(API_BASE + "/" + path.replace(/^\//, ""));
  for (const [key, value] of Object.entries(params)) {
    if (value !== "" && value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }
  let lastError;
  for (let attempt = 0; attempt < tries; attempt++) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 25000);
    try {
      const response = await fetch(url.toString(), { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) {
        const e = new Error("HTTP " + response.status + " (" + path + ")");
        if ([429,502,503,504].includes(response.status) && attempt + 1 < tries) {
          lastError = e;
          await wait(500 * (attempt + 1));
          continue;
        }
        throw e;
      }
      return await response.json();
    } catch (e) {
      lastError = e;
      if (e.name === "AbortError") lastError = new Error("tempo limite");
      if (attempt + 1 < tries) await wait(500 * (attempt + 1));
    } finally { clearTimeout(timeout); }
  }
  throw lastError;
}
function extractRows(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.items)) return json.items;
  throw new Error("Formato de resposta inesperado da API. Verifique o contrato oficial.");
}
async function fetchAll(path, filters, progress) {
  const out = [];
  for (let page = 1; page <= Math.ceil(MAX_ROWS / API_PAGE_SIZE); page++) {
    const response = await getJSON(path, Object.assign({}, filters, { pagina: page, tamanho_da_pagina: API_PAGE_SIZE }));
    const part = extractRows(response);
    out.push(...part);
    if (progress) progress(out.length, response.total_items);
    const totalPages = Number(response.total_pages);
    if (!part.length || (Number.isFinite(totalPages) && totalPages > 0 && page >= totalPages) || part.length < API_PAGE_SIZE) {
      return { rows: out, complete: true };
    }
    if (out.length >= MAX_ROWS) return { rows: out, complete: false };
  }
  return { rows: out, complete: false };
}
function populateUF() {
  const dropdown = node("uf");
  for (const uf of UF_LIST) {
    const option = document.createElement("option");
    option.value = uf;
    option.textContent = uf;
    dropdown.append(option);
  }
  dropdown.value = "SP";
  const yearDropdown = node("year");
  for (let year = 2026; year >= 2020; year--) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearDropdown.append(option);
  }
  yearDropdown.value = "";
}
async function loadBeneficiaries() {
  const token = ++state.beneficiaryToken;
  state.currentBeneficiaries = [];
  state.unavailableTargets = [];
  node("searchBtn").disabled = true;
  const select = node("beneficiary");
  select.disabled = true;
  select.replaceChildren(new Option("Validando dois CNPJs...", ""));
  status("Validando separadamente os CNPJs da Prefeitura e do Fundo Municipal de Saúde...", "info");
  try {
    const results = await Promise.all(TARGETS.map(async target => {
      const response = await fetchAll("beneficiarios-especiais", {cnpj_beneficiario: target.cnpj});
      if(!response.complete) throw new Error("O cadastro de "+target.label+" foi obtido parcialmente; nenhum resultado parcial será tratado como completo.");
      const records = response.rows.filter(record =>
        String(record.cnpj_beneficiario||"").replace(/\D/g,"") === target.cnpj &&
        normalized(record.uf_beneficiario) === "SP"
      );
      return {target, records};
    }));
    if(token !== state.beneficiaryToken) return;
    const good = [];
    const missing = [];
    for(const group of results) {
      if(!group.records.length) missing.push(group.target);
      for(const r of group.records) {
        if(r.id_beneficiario == null) continue;
        good.push({...r, _recipient_kind:group.target.kind, _recipient_name:group.target.label, _recipient_cnpj:group.target.cnpj});
      }
    }
    state.currentBeneficiaries = good;
    state.unavailableTargets = missing;
    select.replaceChildren(new Option(good.length ? "CNPJs verificados" : "Cadastros não localizados", good.length ? "validado" : ""));
    if(!good.length) {
      status("A API de transferências especiais não retornou cadastros para nenhum dos dois CNPJs. Isso não significa ausência de emendas: para o Fundo de Saúde, consulte também o FNS.", "warning");
      return;
    }
    node("searchBtn").disabled = false;
    status("CNPJs validados: "+good.length+" cadastro(s)."+(missing.length ? " Sem cadastro nesta modalidade: "+missing.map(x=>x.label).join(", ")+". Isso não implica ausência de emendas fundo a fundo." : ""),missing.length ? "warning" : "success");
    await runSearch();
  }catch(error) {
    if(token!==state.beneficiaryToken) return;
    select.replaceChildren(new Option("Não foi possível validar os cadastros",""));
    node("searchBtn").disabled = true;
    status(friendlyError(error)+" Não será exibido consolidado parcial.", "error");
  }
}
function beneficiaryName(id) {
  const b = beneficiaryRecord(id);
  return b ? b._recipientName : "Destinatário não identificado";
}
function beneficiaryCnpj(id) {
  const b = beneficiaryRecord(id);
  return b ? b._recipientCnpj : "";
}
function clearResultRows() {
  state.rows = [];
  state.filtered = [];
  state.page = 1;
  renderResults();
}
async function runSearch(event) {
  if(event) event.preventDefault();
  const filterMode = node("recipientFilter").value;
  const selectedKinds = filterMode === "ambos" ? ["prefeitura","saude"] : [filterMode];
  const selected = state.currentBeneficiaries.filter(x => selectedKinds.includes(x._recipient_kind));
  const notFound = state.unavailableTargets.filter(x => selectedKinds.includes(x.kind));
  if(!selected.length) {
    clearResultRows();
    status("Não há cadastro confirmado na API Pix para o(s) CNPJ(s) selecionado(s). Isso NÃO significa ausência de emendas da saúde: consulte o portal FNS para transferências fundo a fundo.", "warning");
    return;
  }
  const token = ++state.searchToken;
  const baseFilters = {};
  if(node("year").value) baseFilters.ano_emenda_parlamentar_plano_acao = node("year").value;
  if(node("situation").value) baseFilters.situacao_plano_acao = node("situation").value;
  if(node("category").value) baseFilters.categoria_despesa_plano_acao = node("category").value;
  clearResultRows();
  setBusy(true);
  try {
    status("Consultando "+selected.length+" cadastro(s) por CNPJ no Transferegov...", "info");
    const responses = await Promise.all(selected.map(async benef => {
      const filters = {...baseFilters,id_beneficiario: benef.id_beneficiario};
      const response = await fetchAll("planos-acao-especiais",filters,n=>{
        if(token===state.searchToken) status("Consultando "+benef._recipient_name+": "+numberFmt.format(n)+" planos recebidos...", "info");
      });
      if(!response.complete) throw new Error("A API retornou registros incompletos para "+benef._recipient_name+". Os valores consolidados não serão exibidos.");
      return {benef,rows:response.rows};
    }));
    if(token!==state.searchToken) return;
    const unique = new Map();
    for(const result of responses) {
      for(const r of result.rows) {
        if(String(r.id_beneficiario)!==String(result.benef.id_beneficiario)) continue;
        const row={...r,_recipient_kind:result.benef._recipient_kind,_recipient_name:result.benef._recipient_name,_recipient_cnpj:result.benef._recipient_cnpj};
        const key=String(r.id_plano_acao || r.codigo_plano_acao || JSON.stringify(r))+"|"+row._recipient_cnpj;
        unique.set(key,row);
      }
    }
    state.rows=[...unique.values()];
    state.selectedName=filterMode==="ambos"?"Prefeitura e Fundo Municipal de Saúde":selected[0]._recipient_name;
    applyLocalFilters();
    if(notFound.length){
      status(numberFmt.format(state.filtered.length)+" plano(s) Pix encontrado(s) nos cadastros disponíveis. O CNPJ "+notFound.map(x=>x.cnpj).join(", ")+" não consta no cadastro da API Pix; os indicadores NÃO incluem possíveis emendas fundo a fundo. Consulte também o FNS.","warning");
    }else if(!state.rows.length){
      status("A API Pix não retornou planos para os filtros selecionados. Isso não comprova a inexistência de emendas federais: confira CGU, TCU e FNS.","warning");
    } else {
      status(numberFmt.format(state.filtered.length)+" plano(s) Pix identificado(s). Valores separados por destinatário e sem duplicar IDs de planos.", "success");
    }
  }catch(error){
    if(token===state.searchToken){clearResultRows();status(friendlyError(error), "error");}
  }finally{if(token===state.searchToken)setBusy(false);}
}
function applyLocalFilters() {
  const parlamentar = normalized(node("parliamentarian").value);
  const emenda = normalized(node("amendment").value);
  const recipientFilter = node("recipientFilter").value;
  state.filtered = state.rows.filter(row => {
    const recipient = beneficiaryRecord(row.id_beneficiario);
    if (!recipient || (recipientFilter !== "ambos" && recipient._recipientKey !== recipientFilter)) return false;
    if (parlamentar && !normalized(row.nome_parlamentar_emenda_plano_acao).includes(parlamentar)) return false;
    if (emenda) {
      const identifiers = [row.codigo_emenda_parlamentar_formatado_plano_acao, row.numero_emenda_parlamentar_plano_acao, row.codigo_plano_acao].map(normalized).join(" ");
      if (!identifiers.includes(emenda)) return false;
    }
    return true;
  });
  state.filtered.sort((a,b) => Number(b.ano_emenda_parlamentar_plano_acao||0) - Number(a.ano_emenda_parlamentar_plano_acao||0) ||
    String(a.nome_parlamentar_emenda_plano_acao||"").localeCompare(String(b.nome_parlamentar_emenda_plano_acao||""),"pt-BR"));
  state.page = 1;
  renderResults();
}
function amount(row) {
  return asNumber(row.valor_custeio_plano_acao) + asNumber(row.valor_investimento_plano_acao);
}
function emendaLabel(row) {
  const code = row.codigo_emenda_parlamentar_formatado_plano_acao;
  return String(code || row.numero_emenda_parlamentar_plano_acao || "—");
}
function td(value, className) {
  const cell = document.createElement("td");
  cell.textContent = value == null || value === "" ? "—" : String(value);
  if (className) cell.className = className;
  return cell;
}
function renderResults() {
  const rows = state.filtered;
  const totalPages = Math.max(1,Math.ceil(rows.length / TABLE_PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;
  const subset = rows.slice((state.page-1)*TABLE_PAGE_SIZE, state.page*TABLE_PAGE_SIZE);
  const body = node("resultBody");
  body.replaceChildren();
  if (!subset.length) {
    const line = document.createElement("tr");
    const cell = td(state.rows.length ? "Nenhum registro corresponde aos filtros." : "Nenhum registro carregado nesta consulta.", "empty");
    cell.colSpan = 11;
    line.append(cell);
    body.append(line);
  }
  for (const row of subset) {
    const tr = document.createElement("tr");
    tr.append(td(row.ano_emenda_parlamentar_plano_acao || row.ano_plano_acao || "—"));
    tr.append(td(emendaLabel(row)));
    tr.append(td(row.nome_parlamentar_emenda_plano_acao, "parlamentar"));
    tr.append(td(row._recipient_name || beneficiaryName(row.id_beneficiario)));
    tr.append(td(beneficiaryCnpj(row.id_beneficiario)));
    tr.append(td(row.nome_objeto || row.detalhamento_objeto, "objeto"));
    const situation = td("");
    const pill = document.createElement("span");
    const value = String(row.situacao_plano_acao || "Não informada");
    pill.textContent = value;
    pill.className = "pill " + normalized(value).toLowerCase();
    situation.append(pill);
    tr.append(situation);
    tr.append(td(money.format(asNumber(row.valor_custeio_plano_acao))));
    tr.append(td(money.format(asNumber(row.valor_investimento_plano_acao))));
    tr.append(td(money.format(amount(row))));
    const detailCell = td("");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-btn";
    button.textContent = "Visualizar";
    button.addEventListener("click", () => showDetail(row));
    detailCell.append(button);
    tr.append(detailCell);
    body.append(tr);
  }
  const total = rows.reduce((s,row) => s + amount(row), 0);
  const cost = rows.reduce((s,row) => s + asNumber(row.valor_custeio_plano_acao), 0);
  const invest = rows.reduce((s,row) => s + asNumber(row.valor_investimento_plano_acao), 0);
  node("countMetric").textContent = state.rows.length ? numberFmt.format(rows.length) : "—";
  node("totalMetric").textContent = state.rows.length ? money.format(total) : "—";
  node("costMetric").textContent = state.rows.length ? money.format(cost) : "—";
  node("investMetric").textContent = state.rows.length ? money.format(invest) : "—";
  const pTotal=rows.filter(r=>r._recipient_kind==="prefeitura").reduce((s,r)=>s+amount(r),0);
  const sTotal=rows.filter(r=>r._recipient_kind==="saude").reduce((s,r)=>s+amount(r),0);
  node("prefeituraMetric").textContent = state.rows.length ? money.format(pTotal) : "—";
  node("saudeMetric").textContent = state.rows.length ? money.format(sTotal) : "—";
  node("exportBtn").disabled = rows.length === 0;
  node("resultInfo").textContent = rows.length
    ? numberFmt.format(rows.length) + " plano(s) · " + (node("recipientFilter").selectedOptions[0]?.textContent || "") + " · página " + state.page + " de " + totalPages
    : (state.rows.length ? "Os filtros de texto não retornaram correspondência." : "Nenhum dado carregado.");
  node("paginationLabel").textContent = rows.length ? "Página " + state.page + " de " + totalPages : "Página —";
  node("prevBtn").disabled = state.page <= 1 || rows.length === 0;
  node("nextBtn").disabled = state.page >= totalPages || rows.length === 0;
}
function showDetail(row) {
  const fields = [
    ["Destinatário", row._recipient_name],
    ["CNPJ do destinatário", row._recipient_cnpj],
    ["Código do plano de ação", row.codigo_plano_acao],
    ["ID do plano de ação", row.id_plano_acao],
    ["Ano da emenda", row.ano_emenda_parlamentar_plano_acao],
    ["Número da emenda", emendaLabel(row)],
    ["Parlamentar", row.nome_parlamentar_emenda_plano_acao],
    ["Beneficiário", beneficiaryName(row.id_beneficiario)],
    ["CNPJ do beneficiário", beneficiaryCnpj(row.id_beneficiario)],
    ["Situação", row.situacao_plano_acao],
    ["Modalidade", row.modalidade_plano_acao],
    ["Categoria", row.categoria_despesa_plano_acao],
    ["Nome do objeto", row.nome_objeto],
    ["Detalhamento do objeto", row.detalhamento_objeto],
    ["Políticas públicas", row.codigo_descricao_areas_politicas_publicas_plano_acao],
    ["Programação orçamentária", row.descricao_programacao_orcamentaria_plano_acao],
    ["Custeio previsto", money.format(asNumber(row.valor_custeio_plano_acao))],
    ["Investimento previsto", money.format(asNumber(row.valor_investimento_plano_acao))],
    ["Total previsto", money.format(amount(row))],
    ["Motivo do impedimento", row.motivo_impedimento_plano_acao]
  ];
  const list = node("detailList");
  list.replaceChildren();
  for (const [title, value] of fields) {
    const term = document.createElement("dt");
    term.textContent = title;
    const desc = document.createElement("dd");
    desc.textContent = value == null || value === "" ? "—" : String(value);
    list.append(term,desc);
  }
  node("detailDialog").showModal();
}
function excelSafe(value) {
  let output = String(value == null ? "" : value);
  if (/^\s*[=+\-@]/.test(output)) output = "'" + output;
  return '"' + output.replace(/"/g,'""') + '"';
}
function exportCSV() {
  const headers = ["Ano da emenda","Código da emenda","Parlamentar","UF","Beneficiário","CNPJ destinatário","Código do plano","Situação","Categoria de despesa","Objeto","Detalhamento","Custeio","Investimento","Total"];
  const csv = [headers.map(excelSafe).join(";")];
  for (const row of state.filtered) {
    const cols = [
      row.ano_emenda_parlamentar_plano_acao, emendaLabel(row), row.nome_parlamentar_emenda_plano_acao,
      node("uf").value, beneficiaryName(row.id_beneficiario), beneficiaryCnpj(row.id_beneficiario), row.codigo_plano_acao, row.situacao_plano_acao,
      row.categoria_despesa_plano_acao,row.nome_objeto,row.detalhamento_objeto,
      asNumber(row.valor_custeio_plano_acao).toFixed(2).replace(".",","),
      asNumber(row.valor_investimento_plano_acao).toFixed(2).replace(".",","),
      amount(row).toFixed(2).replace(".",",")
    ];
    csv.push(cols.map(excelSafe).join(";"));
  }
  const blob = new Blob(["\uFEFF",csv.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "emendas-especiais-" + "sao-bernardo-do-campo-" + new Date().toISOString().slice(0,10) + ".csv";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function updateDate() {
  try {
    const d = await getJSON("data-atualizacao", {}, 1);
    const raw = typeof d === "string" ? d : (d.data_atualizacao || d.data || d.ultima_atualizacao || d.data_ultima_atualizacao || "");
    const value = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.substring(8,10)+"/"+raw.substring(5,7)+"/"+raw.substring(0,4) : "";
    node("updatedAt").textContent = value ? "Base informada: " + value : "Atualização: consulte a fonte";
  } catch {
    node("updatedAt").textContent = "Data de atualização indisponível";
  }
}
function resetFilters() {
  node("recipientFilter").value = "ambos";
  node("uf").value = "SP";
  node("recipientFilter").value = "ambos";
  node("year").value = "";
  node("parliamentarian").value = "";
  node("amendment").value = "";
  node("situation").value = "";
  node("category").value = "";
  ++state.searchToken;
  setBusy(false);
  clearResultRows();
  if(state.currentBeneficiaries.length) runSearch();
  else loadBeneficiaries();
}
function setup() {
  populateUF();
  node("recipientFilter").addEventListener("change", () => { if (state.rows.length) applyLocalFilters(); });
  node("filterForm").addEventListener("submit", runSearch);
  node("recipientFilter").addEventListener("change", runSearch);
  node("clearBtn").addEventListener("click", resetFilters);
  node("exportBtn").addEventListener("click", exportCSV);
  node("prevBtn").addEventListener("click", () => {state.page--;renderResults();});
  node("nextBtn").addEventListener("click", () => {state.page++;renderResults();});
  node("closeDialog").addEventListener("click", () => node("detailDialog").close());
  loadBeneficiaries();
  updateDate();
}
document.addEventListener("DOMContentLoaded", setup);