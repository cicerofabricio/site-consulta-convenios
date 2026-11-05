#!/usr/bin/env python3
"""Validar dados e valores do ZIP estadual, investigar CNPJ em convênios."""
import csv,io,collections,os,re,tempfile,urllib.request,urllib.parse,zipfile,unicodedata
from decimal import Decimal
ROOT="https://www.transparencia.sp.gov.br"
def get(url):
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/128.0","Accept":"*/*"})
 with urllib.request.urlopen(req,timeout=90) as r:
  data=r.read(120*1024*1024)
  print("HTTP",r.status,"URL",r.geturl(),"BYTES",len(data))
  return data
def norm(s):
 s=unicodedata.normalize("NFKD",str(s or ""))
 return re.sub(r"\s+"," ","".join(ch for ch in s if not unicodedata.combining(ch)).upper()).strip()
def decode(data):
 for en in ["utf-8-sig","latin-1"]:
  try:return data.decode(en)
  except UnicodeDecodeError:pass
 return data.decode("utf-8","replace")
data=get(ROOT+"/Dados%20Abertos/Emendas/emendas.zip")
with zipfile.ZipFile(io.BytesIO(data)) as z:
 name=next(x for x in z.namelist() if x.endswith(".csv"))
 reader=csv.DictReader(io.StringIO(decode(z.read(name))),delimiter=";")
 categories=collections.Counter();types=collections.Counter(); years=collections.Counter()
 beneficiaries=collections.Counter(); beneficiary_outside=collections.Counter()
 city_rows=[]; pref_rows=[]; health_rows=[]
 for r in reader:
  city="SAO BERNARDO DO CAMPO" in norm(r.get("municipio_gasto"))
  ben=norm(r.get("nome_beneficiario"))
  if "SAO BERNARDO" in ben:beneficiary_outside[(ben,r.get("municipio_gasto"))]+=1
  if not city:continue
  city_rows.append(r)
  years[r.get("cod_emenda","")[:4]]+=1
  categories[r.get("origem_recurso")]+=1;types[r.get("tipo_emenda")]+=1
  beneficiaries[ben]+=1
  if "PREFEITURA" in ben or "MUNICIPIO DE SAO BERNARDO" in ben or "MUNICIPIO DA ESTANCIA" in ben:
   pref_rows.append(r)
  if "FUNDO" in ben or ("SECRETARIA" in ben and "SAUDE" in ben):health_rows.append(r)
 print("CITY_RECORDS",len(city_rows))
 print("YEARS",years.most_common(25))
 print("ORIGEM",categories.most_common(30))
 print("TIPOS",types.most_common(20))
 print("BENEFICIARIOS",beneficiaries.most_common(90))
 print("BENEFICIARY_SBC_WITH_LOCATION",beneficiary_outside.most_common(30))
 print("PREF_EXAMPLES",pref_rows[:8])
 print("HEALTH_EXAMPLES",health_rows[:8])
 for metric in ["vl_empenhado","vl_liquidado","vl_pago"]:
  vals=[Decimal(r.get(metric) or "0") for r in city_rows]
  print("MONEY",metric,"NET_RAW",sum(vals),"GROSS_POS_RAW",sum((x for x in vals if x>0),Decimal(0)),"NEG_N",sum(1 for x in vals if x<0),"MAX",max(vals))
for path in ["/EmendasParlamentares/Concedidas","/Convenios/Index"]:
 page=decode(get(ROOT+path))
 print("PAGE_PATH",path)
 for m in list(re.finditer(r"(format|Moeda|valorPago|vlPago|vl_pago|EmendasParlamentares/Buscar|Convenios/|Dados Abertos|href=\"[^\"]+\.zip)",page,re.I))[-35:]:
  print("HTML",re.sub(r"\s+"," ",page[max(0,m.start()-150):m.end()+220])[:350])
 print("ZIP_URLS",re.findall(r'href="([^"]+\.zip)"',page,re.I))
