"use strict";
/* Consulta exclusiva a dados-sp.json gerado a partir do ZIP oficial estadual. */
(() => {
  const $ = id => document.getElementById(id);
  const currency = new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"});
  const integer = new Intl.NumberFormat("pt-BR");
  const state = {all:[],filtered:[],page:1,loaded:false};
  const limit = 25;
  const norm = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const money = c => c===null||c===undefined ? "—" : currency.format(c/100);
  const isHealth = r => norm(r.orgaoExecutor).includes("SAUDE") || norm(r.funcao).includes("SAUDE");
  const source = "https://www.transparencia.sp.gov.br/EmendasParlamentares/Concedidas";
  function status(t,c){$("spStatus").textContent=t;$("spStatus").className="cgu-notice "+(c||"");}
  function element(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
  function apply() {
    const recipient=$("spRecipient").value,origin=$("spOrigin").value,year=$("spYear").value;
    const area=$("spArea").value,search=norm($("spSearch").value);
    state.filtered=state.all.filter(r=>{
      if(recipient==="municipio"&&r.categoria!=="prefeitura"&&r.categoria!=="saude")return false;
      if(recipient&&recipient!=="municipio"&&r.categoria!==recipient)return false;
      if(origin&&r.origemRecurso!==origin)return false;
      if(year&&String(r.ano)!==year)return false;
      if(area==="saude"&&!isHealth(r))return false;
      if(area==="outras"&&isHealth(r))return false;
      if(search&&!norm([r.codigo,r.parlamentar,r.partido,r.beneficiario,r.objeto,r.instrumento,r.orgaoExecutor,r.origemRecurso,r.tipo].join(" ")).includes(search))return false;
      return true;
    });
    state.page=1;render();
  }
  function render(){
    const tbody=$("spRows");tbody.replaceChildren();
    const pages=Math.max(1,Math.ceil(state.filtered.length/limit));
    state.page=Math.max(1,Math.min(state.page,pages));
    const subset=state.filtered.slice((state.page-1)*limit,state.page*limit);
    for(const r of subset){
      const tr=element("tr");
      const vals=[r.ano||"—",r.codigo||"—",r.parlamentar||"—",r.beneficiario||"—",r.objeto||"—",
        r.instrumento||"—",r.origemRecurso||"—",money(r.empenhadoCentavos),money(r.liquidadoCentavos),
        money(r.pagoCentavos),"Não identificada","—","—"];
      for(const value of vals)tr.append(element("td",value));
      const td=element("td"),a=element("a","Portal SP");a.href=source;a.target="_blank";a.rel="noopener noreferrer";a.title="Pesquise a emenda "+(r.codigo||"") +" no portal estadual";td.append(a);tr.append(td);
      tbody.append(tr);
    }
    if(!subset.length){
      const tr=element("tr"),td=element("td",state.loaded?"Nenhum registro atende aos filtros.":"Aguardando a primeira importação.");
      td.colSpan=14;td.className="empty";tr.append(td);tbody.append(tr);
    }
    const sum=k=>state.filtered.reduce((n,r)=>n+(r[k]||0),0);
    $("spCount").textContent=integer.format(state.filtered.length);
    $("spCommitted").textContent=state.filtered.length?money(sum("empenhadoCentavos")):"—";
    $("spLiquidated").textContent=state.filtered.length?money(sum("liquidadoCentavos")):"—";
    $("spPaid").textContent=state.filtered.length?money(sum("pagoCentavos")):"—";
    $("spPages").textContent="Página "+state.page+" de "+pages;
    $("spPrev").disabled=state.page<=1;$("spNext").disabled=state.page>=pages;
    $("spExport").disabled=!state.filtered.length;
  }
  function quote(value){
    let v=String(value==null?"":value);
    if(/^[=+\-@\t\r]/.test(v))v="'"+v;
    return '"'+v.replace(/"/g,'""')+'"';
  }
  function exportCSV(){
    if(!state.filtered.length)return;
    const heads=["Ano","Codigo emenda","Parlamentar","Partido","Beneficiario","Tipo beneficiario (por nome)","CNPJ","Objeto","Instrumento juridico","Orgao executor","Origem recurso","Tipo","Empenhado R$","Liquidado R$","Pago pelo Estado R$","Lancamentos","Banco","Agencia","Conta","Fonte"];
    const rows=state.filtered.map(r=>[r.ano,r.codigo,r.parlamentar,r.partido,r.beneficiario,r.categoria,"Não informado",r.objeto,r.instrumento,r.orgaoExecutor,r.origemRecurso,r.tipo,
      ...["empenhadoCentavos","liquidadoCentavos","pagoCentavos"].map(k=>r[k]==null?"":(r[k]/100).toFixed(2).replace(".",",")),
      r.lancamentos,"Não identificada","","",source]);
    const csv="\ufeff"+[heads,...rows].map(x=>x.map(quote).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=element("a");a.href=url;a.download="emendas-estaduais-sao-bernardo.csv";document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  async function load(){
    try{
      const res=await fetch("../dados-sp.json?v="+Date.now(),{cache:"no-store"});
      if(!res.ok)throw new Error("HTTP "+res.status);
      const data=await res.json();
      if(data.status!=="ok"||!Array.isArray(data.registros)||!data.registros.length){
        status("O coletor estadual foi instalado, mas a primeira importação oficial ainda não está disponível.","warn");render();return;
      }
      state.all=data.registros;state.loaded=true;
      for(const year of [...new Set(state.all.map(r=>r.ano).filter(Boolean))].sort((a,b)=>b-a)){
        const option=element("option",String(year));option.value=String(year);$("spYear").append(option);
      }
      const when=new Date(data.atualizadoEmUTC);
      $("spUpdated").textContent="Atualizado em "+(Number.isNaN(when.getTime())?"data não informada":when.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}));
      const entries=data.estatisticas?.lancamentosMunicipio ?? "?";
      status("Base estadual carregada: "+integer.format(state.all.length)+" registros agrupados, provenientes de "+integer.format(entries)+" lançamentos em São Bernardo do Campo.","ok");
      apply();
    }catch(error){
      status("Erro ao carregar dados estaduais: "+error.message+". Consulte o arquivo oficial do Estado.","error");
      $("spUpdated").textContent="Base ainda não carregada";render();
    }
  }
  for(const id of ["spRecipient","spOrigin","spYear","spArea","spSearch"])$(id).addEventListener("input",apply);
  $("spClear").addEventListener("click",()=>{$("spRecipient").value="municipio";$("spOrigin").value="Emenda LOA";$("spYear").value="";$("spArea").value="";$("spSearch").value="";apply();});
  $("spPrev").addEventListener("click",()=>{state.page--;render();});
  $("spNext").addEventListener("click",()=>{state.page++;render();});
  $("spExport").addEventListener("click",exportCSV);
  load();
})();
