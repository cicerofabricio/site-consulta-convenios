#!/usr/bin/env python3
"""Diagnóstico de links oficiais de painéis estaduais; não coleta números de conta."""
import urllib.request, urllib.error, re, html, json
pages=[
"https://www.transparencia.sp.gov.br/EmendasParlamentares/Paineis",
"https://www.governo.sp.gov.br/sec_governo_relacoes/painel/impositivas_2026",
"https://www.governo.sp.gov.br/sec_governo_relacoes/painel/impositivas_2025",
"https://www.governo.sp.gov.br/sec_governo_relacoes/painel/voluntarias_estaduais_2026",
"https://www.governo.sp.gov.br/sec_governo_relacoes/painel/voluntarias_estaduais_2025"]
for url in pages:
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/132.0 Safari/537.36","Accept":"text/html,application/xhtml+xml,*/*"})
  with urllib.request.urlopen(req,timeout=28) as response:
   text=response.read(1_500_000).decode("utf-8","replace")
   print("PAGE",url,"STATUS",response.status,"SIZE",len(text),"END_URL",response.geturl())
   for kind,rx in [("IFRAME",r'<iframe[^>]+(?:src|data-src)\s*=\s*["\x27]([^"\x27]+)'),("LINK",r'<a[^>]+href\s*=\s*["\x27]([^"\x27]+)'),("URL",r'https?[^" \x27<>]+(?:powerbi|app\.powerbi|looker|painel|download|excel|xlsx)[^" \x27<>]*'),("API",r'(?:\b|/)(?:api|PowerBI|embed|arquivo|download|painel)\b')]:
    items=list(dict.fromkeys(html.unescape(x) for x in re.findall(rx,text,re.I)))
    print("FOUND",kind,len(items))
    for s in items[:45]:print(kind,s[:250])
   for token in ["Painel - Link","Power BI","powerbi","iframe","dashboard","caderno","Conta Corrente","Agência","CNPJ","export","Relatório"]:
    matches=list(re.finditer(re.escape(token),text,re.I))
    print("TOKEN",token,len(matches))
    for m in matches[:3]:print("NEAR",re.sub(r"\s+"," ",text[max(0,m.start()-175):m.end()+230])[:420])
 except Exception as exc:print("ERROR",url,type(exc).__name__,str(exc)[:180])
