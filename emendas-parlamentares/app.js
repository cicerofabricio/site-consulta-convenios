"use strict";

/**
 * Consulta independente de transferências especiais do Transferegov.
 * Fonte: https://api-publica.transferegov.gestao.gov.br/especiais/docs
 * Não utiliza banco de dados, chaves, proxy externo ou dados demonstrativos.
 */
const API_BASE = "https://api-publica.transferegov.gestao.gov.br/especiais";
const API_PAGE_SIZE = 200;
const MAX_ROWS = 20000;
const TABLE_PAGE_SIZE = 25;
const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numberFmt = new Intl.NumberFormat("pt-BR");
const node = id => document.getElementById(id);
const state = { beneficiaries: new Map(), currentBeneficiaries: [], rows: [], filtered: [], page: 1, beneficiaryToken: 0, searchToken: 0, busy: false, selectedName: "" };

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
async function loadBeneficiaries(uf) {
  const token = ++state.beneficiaryToken;
  const select = node("beneficiary");
  select.disabled = true;
  select.replaceChildren(new Option("Carregando beneficiários...", ""));
  state.currentBeneficiaries = [];
  if (!uf) {
    select.replaceChildren(new Option("Selecione a UF primeiro", ""));
    status("Selecione uma unidade federativa.", "info");
    return;
  }
  status("Consultando a lista de beneficiários de " + uf + "...", "info");
  try {
    let items;
    if (state.beneficiaries.has(uf)) {
      items = state.beneficiaries.get(uf);
    } else {
      const data = await fetchAll("beneficiarios-especiais", { uf_beneficiario: uf }, n => {
        if (token === state.beneficiaryToken) status("Carregando beneficiários de " + uf + ": " + numberFmt.format(n) + " registros...", "info");
      });
      if (!data.complete) throw new Error("Lista de beneficiários maior que o limite seguro da consulta.");
      items = data.rows.filter(row => normalized(row.uf_beneficiario) === uf);
      items.sort((a,b) => String(a.nome_beneficiario || "").localeCompare(String(b.nome_beneficiario || ""), "pt-BR"));
      state.beneficiaries.set(uf, items);
    }
    if (token !== state.beneficiaryToken) return;
    state.currentBeneficiaries = items;
    select.replaceChildren(new Option("Selecione um beneficiário / município", ""));
    for (const item of items) {
      const option = new Option(String(item.nome_beneficiario || "Beneficiário sem nome"), String(item.id_beneficiario));
      option.dataset.name = String(item.nome_beneficiario || "");
      select.append(option);
    }
    const sbc = items.find(item => normalized(item.nome_beneficiario).includes("SAO BERNARDO DO CAMPO"));
    if (uf === "SP" && sbc) select.value = String(sbc.id_beneficiario);
    select.disabled = items.length === 0;
    status(items.length
      ? numberFmt.format(items.length) + " beneficiários disponíveis em " + uf + ". Escolha um e clique em “Consultar emendas”."
      : "A API retornou a lista vazia para esta UF. Isso pode ser falha temporária na publicação dos dados.", items.length ? "success" : "warning");
  } catch (error) {
    if (token !== state.beneficiaryToken) return;
    select.replaceChildren(new Option("Não foi possível carregar a lista", ""));
    status(friendlyError(error), "error");
  }
}
function beneficiaryName(id) {
  const b = state.currentBeneficiaries.find(item => String(item.id_beneficiario) === String(id));
  return b ? String(b.nome_beneficiario || "") : state.selectedName;
}
function clearResultRows() {
  state.rows = [];
  state.filtered = [];
  state.page = 1;
  renderResults();
}
async function runSearch(event) {
  if (event) event.preventDefault();
  const id = node("beneficiary").value;
  if (!id) {
    status("Escolha um beneficiário ou município antes de pesquisar.", "warning");
    node("beneficiary").focus();
    return;
  }
  const token = ++state.searchToken;
  state.selectedName = beneficiaryName(id);
  const filters = { id_beneficiario: id };
  if (node("year").value) filters.ano_emenda_parlamentar_plano_acao = node("year").value;
  if (node("situation").value) filters.situacao_plano_acao = node("situation").value;
  if (node("category").value) filters.categoria_despesa_plano_acao = node("category").value;
  clearResultRows();
  setBusy(true);
  try {
    status("Consultando planos de ação no Transferegov...", "info");
    const result = await fetchAll("planos-acao-especiais", filters, (n,total) => {
      if (token !== state.searchToken) return;
      const suffix = Number.isFinite(Number(total)) && total != null ? " de " + numberFmt.format(Number(total)) : "";
      status("Recebendo planos de ação: " + numberFmt.format(n) + suffix + " registros...", "info");
    });
    if (token !== state.searchToken) return;
    if (!result.complete) {
      throw new Error("A consulta ultrapassou o limite seguro de " + numberFmt.format(MAX_ROWS) + " registros. Refine os filtros; não serão apresentados totais parciais como se fossem completos.");
    }
    state.rows = result.rows.filter(row => String(row.id_beneficiario) === String(id));
    applyLocalFilters();
    if (!result.rows.length) {
      status("A API retornou zero planos de ação para os filtros. Isso pode significar ausência de registros OU indisponibilidade temporária da base governamental. Confirme na fonte oficial.", "warning");
    } else {
      status(numberFmt.format(state.filtered.length) + " resultado(s) após os filtros. Consulta concluída com a API oficial.", "success");
    }
  } catch (error) {
    if (token === state.searchToken) {
      clearResultRows();
      status(friendlyError(error), "error");
    }
  } finally {
    if (token === state.searchToken) setBusy(false);
  }
}
function applyLocalFilters() {
  const parlamentar = normalized(node("parliamentarian").value);
  const emenda = normalized(node("amendment").value);
  state.filtered = state.rows.filter(row => {
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
    cell.colSpan = 10;
    line.append(cell);
    body.append(line);
  }
  for (const row of subset) {
    const tr = document.createElement("tr");
    tr.append(td(row.ano_emenda_parlamentar_plano_acao || row.ano_plano_acao || "—"));
    tr.append(td(emendaLabel(row)));
    tr.append(td(row.nome_parlamentar_emenda_plano_acao, "parlamentar"));
    tr.append(td(beneficiaryName(row.id_beneficiario)));
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
  node("exportBtn").disabled = rows.length === 0;
  node("resultInfo").textContent = rows.length
    ? numberFmt.format(rows.length) + " registro(s) de " + state.selectedName + " · página " + state.page + " de " + totalPages
    : (state.rows.length ? "Os filtros de texto não retornaram correspondência." : "Nenhum dado carregado.");
  node("paginationLabel").textContent = rows.length ? "Página " + state.page + " de " + totalPages : "Página —";
  node("prevBtn").disabled = state.page <= 1 || rows.length === 0;
  node("nextBtn").disabled = state.page >= totalPages || rows.length === 0;
}
function showDetail(row) {
  const fields = [
    ["Código do plano de ação", row.codigo_plano_acao],
    ["ID do plano de ação", row.id_plano_acao],
    ["Ano da emenda", row.ano_emenda_parlamentar_plano_acao],
    ["Número da emenda", emendaLabel(row)],
    ["Parlamentar", row.nome_parlamentar_emenda_plano_acao],
    ["Beneficiário", beneficiaryName(row.id_beneficiario)],
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
  const headers = ["Ano da emenda","Código da emenda","Parlamentar","UF","Beneficiário","Código do plano","Situação","Categoria de despesa","Objeto","Detalhamento","Custeio","Investimento","Total"];
  const csv = [headers.map(excelSafe).join(";")];
  for (const row of state.filtered) {
    const cols = [
      row.ano_emenda_parlamentar_plano_acao, emendaLabel(row), row.nome_parlamentar_emenda_plano_acao,
      node("uf").value, beneficiaryName(row.id_beneficiario), row.codigo_plano_acao, row.situacao_plano_acao,
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
  a.download = "emendas-especiais-" + node("uf").value.toLowerCase() + "-" + new Date().toISOString().slice(0,10) + ".csv";
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
  node("uf").value = "SP";
  node("year").value = "";
  node("parliamentarian").value = "";
  node("amendment").value = "";
  node("situation").value = "";
  node("category").value = "";
  ++state.searchToken;
  setBusy(false);
  clearResultRows();
  loadBeneficiaries("SP");
}
function setup() {
  populateUF();
  node("uf").addEventListener("change", () => {
    ++state.searchToken;
    setBusy(false);
    clearResultRows();
    loadBeneficiaries(node("uf").value);
  });
  node("beneficiary").addEventListener("change", () => { ++state.searchToken; setBusy(false); clearResultRows(); status("Beneficiário selecionado. Clique em “Consultar emendas”."); });
  node("filterForm").addEventListener("submit", runSearch);
  node("clearBtn").addEventListener("click", resetFilters);
  node("exportBtn").addEventListener("click", exportCSV);
  node("prevBtn").addEventListener("click", () => {state.page--;renderResults();});
  node("nextBtn").addEventListener("click", () => {state.page++;renderResults();});
  node("closeDialog").addEventListener("click", () => node("detailDialog").close());
  loadBeneficiaries("SP");
  updateDate();
}
document.addEventListener("DOMContentLoaded", setup);