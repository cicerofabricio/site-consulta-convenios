#!/usr/bin/env python3
"""Inspeciona esquema da API, só imprime metadados e identificadores não bancários."""
import json,urllib.request
BASE="https://api-publica.transferegov.gestao.gov.br/especiais"
def get(path):
 req=urllib.request.Request(BASE+path,headers={"Accept":"application/json","User-Agent":"EmendasSBC/1.0"})
 with urllib.request.urlopen(req,timeout=30) as resp:return json.loads(resp.read())
doc=get("/openapi.json")
print("PATHS")
for path in doc.get("paths",{}):
 if any(x in path.lower() for x in ["executor","plano","emenda","beneficiar","banco","pagamento"]):
  print(path)
  obj=doc["paths"][path]
  if "get" in obj:
   print("PARAMS",[(p.get("name"),p.get("in"),str(p.get("schema",{}).get("type")),str(p.get("schema",{}).get("default"))) for p in obj["get"].get("parameters",[])])
for path in [
 "/planos-acao-especiais?cnpj_beneficiario_plano_acao=46523239000147&pagina=1&tamanho_da_pagina=2",
 "/planos-acao-especiais?cnpj_beneficiario=46523239000147&pagina=1&tamanho_da_pagina=2",
 "/executores-especiais?cnpj_executor=46523239000147&pagina=1&tamanho_da_pagina=2",
 "/executores-especiais?cnpj_executor=13961905000170&pagina=1&tamanho_da_pagina=2",
 ]:
 try:
  data=get(path)
  print("QUERY",path,"TOTAL",data.get("total_items"),"PAGES",data.get("total_pages"))
  for item in data.get("data",[])[:2]:
   print("RECORD",{"id_plano_acao":item.get("id_plano_acao"),
     "cnpj_executor":item.get("cnpj_executor"),
     "cnpj_beneficiario_plano_acao":item.get("cnpj_beneficiario_plano_acao"),
     "ano_plano_acao":item.get("ano_plano_acao"),
     "numero_emenda_parlamentar_plano_acao":item.get("numero_emenda_parlamentar_plano_acao"),
     "codigo_emenda_parlamentar_formatado_plano_acao":item.get("codigo_emenda_parlamentar_formatado_plano_acao"),
     "sequencial_emenda_parlamentar_plano_acao":item.get("sequencial_emenda_parlamentar_plano_acao"),
     "codigo_plano_acao":item.get("codigo_plano_acao"),
     "banco_preenchido":bool(item.get("codigo_banco_executor") or item.get("codigo_banco_plano_acao")),
     "agencia_preenchida":bool(item.get("numero_agencia_executor") or item.get("numero_agencia_plano_acao")),
     "conta_preenchida":bool(item.get("numero_conta_executor") or item.get("numero_conta_plano_acao"))})
 except Exception as e:print("ERROR",path,type(e).__name__,str(e)[:120])
