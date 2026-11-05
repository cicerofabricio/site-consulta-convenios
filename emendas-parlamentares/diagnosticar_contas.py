#!/usr/bin/env python3
"""Diagnóstico do relacionamento plano de ação <> favorecido, sem revelar agência/conta."""
import json,urllib.request
BASE="https://api-publica.transferegov.gestao.gov.br/especiais"
def get(path):
 req=urllib.request.Request(BASE+path,headers={"Accept":"application/json","User-Agent":"EmendasSBC/1.0"})
 with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
for cnpj in ["46523239000147","13961905000170"]:
 try:
  url="/beneficiarios-especiais?cnpj_beneficiario="+cnpj+"&pagina=1&tamanho_da_pagina=100"
  response=get(url); data=response.get("data",[])
  print("BENEFICIARIO",cnpj,"TOTAL",response.get("total_items"),"KEYS",list(data[0]) if data else [])
  for rec in data:
   print("BENEFICIARIO_ROW",{"id_beneficiario":rec.get("id_beneficiario"),"cnpj_beneficiario":rec.get("cnpj_beneficiario"),"nome_beneficiario":rec.get("nome_beneficiario")})
   if str(rec.get("cnpj_beneficiario"))!=cnpj:continue
   idb=rec.get("id_beneficiario")
   url2="/planos-acao-especiais?id_beneficiario="+str(idb)+"&pagina=1&tamanho_da_pagina=100"
   plans=get(url2)
   print("PLANOS",idb,"TOTAL",plans.get("total_items"),"ITEM_KEYS",list(plans.get("data",[{}])[0]))
   for item in plans.get("data",[])[:12]:
    print("PLANO_ROW",{"id_plano_acao":item.get("id_plano_acao"),"id_beneficiario":item.get("id_beneficiario"),
      "codigo":item.get("numero_emenda_parlamentar_plano_acao"),"numero_formatado":item.get("codigo_emenda_parlamentar_formatado_plano_acao"),
      "ano":item.get("ano_plano_acao"),"agencia_sim":bool(item.get("numero_agencia_plano_acao")),
      "conta_sim":bool(item.get("numero_conta_plano_acao")),
      "banco_sim":bool(item.get("codigo_banco_plano_acao")),
      "sit_bancario":item.get("codigo_situacao_dado_bancario_plano_acao")})
 except Exception as e:print("ERROR",cnpj,type(e).__name__,str(e))
# Verifica consulta pontual de plano por id
for idp in [74541,36758]:
 try:
  r=get("/planos-acao-especiais?id_plano_acao="+str(idp))
  print("ID_PLAN",idp,"TOTAL",r.get("total_items"),"FIELDS",[
    {"id_plano_acao":x.get("id_plano_acao"),"numero_emenda":x.get("numero_emenda_parlamentar_plano_acao"),
    "id_beneficiario":x.get("id_beneficiario"),"conta_sim":bool(x.get("numero_conta_plano_acao"))} for x in r.get("data",[])[:2]])
 except Exception as e:print("ERROR ID",idp,str(e)[:120])
