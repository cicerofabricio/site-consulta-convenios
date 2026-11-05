"use strict";
/* Principal: CGU por favorecido. Complemento: banco/agência/conta de planos oficiais. */
(() => {
  const $ = id => document.getElementById(id);
  const brl = new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"});
  const int = new Intl.NumberFormat("pt-BR");
  const s = {rows:[],list:[],page:1,loaded:false,banks:new Map(),bankLoaded:false};
  const LIMIT=25;
  const normalize = value => String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const money = cents => cents===null||cents===undefined ? "—" : brl.format(cents/100);
  const names={prefeitura:"Prefeitura",saude:"Fundo Municipal de Saúde",terceiro:"Outro CNPJ na cidade",localidade:"Somente localidade"};
  const key=r=>String(r.codigo||"")+"|"+String(r.cnpj||"");
  const accounts=r=>s.banks.get(key(r))||[];
  const withAccount=r=>accounts(r).length>0;
  const formatted=(base,digit)=>base?(base+(digit?"-"+digit:"")):"—";
  const accountList=(r,prop,composite)=>accounts(r).map(x=>composite?formatted(x[prop],x[composite]):x[prop]).filter(Boolean).join("; ");
  const isOfficialLink=url=>/^https:\/\/api-publica\.transferegov\.gestao\.gov\.br\/especiais\/planos-acao-especiais\?id_plano_acao=\d+$/.test(url);
  function notice(text,type=""){$("cguStatus").textContent=text;$("cguStatus").className="cgu-notice "+type;}
  function selected(row,mode){return mode==="municipio"?["prefeitura","saude"].includes(row.categoria):!mode||row.categoria===mode;}
  function td(tr,text){
    const el=document.createElement("td");el.textContent=text;tr.append(el);return el;
  }
  function link(container,href,label){
    const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label;
    container.append(a);return a;
  }
  function render(){
    const body=$("cguRows");body.replaceChildren();
    const pages=Math.max(1,Math.ceil(s.list.length/LIMIT));
    s.page=Math.max(1,Math.min(pages,s.page));
    for(const r of s.list.slice((s.page-1)*LIMIT,s.page*LIMIT)){
      const tr=document.createElement("tr");
      for(const val of [r.ano,r.codigo,r.autor||"—",r.tipo||"—",names[r.categoria]||r.categoria,
                         r.favorecido||"Não identificado",r.cnpj||"—",money(r.valorRecebidoCentavos)])td(tr,val);
      const found=accounts(r);
      if(found.length){
        td(tr,accountList(r,"bancoNome")||found.map(x=>x.bancoCodigo).join("; "));
        td(tr,accountList(r,"agencia","agenciaDigito"));
        td(tr,accountList(r,"conta","contaDigito"));
        td(tr,found.length>1?"Mais de uma conta vinculada":"Vinculada ao plano de ação");
      }else{
        for(const value of ["—","—","—","Não identificada"])td(tr,value);
      }
      const sources=document.createElement("td");
      link(sources,"https://portaldatransparencia.gov.br/emendas/consulta","CGU");
      const urls=[...new Set(found.map(x=>x.fonteURL).filter(isOfficialLink))];
      if(urls.length){
        sources.append(document.createTextNode(" · "));
        urls.forEach((url,i)=>{if(i)sources.append(document.createTextNode(", "));link(sources,url,"Conta "+(i+1));});
      }
      tr.append(sources);body.append(tr);
    }
    if(!body.children.length){
      const tr=document.createElement("tr"),empty=document.createElement("td");
      empty.colSpan=13;empty.className="empty";
      empty.textContent=s.loaded?"Nenhum registro corresponde aos filtros.":"Aguardando dados oficiais.";
      tr.append(empty);body.append(tr);
    }
    const sum=cat=>s.list.reduce((v,r)=>v+((!cat||r.categoria===cat)?(r.valorRecebidoCentavos||0):0),0);
    $("cguCount").textContent=int.format(s.list.length);
    $("cguPublic").textContent=s.list.some(x=>x.valorRecebidoCentavos!=null)?money(sum(null)):"—";
    $("cguPrefeitura").textContent=money(sum("prefeitura"));
    $("cguSaude").textContent=money(sum("saude"));
    $("cguAccounts").textContent=int.format(s.list.filter(withAccount).length);
    $("cguPages").textContent="Página "+s.page+" de "+pages;
    $("cguPrev").disabled=s.page===1;$("cguNext").disabled=s.page>=pages;
    $("cguExport").disabled=!s.list.length;
  }
  function apply(){
    const cat=$("cguCategory").value, year=$("cguYear").value,
      type=normalize($("cguType").value), bank=$("cguBankFilter").value, q=normalize($("cguSearch").value);
    s.list=s.rows.filter(r=>selected(r,cat)
      &&(!year||String(r.ano)===year)
      &&(!type||normalize(r.tipo).includes(type))
      &&(!bank||(bank==="identificada"?withAccount(r):!withAccount(r)))
      &&(!q||normalize([r.ano,r.codigo,r.autor,r.tipo,r.favorecido,r.cnpj,r.municipio,
                       ...accounts(r).flatMap(x=>[x.bancoNome,x.bancoCodigo,x.agencia,x.conta])].join(" ")).includes(q)));
    s.page=1;render();
  }
  function csv(v){
    let value=String(v==null?"":v);
    if(/^[=+\-@\t\r]/.test(value))value="'"+value;
    return '"'+value.replace(/"/g,'""')+'"';
  }
  function exportRows(){
    if(!s.list.length)return;
    const h=["Ano","Emenda","Autor","Tipo","Destinatário","Favorecido","CNPJ","Município",
             "Valor recebido (R$)","Código banco","Banco","Agência","Conta corrente",
             "Status","Fonte bancária","Comprovação de depósito"];
    const data=s.list.map(r=>{
      const found=accounts(r);
      const item=found[0];
      return [r.ano,r.codigo,r.autor,r.tipo,r.categoria,r.favorecido,r.cnpj,r.municipio,
        r.valorRecebidoCentavos==null?"":(r.valorRecebidoCentavos/100).toFixed(2).replace(".",","),
        found.map(x=>x.bancoCodigo).join(" | "),found.map(x=>x.bancoNome).join(" | "),
        found.map(x=>formatted(x.agencia,x.agenciaDigito)).join(" | "),
        found.map(x=>formatted(x.conta,x.contaDigito)).join(" | "),
        found.length?"Vinculada ao plano (crédito não comprovado)":"Não identificada",
        found.map(x=>x.fonteURL).join(" | "),"Não verificada"];
    });
    const text="\ufeff"+[h,...data].map(x=>x.map(csv).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="emendas-contas-cgu-sbc.csv";
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  async function loadBanks(){
    try{
      const response=await fetch("./dados-contas.json?ts="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const data=await response.json();
      if(data.status!=="ok"||!Array.isArray(data.registros))throw new Error("Arquivo de contas ainda não validado");
      const bankMap=new Map();
      for(const item of data.registros){
        if(!/^\d{12}$/.test(String(item.codigo||""))||!/^\d{14}$/.test(String(item.cnpj||"")))continue;
        if(!item.conta||!item.agencia||!item.bancoCodigo||!isOfficialLink(item.fonteURL))continue;
        const k=key(item),array=bankMap.get(k)||[];
        if(!array.some(x=>x.idPlanoAcao===item.idPlanoAcao))array.push(item);
        bankMap.set(k,array);
      }
      s.banks=bankMap;s.bankLoaded=true;
      const dt=new Date(data.atualizadoEmUTC);
      $("bankUpdated").textContent="Contas vinculadas: "+int.format(data.registros.length)+" · "+(Number.isNaN(dt.getTime())?"atualização não informada":dt.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}));
    }catch(e){
      $("bankUpdated").textContent="Contas bancárias ainda não disponíveis";
    }finally{
      if(s.loaded)apply();
    }
  }
  async function load(){
    try{
      const response=await fetch("./dados-cgu.json?ts="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const data=await response.json();
      if(data.status!=="ok"||!Array.isArray(data.registros)||!data.registros.length){
        notice("Aguardando base válida da CGU.","warn");return;
      }
      s.rows=data.registros;s.loaded=true;
      const years=[...new Set(s.rows.map(r=>r.ano))].sort((a,b)=>b-a);
      for(const year of years){
        const opt=document.createElement("option");opt.value=year;opt.textContent=year;$("cguYear").append(opt);
      }
      const date=new Date(data.capturadoEmUTC);
      $("cguUpdated").textContent="CGU: "+(Number.isNaN(date.getTime())?"data não informada":date.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}));
      notice("Base CGU carregada: "+int.format(s.rows.length)+" registros. Contas bancárias têm comprovação cadastral separada.","ok");
      apply();
      await loadBanks();
    }catch(e){
      notice("Falha ao carregar a base CGU ("+e.message+"). Tente atualizar a página.","error");
      $("cguUpdated").textContent="Falha ao carregar";
      render();
    }
  }
  for(const id of ["cguCategory","cguYear","cguType","cguBankFilter","cguSearch"])$(id).addEventListener("input",apply);
  $("cguPrev").addEventListener("click",()=>{s.page--;render();});
  $("cguNext").addEventListener("click",()=>{s.page++;render();});
  $("cguExport").addEventListener("click",exportRows);
  $("cguClear").addEventListener("click",()=>{
    $("cguCategory").value="municipio";$("cguYear").value="";$("cguType").value="";
    $("cguBankFilter").value="";$("cguSearch").value="";apply();
  });
  load();
})();
