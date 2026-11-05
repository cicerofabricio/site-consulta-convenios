#!/usr/bin/env python3
"""Inspecionar estrutura do ZIP oficial estadual, sem imprimir dados bancários."""
import csv, io, json, os, re, tempfile, unicodedata, urllib.request, zipfile
URL="https://www.transparencia.sp.gov.br/Dados%20Abertos/Emendas/emendas.zip"
def norm(s):
 s=unicodedata.normalize("NFKD",str(s or ""))
 return re.sub("[^A-Z0-9]+","_", "".join(x for x in s if not unicodedata.combining(x)).upper()).strip("_")
def read():
 req=urllib.request.Request(URL,headers={"User-Agent":"Mozilla/5.0 (compatible; transparenciasbc/1.0)","Accept":"application/zip,*/*"})
 with urllib.request.urlopen(req,timeout=120) as r:
  print("URL",r.geturl(),"HTTP",r.status,"CONTENT_TYPE",r.headers.get("Content-Type"),"CONTENT_LENGTH",r.headers.get("Content-Length"),flush=True)
  fd,name=tempfile.mkstemp(suffix=".zip")
  try:
   with os.fdopen(fd,"wb") as f:
    size=0
    while True:
     block=r.read(2*1024*1024)
     if not block:break
     size+=len(block)
     if size>160*1024*1024:raise ValueError("Tamanho > 160 MiB")
     f.write(block)
   print("BYTES",size,flush=True)
   return name
  except BaseException:
   os.unlink(name);raise
p=read()
try:
 with zipfile.ZipFile(p) as z:
  print("ZIP_CONTENT",[(x.filename,x.file_size,x.compress_size) for x in z.infolist()][:30],flush=True)
  for name in z.namelist():
   if not name.lower().endswith(".csv"):continue
   with z.open(name) as f:
    raw=f.read()
   enc="utf-8-sig"
   try:txt=raw.decode(enc)
   except UnicodeDecodeError:enc="latin-1";txt=raw.decode(enc)
   lines=txt.splitlines()
   print("CSV",name,"ENCODING",enc,"ROWS",len(lines),"FIRST_BYTES",repr(txt[:210]),flush=True)
   delimiter=max([";",",","\t","|"],key=lambda d:txt.splitlines()[0].count(d))
   reader=csv.DictReader(io.StringIO(txt),delimiter=delimiter)
   headers=reader.fieldnames or []
   print("HEADERS",[(h,norm(h)) for h in headers],flush=True)
   matched={"cnpj_prefeitura":0,"cnpj_fundo":0,"municipio":0}
   samples=[]
   cnpj_keys=[h for h in headers if ("CNPJ" in norm(h) or "DOCUMENTO" in norm(h))]
   city_keys=[h for h in headers if any(k in norm(h) for k in ["MUNICIPIO","LOCALIZACAO","BENEFICIARIO"])]
   for row in reader:
    values=[str(row.get(k) or "") for k in cnpj_keys]
    csv_cnpjs=["".join(re.findall(r"\d",v)) for v in values]
    kind="prefeitura" if "46523239000147" in csv_cnpjs else ("saude" if "13961905000170" in csv_cnpjs else "")
    city=any("SAO_BERNARDO_DO_CAMPO" in norm(row.get(k)) for k in city_keys)
    if kind:matched["cnpj_"+("prefeitura" if kind=="prefeitura" else "fundo")]+=1
    if city:matched["municipio"]+=1
    if (kind or city) and len(samples)<4:
     # Show names and code but do NOT log account/agencia/CPF
     samples.append({k:str(v)[:110] for k,v in row.items() if k and not any(sub in norm(k) for sub in ["BANCO","AGENCIA","CONTA","CPF"])})
   print("COUNTS",matched,"SAMPLES",json.dumps(samples,ensure_ascii=False),flush=True)
finally:
 os.unlink(p)
