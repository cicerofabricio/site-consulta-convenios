#!/usr/bin/env python3
"""Consolidação diária das emendas federais para São Bernardo do Campo (CGU)."""
import csv,io,json,os,re,sys,tempfile,unicodedata,urllib.request,zipfile
from collections import defaultdict
from datetime import datetime,timezone
from decimal import Decimal
from pathlib import Path
DIR=Path(__file__).resolve().parent
URLS=["https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO","https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip"]
CNPJS={"46523239000147":"prefeitura","13961905000170":"saude"}
def norm(x):
    s=unicodedata.normalize("NFKD",str(x or ""))
    return re.sub("[^A-Z0-9]+","_","".join(c for c in s if not unicodedata.combining(c)).upper()).strip("_")
def dig(x):return re.sub(r"\D","",str(x or ""))
def val(row,*names):
    for n in names:
        v=row.get(norm(n),"").strip()
        if v:return v
    return ""
def cent(x):
    x=str(x or "").strip().replace("R$","").replace(" ","")
    if not x:return 0
    if "," in x:x=x.replace(".","").replace(",",".")
    return int(Decimal(x).quantize(Decimal("0.01"))*100)
def csvrows(z,name):
    files=[x for x in z.namelist() if x.lower().endswith(name.lower())]
    if len(files)!=1:raise ValueError("CSV não encontrado ou ambíguo: "+name)
    with z.open(files[0]) as f:
        r=csv.DictReader(io.TextIOWrapper(f,encoding="latin-1",newline=""),delimiter=";")
        if "CODIGO_DA_EMENDA" not in {norm(h) for h in r.fieldnames or []}:
            raise ValueError("Cabeçalho inesperado em "+name)
        for row in r:
            yield {norm(k):str(v or "").strip() for k,v in row.items() if k is not None}
def getzip():
    local=os.getenv("CGU_ZIP_PATH")
    if local:return Path(local),False
    errors=[]
    for url in URLS:
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"EmendasSBC/1.0","Accept":"application/zip"})
            with urllib.request.urlopen(req,timeout=150) as resp:
                fd,p=tempfile.mkstemp(suffix=".zip")
                try:
                    with os.fdopen(fd,"wb") as output:
                        size=0
                        while True:
                            part=resp.read(1024*1024)
                            if not part:break
                            size+=len(part)
                            if size>160*1024*1024:raise ValueError("ZIP acima do limite")
                            output.write(part)
                    if not zipfile.is_zipfile(p):raise ValueError("Resposta não é ZIP")
                    return Path(p),True
                except BaseException:
                    Path(p).unlink(missing_ok=True)
                    raise
        except Exception as e:errors.append(str(e))
    raise RuntimeError("Download da CGU falhou: "+" | ".join(errors))
def run(z):
    paid={}
    checked=0
    for r in csvrows(z,"EmendasParlamentares_PorFavorecido.csv"):
        code=dig(val(r,"Código da Emenda"))
        if len(code)!=12:continue
        cnpj=dig(val(r,"Código do Favorecido"))
        target=cnpj in CNPJS
        city=norm(val(r,"Município Favorecido"))=="SAO_BERNARDO_DO_CAMPO"
        uf=norm(val(r,"UF Favorecido")) in ("","SP","SAO_PAULO")
        if not target and not (len(cnpj)==14 and city and uf):continue
        key=(code,cnpj)
        if key not in paid:
            paid[key]={"codigo":code,"ano":int(code[:4]),"autor":val(r,"Nome do Autor da Emenda"),
                       "tipo":val(r,"Tipo de Emenda"),"categoria":CNPJS.get(cnpj,"terceiro"),
                       "favorecido":val(r,"Favorecido"),"cnpj":cnpj,"municipio":val(r,"Município Favorecido"),
                       "valorRecebidoCentavos":0,"competencias":set(),"convenios":set(),"origem":"CGU - Por Favorecido"}
        item=paid[key]
        item["valorRecebidoCentavos"]+=cent(val(r,"Valor Recebido"))
        month=val(r,"Ano/Mês")
        if month:item["competencias"].add(month)
        checked+=1
    bycode=defaultdict(list)
    for (code,_),item in paid.items():bycode[code].append(item)
    locale={}
    for r in csvrows(z,"EmendasParlamentares.csv"):
        code=dig(val(r,"Código da Emenda"))
        if len(code)!=12:continue
        if code in bycode:
            for item in bycode[code]:
                item["autor"]=item["autor"] or val(r,"Nome do Autor da Emenda")
                item["tipo"]=item["tipo"] or val(r,"Tipo da Emenda","Tipo de Emenda")
            continue
        ibge=dig(val(r,"Código Município IBGE"))
        city=norm(val(r,"Município"))=="SAO_BERNARDO_DO_CAMPO"
        uf=norm(val(r,"UF")) in ("","SP","SAO_PAULO")
        if ibge!="3548708" and not (city and uf):continue
        if code not in locale:
            locale[code]={"codigo":code,"ano":int(code[:4]),"autor":val(r,"Nome do Autor da Emenda"),
                          "tipo":val(r,"Tipo da Emenda","Tipo de Emenda"),"categoria":"localidade",
                          "favorecido":None,"cnpj":None,"municipio":"São Bernardo do Campo",
                          "valorRecebidoCentavos":None,"competencias":set(),"convenios":set(),
                          "origem":"CGU - Localidade do Gasto"}
    if not paid and not locale:raise RuntimeError("Nenhum registro local: arquivo anterior preservado")
    for r in csvrows(z,"EmendasParlamentares_Convenios.csv"):
        code=dig(val(r,"Código da Emenda"))
        num=val(r,"Número Convênio")
        if num:
            if code in locale:locale[code]["convenios"].add(num)
            for item in bycode.get(code,[]):item["convenios"].add(num)
    records=list(paid.values())+list(locale.values())
    for item in records:
        item["competencias"]=sorted(item["competencias"])
        item["convenios"]=sorted(item["convenios"])[:30]
    records.sort(key=lambda r:(r["ano"],r["codigo"],r["categoria"],r["cnpj"] or ""),reverse=True)
    return {"status":"ok","capturadoEmUTC":datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "fonte":"CGU - Portal da Transparência","fonteURL":URLS[0],
            "municipio":"São Bernardo do Campo","codigoIBGE":"3548708",
            "estatisticas":{"linhas_favorecidos":checked,"por_favorecido":len(paid),"so_localidade":len(locale)},
            "nota":"Valor recebido conforme arquivo Por Favorecido. Localidade de aplicação não comprova transferência à Prefeitura.",
            "registros":records}
def main():
    path,remove=getzip()
    try:
        with zipfile.ZipFile(path) as z:payload=run(z)
        out=DIR/"dados-cgu.json"
        tmp=DIR/"dados-cgu.json.tmp"
        tmp.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
        tmp.replace(out)
        print("CGU: registros",len(payload["registros"]),"estatísticas",payload["estatisticas"])
    finally:
        if remove:path.unlink(missing_ok=True)
if __name__=="__main__":
    try:main()
    except Exception as error:
        print("Falha na coleta (mantida base anterior):",error,file=sys.stderr)
        sys.exit(1)
