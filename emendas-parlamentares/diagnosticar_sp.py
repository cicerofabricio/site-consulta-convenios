#!/usr/bin/env python3
"""Diagnóstico de rotas públicas do Portal SP (não baixa dados pessoais)."""
import html
import json
import re
import urllib.parse
import urllib.request

ROOT="https://www.transparencia.sp.gov.br"
URL=ROOT+"/EmendasParlamentares/Concedidas"
def fetch(url,max_bytes=1_500_000):
 req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; consulta-emendas-SBC/1.0)","Accept":"text/html,application/javascript,*/*"})
 with urllib.request.urlopen(req,timeout=30) as response:
  return response.status,response.geturl(),response.headers.get("Content-Type",""),response.read(max_bytes)
def clean(s):return html.unescape(str(s)).replace("&amp;","&")
def main():
 try:
  code,url,ctype,raw=fetch(URL)
 except Exception as e:
  print("ERR_PAGE",repr(e));return
 text=raw.decode("utf-8","replace")
 print("PAGE",code,url,ctype,"SIZE",len(raw))
 for rx,name in [(r'<script[^>]+src=["\\x27]([^"\\x27]+)',"SCRIPT"),
                 (r'<a[^>]+href=["\\x27]([^"\\x27]+)',"LINK"),
                 (r'<form[^>]+action=["\\x27]([^"\\x27]+)',"FORM")]:
  arr=[clean(x) for x in re.findall(rx,text,re.I)]
  print(name,"COUNT",len(arr))
  for item in arr[-70:]:print(name,item[:220])
 for term in ["CSV","EmendasParlamentares","DadosAbertos","download","Exportar","dadosAbertos","dataTable","ajax:"]:
  patterns=list(re.finditer(re.escape(term),text,re.I))
  print("HTML_TERM",term,len(patterns))
  for m in patterns[-4:]:print("HTML_NEAR",re.sub(r"\s+"," ",text[max(0,m.start()-160):m.end()+210])[:370])
 scripts=[clean(x) for x in re.findall(r'<script[^>]+src=["\\x27]([^"\\x27]+)',text,re.I)]
 for src in scripts:
  url=urllib.parse.urljoin(ROOT,src)
  if not ("transparencia.sp.gov.br" in urllib.parse.urlparse(url).netloc):continue
  try:
   code,final,ctype,raw=fetch(url,1_300_000)
   js=raw.decode("utf-8","replace")
  except Exception as e:
   print("SCRIPT_ERR",url,str(e)[:150]);continue
  hits=[m for m in re.finditer(r'Emendas|Concedidas|DadosAbertos|Csv|CSV|exportarCSV|ExportarCSV',js,re.I)]
  print("JS",url,"SIZE",len(js),"HITS",len(hits))
  for m in hits[:28]:
   print("JS_NEAR",re.sub(r"\s+"," ",js[max(0,m.start()-150):m.end()+180])[:340])
if __name__=="__main__":main()
