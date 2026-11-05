"use strict";
/* Fonte única CGU: dados-cgu.json atualizado em GitHub Actions. */
(() => {
  const $ = id => document.getElementById(id);
  const brl = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
  const int = new Intl.NumberFormat("pt-BR");
  const state = {rows:[],filtered:[],page:1,loaded:false};
  const PAGE_SIZE=25;
  const normalize = value => String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const money = cents => cents===null||cents===undefined ? "—" : brl.format(cents/100);
  const categories = {prefeitura:"Prefeitura",saude:"Fundo Municipal de Saúde",terceiro:"Outro CNPJ na cidade",localidade:"Somente localidade"};
  function say(text,level="") {
    $("cguStatus").textContent=text;
    $("cguStatus").className="cgu-notice "+level;
  }
  function chosen(record,filter) {
    if(filter==="municipio") return record.categoria==="prefeitura"||record.categoria==="saude";
    return !filter || record.categoria===filter;
  }
  function render() {
    const body=$("cguRows");
    body.replaceChildren();
    const pages=Math.max(1,Math.ceil(state.filtered.length/PAGE_SIZE));
    state.page=Math.max(1,Math.min(pages,state.page));
    const displayed=state.filtered.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE);
    for(const row of displayed) {
      const tr=document.createElement("tr");
      for(const text of [row.ano,row.codigo,row.autor||"—",row.tipo||"—",categories[row.categoria]||row.categoria,
                         row.favorecido||"Não identificado",row.cnpj||"—",money(row.valorRecebidoCentavos)]) {
        const td=document.createElement("td");
        td.textContent=text;
        tr.append(td);
      }
      const td=document.createElement("td"),link=document.createElement("a");
      link.href="https://portaldatransparencia.gov.br/emendas/consulta";
      link.target="_blank";
      link.rel="noopener noreferrer";
      link.textContent="CGU";
      link.title="Pesquise a emenda "+row.codigo+" no portal oficial";
      td.append(link);tr.append(td);body.append(tr);
    }
    if(!displayed.length){
      const tr=document.createElement("tr"),td=document.createElement("td");
      td.colSpan=9;td.className="empty";
      td.textContent=state.loaded?"Nenhum registro corresponde aos filtros.":"Aguardando dados da CGU.";
      tr.append(td);body.append(tr);
    }
    const total=category=>state.filtered.reduce((sum,row)=>sum+((!category||row.categoria===category)?(row.valorRecebidoCentavos||0):0),0);
    const received=state.filtered.some(r=>r.valorRecebidoCentavos!==null&&r.valorRecebidoCentavos!==undefined);
    $("cguCount").textContent=int.format(state.filtered.length);
    $("cguPublic").textContent=received?money(total(null)):"—";
    $("cguPrefeitura").textContent=money(total("prefeitura"));
    $("cguSaude").textContent=money(total("saude"));
    $("cguPages").textContent="Página "+state.page+" de "+pages;
    $("cguPrev").disabled=state.page<=1;
    $("cguNext").disabled=state.page>=pages;
    $("cguExport").disabled=!state.filtered.length;
  }
  function apply(){
    const kind=$("cguCategory").value,year=$("cguYear").value,type=normalize($("cguType").value),q=normalize($("cguSearch").value);
    state.filtered=state.rows.filter(row=>chosen(row,kind)
      &&(!year||String(row.ano)===year)
      &&(!type||normalize(row.tipo).includes(type))
      &&(!q||normalize([row.ano,row.codigo,row.autor,row.tipo,row.favorecido,row.cnpj,row.municipio,(row.convenios||[]).join(" ")].join(" ")).includes(q)));
    state.page=1;render();
  }
  function csvCell(input){
    let text=String(input==null?"":input);
    if(/^[=+\-@\t\r]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  function exportCSV(){
    if(!state.filtered.length)return;
    const columns=["Ano","Código da Emenda","Autor","Tipo","Categoria","Favorecido","CNPJ","Município","Valor recebido (R$)","Competências","Convênios","Fonte"];
    const rows=state.filtered.map(r=>[r.ano,r.codigo,r.autor,r.tipo,r.categoria,r.favorecido,r.cnpj,r.municipio,
      r.valorRecebidoCentavos==null?"":(r.valorRecebidoCentavos/100).toFixed(2).replace(".",","),
      (r.competencias||[]).join(" | "),(r.convenios||[]).join(" | "),r.origem]);
    const csv="\ufeff"+[columns,...rows].map(r=>r.map(csvCell).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;a.download="emendas-federais-sbc-cgu.csv";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  async function load(){
    try{
      const response=await fetch("./dados-cgu.json?ts="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const payload=await response.json();
      if(payload.status!=="ok"||!Array.isArray(payload.registros)||!payload.registros.length){
        say("Aguardando dados oficiais válidos da CGU. Nenhum valor será estimado.","warn");
        $("cguUpdated").textContent="Sem base validada";
        render();return;
      }
      state.rows=payload.registros;
      state.loaded=true;
      const years=[...new Set(state.rows.map(r=>r.ano))].sort((a,b)=>b-a);
      for(const year of years){
        const option=document.createElement("option");
        option.value=year;option.textContent=year;
        $("cguYear").append(option);
      }
      const date=new Date(payload.capturadoEmUTC);
      const updated=Number.isNaN(date.getTime())?"Data não disponível":date.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
      $("cguUpdated").textContent="Atualizada em "+updated;
      say("Dados oficiais da CGU carregados: "+int.format(state.rows.length)+" registros. Atualização automática diária.","ok");
      apply();
    }catch(error){
      say("Falha ao carregar o arquivo da CGU ("+error.message+"). Tente atualizar esta página.","error");
      $("cguUpdated").textContent="Falha no carregamento";
      render();
    }
  }
  for(const id of ["cguCategory","cguYear","cguType","cguSearch"])$(id).addEventListener("input",apply);
  $("cguPrev").addEventListener("click",()=>{state.page--;render();});
  $("cguNext").addEventListener("click",()=>{state.page++;render();});
  $("cguExport").addEventListener("click",exportCSV);
  $("cguClear").addEventListener("click",()=>{
    $("cguCategory").value="municipio";
    $("cguYear").value="";
    $("cguType").value="";
    $("cguSearch").value="";
    apply();
  });
  load();
})();
