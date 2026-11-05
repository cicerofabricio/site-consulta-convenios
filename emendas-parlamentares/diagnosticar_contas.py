#!/usr/bin/env python3
"""Diagnóstico temporário: apenas nomes de campos, sem divulgar dados bancários."""
import json, urllib.request, urllib.error, socket
sources = {
 "especiais_spec": "https://api-publica.transferegov.gestao.gov.br/especiais/openapi.json",
 "especiais_spec_v2": "https://api-publica.transferegov.gestao.gov.br/especiais/docs/openapi.json",
 "especiais_root": "https://api-publica.transferegov.gestao.gov.br/especiais/",
 "especiais_executores": "https://api-publica.transferegov.gestao.gov.br/especiais/executores-especiais?pagina=1&tamanho_da_pagina=1",
 "especiais_executor": "https://api-publica.transferegov.gestao.gov.br/especiais/executor_especial?limit=1",
 "legacy_executor": "https://api.transferegov.gestao.gov.br/transferenciasespeciais/executor_especial?limit=1&order=id_executor.asc&offset=0",
 "legacy_planos": "https://api.transferegov.gestao.gov.br/transferenciasespeciais/plano_acao_especial?limit=1&order=id_plano_acao.asc&offset=0",
 "fns": "https://consultafns.saude.gov.br/",
}
for name,url in sources.items():
 try:
  req=urllib.request.Request(url, headers={"Accept":"application/json","User-Agent":"Mozilla/5.0 (compatible; SBC-Consultas/1.0)"})
  with urllib.request.urlopen(req,timeout=20) as r:
   data=r.read(80000)
   print(name,"STATUS",r.status,"content-type",r.headers.get("content-type"),"final-url",r.geturl(),"first",repr(data[:65]))
  try:
   doc=json.loads(data)
   if isinstance(doc,dict):
    print(name,"DICT_KEYS",list(doc)[:30])
    if isinstance(doc.get("paths"),dict): print(name,"OPENAPI_PATHS",list(doc["paths"])[:100])
    for prop in ["data","items","results","resultado","value"]:
     value=doc.get(prop)
     if isinstance(value,list) and value:
      print(name,"FIRST_RECORD_KEYS",list(value[0])[:60] if isinstance(value[0],dict) else str(type(value[0])))
   elif isinstance(doc,list):
    print(name,"ARRAY_LENGTH",len(doc),"FIRST_RECORD_KEYS",list(doc[0]) if doc and isinstance(doc[0],dict) else [])
  except (ValueError,UnicodeDecodeError): pass
 except Exception as exc:
  print(name,"ERROR",type(exc).__name__,str(exc)[:130])
