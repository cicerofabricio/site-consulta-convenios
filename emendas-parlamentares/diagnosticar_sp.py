#!/usr/bin/env python3
"""Verifica vínculo emendas estaduais -> CNPJ via base oficial de convênios."""
import csv,io,re,urllib.request,zipfile,collections,unicodedata,decimal
ROOT="https://www.transparencia.sp.gov.br"
def fetch(url):
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; consulta-sbc/1.0)"})
 with urllib.request.urlopen(req,timeout=90) as r:
  data=r.read(120*1024*1024)
  print("SOURCE",url,"HTTP",r.status,"BYTES",len(data),flush=True)
  return data
def csv_zipped(url):
 with zipfile.ZipFile(io.BytesIO(fetch(url))) as z:
  print("ZIP",[(x.filename,x.file_size) for x in z.infolist()],flush=True)
  csvname=next((s for s in z.namelist() if s.lower().endswith(".csv")),None)
  if not csvname:raise ValueError("No CSV")
  raw=z.read(csvname)
  try:txt=raw.decode("utf-8-sig")
  except UnicodeDecodeError:txt=raw.decode("latin-1")
  header=txt.splitlines()[0]
  sep=max(";,\t|",key=header.count)
  reader=csv.DictReader(io.StringIO(txt),delimiter=sep)
  print("HEADERS",reader.fieldnames,"ROWS",len(txt.splitlines())-1,flush=True)
  return list(reader)
def norm(s):
 s=unicodedata.normalize("NFKD",str(s or ""))
 return re.sub(r"\s+"," ","".join(ch for ch in s if not unicodedata.combining(ch)).upper()).strip()
def dig(s):return re.sub(r"\D","",str(s or ""))
def main():
 em=csv_zipped(ROOT+"/Dados%20Abertos/Emendas/emendas.zip")
 cov=csv_zipped(ROOT+"/Dados%20Abertos/Convenios/convenio.zip")
 # identify columns by header
 hs=list(cov[0]) if cov else []
 print("CONVENIOS_TOP3",[{k:v for k,v in r.items() if not any(w in norm(k) for w in ["CPF","EMAIL","TELEFONE","ENDERECO","CONTA","AGENCIA"])} for r in cov[:3]],flush=True)
 print("ALL_COLUMN_NAMES",hs,flush=True)
 instrument_keys=[k for k in hs if any(w in norm(k) for w in ["CONVENIO","INSTRUMENTO","NUMERO"])]
 cnpj_keys=[k for k in hs if "CNPJ" in norm(k)]
 print("INSTRUMENT_KEYS",instrument_keys,"CNPJ_KEYS",cnpj_keys,flush=True)
 city=[r for r in em if norm(r.get("municipio_gasto"))=="SAO BERNARDO DO CAMPO"]
 wanted={dig(r.get("num_instrumento_juridico")) for r in city if dig(r.get("num_instrumento_juridico"))}
 index=collections.defaultdict(list)
 for c in cov:
  for k in instrument_keys:
   n=dig(c.get(k))
   if n and n in wanted:index[n].append(c)
 linked=0;cnpjs=collections.Counter()
 for row in city:
  n=dig(row.get("num_instrumento_juridico"))
  matches=index.get(n,[])
  if matches:
   linked+=1
   for m in matches:
    for k in cnpj_keys:
     cnpj=dig(m.get(k))
     if len(cnpj)==14:cnpjs[cnpj]+=1
 print("CITY_TOTAL",len(city),"INSTRUMENTOS",len(wanted),"LINKED_ROWS",linked,"JOIN_CNPJS",cnpjs.most_common(15),flush=True)
 for row in city[:6]:
  n=dig(row.get("num_instrumento_juridico")); matches=index.get(n,[])
  print("SAMPLE_JOIN",{"codigo":row.get("cod_emenda"),"numero":n,"beneficiario":row.get("nome_beneficiario"),
      "convenios_encontrados":len(matches),"cnpjs":[{k:v for k,v in m.items() if "CNPJ" in norm(k)} for m in matches[:2]]})
if __name__=="__main__":main()
