"use strict";
/* Dashboard de emendas CGU: leitura local, sem token público nem valores demonstrativos. */
(() => {
  const $ = id => document.getElementById(id);
  const brl = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
  const int = new Intl.NumberFormat("pt-BR");
  const s = {rows:[],list:[],page:1,loaded:false};
  const pageSize=25;
  const normalize = v => String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const money = v => v===null||v===undefined ? "—" : brl.format(v/100);
  function say(message,kind) {
    $("cguStatus").textContent=message;
    $("cguStatus").className="cgu-notice "+(kind||"");
  }
  function display() {
    const body=$("cguRows");body.replaceChildren();
    const max=Math.max(1,Math.ceil(s.list.length/pageSize));
    s.page=Math.max(1,Math.min(max,s.page));
    const rows=s.list.slice((s.page-1)*pageSize,s.page*pageSize);
    for(const r of rows) {
      const tr=document.createElement("tr");
      const category={prefeitura:"Prefeitura",saude:"Fundo de Saúde",terceiro:"Outro CNPJ na cidade",localidade:"Somente localidade"}[r.categoria]||r.categoria;
      for(const value of [r.ano,r.codigo,r.autor||"—",r.tipo||"—",category,r.favorecido||"Não identificado",money(r.valorRecebidoCentavos)]){
        const td=document.createElement("td");td.textContent=value;tr.append(td);
      }
      const td=document.createElement("td"),a=document.createElement("a");
      a.href="https://portaldatransparencia.gov.br/emendas/consulta";
      a.target="_blank";a.rel="noopener noreferrer";a.textContent="Abrir CGU";
      a.title="Busque o código "+r.codigo+" no Portal da Transparência";
      td.append(a);tr.append(td);body.append(tr);
    }
    if(!rows.length) {
      const tr=document.createElement("tr"),td=document.createElement("td");
      td.colSpan=8;td.className="empty";
      td.textContent=s.loaded?"Nenhum registro corresponde aos filtros.":"Aguardando primeira coleta oficial.";
      tr.append(td);body.append(tr);
    }
    const sum=category=>s.list.filter(r=>category.includes(r.categoria)).reduce((n,r)=>n+(r.valorRecebidoCentavos||0),0);
    $("cguCount").textContent=int.format(s.list.length);
    $("cguPublic").textContent=money(sum(["prefeitura","saude"]));
    $("cguThird").textContent=money(sum(["terceiro"]));
    $("cguLocality").textContent=int.format(s.list.filter(r=>r.categoria==="localidade").length);
    $("cguPages").textContent="Página "+s.page+" de "+max;
    $("cguPrev").disabled=s.page<=1;
    $("cguNext").disabled=s.page>=max;
    $("cguExport").disabled=!s.list.length;
  }
  function apply() {
    const kind=$("cguCategory").value,year=$("cguYear").value,type=normalize($("cguType").value);
    const query=normalize($("cguSearch").value);
    s.list=s.rows.filter(r=>(!kind||r.categoria===kind)&&(!year||String(r.ano)===year)
      &&(!type||normalize(r.tipo).includes(type))
      &&(!query||normalize([r.codigo,r.autor,r.tipo,r.favorecido,r.cnpj,(r.convenios||[]).join(" ")].join(" ")).includes(query)));
    s.page=1;display();
  }
  function safeCSV(v) {
    let value=String(v===null||v===undefined?"":v);
    if(/^[=+\-@\t\r]/.test(value))value="'"+value;
    return '"'+value.replace(/"/g,'""')+'"';
  }
  function exportCSV(){
    const header=["Ano","Código da emenda","Autor","Tipo","Categoria","Favorecido","CNPJ","Município","Valor recebido (R$)","Meses","Convênios","Origem"];
    const data=s.list.map(r=>[r.ano,r.codigo,r.autor,r.tipo,r.categoria,r.favorecido,r.cnpj,r.municipio,
      r.valorRecebidoCentavos===null?"":(r.valorRecebidoCentavos/100).toFixed(2).replace(".",","),
      (r.competencias||[]).join(" | "),(r.convenios||[]).join(" | "),r.origem]);
    const csv="\ufeff"+[header,...data].map(r=>r.map(safeCSV).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="emendas-federais-sbc-cgu.csv";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  async function load(){
    try{
      const response=await fetch("./dados-cgu.json?v="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const data=await response.json();
      if(data.status!=="ok"||!Array.isArray(data.registros)){
        say("A coleta foi instalada; ainda não há um arquivo validado com registros da CGU. A consulta de emendas Pix abaixo continua disponível.","warn");
        display();return;
      }
      s.rows=data.registros;s.loaded=true;
      const years=[...new Set(s.rows.map(r=>r.ano))].sort((a,b)=>b-a);
      for(const y of years){const option=document.createElement("option");option.value=y;option.textContent=y;$("cguYear").append(option);}
      const date=new Date(data.capturadoEmUTC);
      say("Dados da CGU processados em "+(Number.isNaN(date.getTime())?"data não informada":date.toLocaleString("pt-BR"))+". "+int.format(s.rows.length)+" registros. Valores recebidos e emendas de localidade estão separados.","ok");
      apply();
    }catch(e){
      say("Não foi possível carregar os dados consolidados ("+e.message+"). A consulta Pix abaixo permanece disponível.","error");
      display();
    }
  }
  for(const id of ["cguCategory","cguYear","cguType","cguSearch"])$(id).addEventListener("input",apply);
  $("cguPrev").addEventListener("click",()=>{s.page--;display();});
  $("cguNext").addEventListener("click",()=>{s.page++;display();});
  $("cguExport").addEventListener("click",exportCSV);
  $("cguClear").addEventListener("click",()=>{for(const id of ["cguCategory","cguYear","cguType","cguSearch"])$(id).value="";apply();});
  load();
})();
