/* Catálogo de fontes oficiais verificado em 05/11/2026. Exibição restrita a São Bernardo do Campo/SP.
 * Somente links reais e documentados. Sem agregação de cifras de origens distintas.
 * Todas as fontes externas abrem as consultas oficiais em nova aba.
 */
(() => {
  "use strict";
  const FONTES = [
    {
      id:"trf-especiais", title:"Transferegov — transferência especial federal",
      provider:"Ministério da Gestão · API de dados abertos",sphere:"federal",uf:"",
      types:["individual","especial"],kind:"api",mode:"local",
      url:"#consultaPix",
      description:"Planos de ação e beneficiários de transferências especiais. Esta é a modalidade com consulta e exportação diretamente nesta página.",
      detail:"Indicadores representam valores de planos de ação, não pagamentos."
    },
    {
      id:"cgu-geral",title:"Portal da Transparência — visão geral de emendas",
      provider:"CGU · Governo Federal",sphere:"federal",uf:"",
      types:["individual","especial","bancada","comissao","relator"],kind:"painel",
      url:"https://portaldatransparencia.gov.br/emendas",
      description:"Painel federal com distribuição por ano, autoria, tipo e localidade e valores de empenho e pagamento.",
      detail:"Abrange diferentes tipos de emendas federais."
    },
    {
      id:"cgu-detalhes",title:"CGU — consulta detalhada por emenda",
      provider:"Portal da Transparência · União",sphere:"federal",uf:"",
      types:["individual","especial","bancada","comissao","relator"],kind:"consulta",
      url:"https://portaldatransparencia.gov.br/emendas/consulta",
      description:"Localize emendas federais por código, número, autor, tipo e outros parâmetros; acompanhe os registros do portal."
    },
    {
      id:"cgu-favorecido",title:"CGU — emendas por favorecido",
      provider:"Portal da Transparência · União",sphere:"federal",uf:"",
      types:["individual","especial","bancada","comissao","relator"],kind:"consulta",
      url:"https://portaldatransparencia.gov.br/emendas/consulta-por-favorecido",
      description:"Pesquise quem recebeu pagamentos vinculados a emendas, inclusive municípios, fundos e organizações.",
      detail:"Útil para filtrar município do favorecido."
    },
    {
      id:"cgu-documento",title:"CGU — empenho, liquidação e pagamento",
      provider:"Portal da Transparência · União",sphere:"federal",uf:"",
      types:["individual","especial","bancada","comissao","relator"],kind:"consulta",
      url:"https://portaldatransparencia.gov.br/emendas/consulta-por-documento",
      description:"Documentos de execução orçamentária e financeira associados a emendas federais.",
      detail:"Possui filtro de localidade de aplicação do recurso."
    },
    {
      id:"cgu-dados",title:"CGU — base aberta de todas as emendas",
      provider:"Portal da Transparência · Dados abertos",sphere:"federal",uf:"",
      types:["individual","especial","bancada","comissao","relator"],kind:"csv",
      url:"https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares",
      description:"Download dos dados federais por emenda, convênios vinculados e favorecidos em arquivos oficiais.",
      detail:"Base externa para importação e análise própria."
    },
    {
      id:"cgu-api",title:"CGU — API geral de emendas",
      provider:"Portal da Transparência · Swagger",sphere:"federal",uf:"",
      types:["individual","especial","bancada","comissao","relator"],kind:"api",
      url:"https://api.portaldatransparencia.gov.br/",
      description:"Documentação dos endpoints de emendas e respectivos documentos para futura integração de modalidades federais.",
      detail:"A API da CGU requer chave de acesso; não foi incorporada ao JavaScript público para evitar exposição de credenciais."
    },
    {
      id:"tesouro",title:"Tesouro — repasses individuais e de bancada",
      provider:"Tesouro Nacional · Dados abertos",sphere:"federal",uf:"",
      types:["individual","bancada"],kind:"csv",
      url:"https://www.tesourotransparente.gov.br/ckan/dataset/emendas-parlamentares-individuais-e-de-bancada",
      description:"Série mensal de repasses de emendas individuais e de bancada para estados e municípios, com arquivo CSV.",
      detail:"Dados disponíveis desde 2015 conforme catálogo oficial."
    },
    {
      id:"camara",title:"Câmara — Orçamento Aberto",
      provider:"Câmara dos Deputados",sphere:"federal",uf:"",
      types:["individual","bancada","comissao"],kind:"painel",
      url:"https://especial.camara.leg.br/orcamento-aberto/",
      description:"Consulta legislativa de emendas individuais, de comissão e de bancada, incluindo dados de autorização e execução."
    },
    {
      id:"senado",title:"Senado — orçamento e emendas da LOA 2026",
      provider:"Senado Federal · Siga Brasil",sphere:"federal",uf:"",
      types:["individual","especial","bancada","comissao","relator"],kind:"painel",
      url:"https://www25.senado.leg.br/web/orcamento/acompanhe/orcamento-anual/-/loa/2026",
      description:"Acompanhamento do orçamento federal de 2026, pesquisa de execução de emendas e acesso ao painel Siga Brasil.",
      detail:"Página específica do exercício de 2026."
    },
    {
      id:"sp-concedidas",title:"São Paulo — emendas parlamentares concedidas",
      provider:"Transparência do Estado de São Paulo",sphere:"estadual",uf:"SP",
      types:["estadual","individual"],kind:"consulta",
      url:"https://www.transparencia.sp.gov.br/EmendasParlamentares/Concedidas",
      description:"Consulta por autoria, origem do recurso, número, beneficiário, tipo de emenda, localização e valores empenhado, liquidado e pago.",
      detail:"Inclui filtros e exportação CSV no portal estadual."
    },
    {
      id:"sp-historico",title:"São Paulo — emendas impositivas e histórico",
      provider:"Transparência do Estado de São Paulo",sphere:"estadual",uf:"SP",
      types:["estadual","individual"],kind:"painel",
      url:"https://www.transparencia.sp.gov.br/home/emendasparlamentares",
      description:"Painéis e arquivos históricos de emendas individuais impositivas do estado."
    },
    {
      id:"mg-abertos",title:"Minas Gerais — emendas estaduais",
      provider:"Dados Abertos de Minas Gerais · SEGOV",sphere:"estadual",uf:"MG",
      types:["estadual","individual"],kind:"csv",
      url:"https://www.dados.mg.gov.br/dataset/portal_emendas_estaduais",
      description:"Arquivos CSV de indicações e execução das emendas estaduais, incluindo exercícios anteriores e 2026.",
      detail:"Catálogo informa atualização semanal."
    },
    {
      id:"es-abertos",title:"Espírito Santo — emendas estaduais",
      provider:"Dados Abertos do Espírito Santo · SEFAZ",sphere:"estadual",uf:"ES",
      types:["estadual","individual"],kind:"csv",
      url:"https://dados.es.gov.br/dataset/portal-da-transparencia-emendas-parlamentares-do-estado",
      description:"Arquivos por exercício, incluindo 2026, execução, contratos, aditivos e convênios vinculados a emendas."
    },
    {
      id:"rs-painel",title:"Rio Grande do Sul — emendas estaduais",
      provider:"Portal da Transparência RS",sphere:"estadual",uf:"RS",
      types:["estadual","individual"],kind:"painel",
      url:"https://transparencia.rs.gov.br/emendas-parlamentares/emendas-parlamentares-estaduais/dados/",
      description:"Consulta por deputado, partido, ano, órgão e município beneficiado, com valores e detalhamento."
    },
    {
      id:"pe-painel",title:"Pernambuco — emendas estaduais por execução",
      provider:"Portal da Transparência PE",sphere:"estadual",uf:"PE",
      types:["estadual","individual","especial"],kind:"painel",
      url:"https://transparencia.pe.gov.br/responsabilidade-fiscal/emendas-parlamentares/emendas-parlamentares-estaduais/",
      description:"Quatro painéis: Pix estaduais, execução direta, convênios e outros instrumentos e histórico 2023–2025.",
      detail:"Há informações de objeto, valores e execução por modalidade estadual."
    },
    {
      id:"go-painel",title:"Goiás — emendas estaduais",
      provider:"Transparência Goiás",sphere:"estadual",uf:"GO",
      types:["estadual","individual"],kind:"painel",
      url:"https://transparencia.go.gov.br/emendas-parlamentares-de-goias/",
      description:"Consulta às indicações estaduais e à execução orçamentária e financeira, incluindo pagamentos.",
      detail:"Portal indica cobertura de execução a partir de 2021."
    },
    {
      id:"pr-painel",title:"Paraná — emendas parlamentares",
      provider:"Portal da Transparência PR",sphere:"estadual",uf:"PR",
      types:["estadual","individual","especial"],kind:"painel",
      url:"https://transparencia.pr.gov.br/pte/home",
      description:"Portal com consultas de emendas previstas na LOA, Pix, emendas recebidas e emendas estaduais/municipais.",
      detail:"Navegue pelo menu Emendas Parlamentares do portal."
    },
    {
      id:"rj-painel",title:"Rio de Janeiro — emendas impositivas estaduais",
      provider:"Portal da Transparência RJ · Qlik",sphere:"estadual",uf:"RJ",
      types:["estadual","individual"],kind:"painel",
      url:"https://qlik.rj.gov.br/public/sense/app/a3cfd25a-0fc6-46d8-be87-52fb6e29f066/sheet/UwJJmV/state/analysis",
      description:"Painel oficial de emendas estaduais disponibilizado no mapa do site do Portal da Transparência RJ."
    },
    {
      id:"rj-dados",title:"Rio de Janeiro — arquivos de emendas 2026",
      provider:"SEPLAG RJ · Redeplan",sphere:"estadual",uf:"RJ",
      types:["estadual","individual"],kind:"csv",
      url:"https://www.redeplan.planejamento.rj.gov.br/demaisprocessos/emendas.html",
      description:"Detalhamento anual e relatórios de execução orçamentária e financeira de emendas impositivas, com CSV e Excel."
    },
    {
      id:"ba-painel",title:"Bahia — emendas estaduais",
      provider:"Transparência Bahia · SEFAZ",sphere:"estadual",uf:"BA",
      types:["estadual","individual","especial"],kind:"painel",
      url:"https://www.transparencia.ba.gov.br/Despesa/EmendasParlamentares",
      description:"Painéis estaduais de emendas, execução orçamentária e financeira e transferências especiais.",
      detail:"A navegação também está no menu Emendas Parlamentares do portal."
    }
  ];
  const byId = id => document.getElementById(id);
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const titles = {federal:"União",estadual:"Estado de SP"};
  const typeTitles = {individual:"Individual",especial:"Transferência especial",bancada:"Bancada",comissao:"Comissão",relator:"Relator",estadual:"Emenda estadual"};
  const kindTitles = {api:"API oficial",consulta:"Consulta interativa",painel:"Painel oficial",csv:"Dados abertos / CSV"};
  function buildCard(source) {
    const card = document.createElement("article");
    card.className = "source-item";
    const row = document.createElement("div");row.className = "source-item-meta";
    const sphere = document.createElement("span");
    sphere.className = "source-badge " + source.sphere;
    sphere.textContent = titles[source.sphere] + (source.uf ? " · " + source.uf : " · Brasil");
    const kind = document.createElement("span");kind.className="source-badge kind";kind.textContent=kindTitles[source.kind];
    row.append(sphere,kind);
    const h = document.createElement("h3");h.textContent=source.title;
    const prov = document.createElement("p");prov.className="source-provider";prov.textContent=source.provider;
    const desc = document.createElement("p");desc.className="source-description";desc.textContent=source.description;
    const tags = document.createElement("div");tags.className="source-tags";
    source.types.filter(x=>x!=="estadual").slice(0,4).forEach(key=>{const el=document.createElement("span");el.textContent=typeTitles[key];tags.append(el);});
    const footer = document.createElement("div");footer.className="source-item-footer";
    const link = document.createElement("a");
    link.href=source.url;
    link.className="source-action" + (source.mode==="local"?" local":"");
    link.textContent=source.mode==="local" ? "Consultar na página ↓" : "Abrir fonte oficial ↗";
    if(source.mode!=="local"){link.target="_blank";link.rel="noopener noreferrer";}
    footer.append(link);
    card.append(row,h,prov,desc);
    if (source.mode !== "local") {
      const rule=document.createElement("p");rule.className="recipient-instruction";
      rule.textContent="Neste portal, filtre pelo destinatário Município de São Bernardo do Campo (CNPJ 46.523.239/0001-47), quando o filtro estiver disponível. Não selecione apenas a localização da despesa.";
      card.append(rule);
    }
    if(source.detail){const detail=document.createElement("p");detail.className="source-detail";detail.textContent=source.detail;card.append(detail);}
    card.append(tags,footer);
    return card;
  }
  function refresh() {
    const scope=byId("sourceScope").value;
    const uf="SP"; // O destinatário é permanentemente São Bernardo do Campo/SP.
    const type=byId("sourceType").value;
    const search=norm(byId("sourceSearch").value);
    const matches=FONTES.filter(src=>{
      if(src.sphere==="estadual" && src.uf!=="SP") return false;
      if(scope && src.sphere!==scope) return false;
      if(uf && src.sphere==="estadual" && src.uf!==uf) return false;
      if(type && !src.types.includes(type)) return false;
      if(search && !norm([src.title,src.provider,src.description,src.detail,src.uf,src.sphere,src.types.map(key=>typeTitles[key]).join(" ")].join(" ")).includes(search)) return false;
      return true;
    });
    const host=byId("sourceCards");
    host.replaceChildren();
    if(!matches.length){
      const empty=document.createElement("div");empty.className="source-empty";
      empty.textContent="Nenhuma fonte do catálogo corresponde aos filtros. Isso não significa ausência de emendas: amplie a busca ou consulte o portal estadual.";
      host.append(empty);
    } else {
      const chunk=document.createDocumentFragment();
      matches.forEach(src=>chunk.append(buildCard(src)));
      host.append(chunk);
    }
    const qty=matches.length;
    byId("sourceCount").textContent=qty+" "+(qty===1?"fonte localizada":"fontes localizadas");
    byId("sourceExplanation").textContent="Destinatário único: Município de São Bernardo do Campo/SP, CNPJ 46.523.239/0001-47. Os links externos exigem selecionar o Município no portal de origem; dados de outros beneficiários na cidade ficam fora do escopo.";
  }
  function setup(){
    ["sourceScope","sourceType","sourceSearch"].forEach(id=>{
      byId(id).addEventListener(id==="sourceSearch"?"input":"change",refresh);
    });
    refresh();
  }
  document.addEventListener("DOMContentLoaded",setup);
})();