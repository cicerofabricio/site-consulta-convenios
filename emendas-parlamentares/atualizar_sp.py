#!/usr/bin/env python3
"""Coleta oficial de emendas estaduais da transparência de São Paulo.
CSV de movimentos financeiros; montantes no arquivo estão expressos em centavos.
Não existe CNPJ nem conta bancária no CSV publicado pelo Estado.
"""
import csv, io, json, re, sys, tempfile, unicodedata, urllib.request, zipfile
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

DIR = Path(__file__).resolve().parent
DEST = DIR / "dados-sp.json"
SOURCE = "https://www.transparencia.sp.gov.br/Dados%20Abertos/Emendas/emendas.zip"
PORTAL = "https://www.transparencia.sp.gov.br/EmendasParlamentares/Concedidas"
TARGET = "SAO BERNARDO DO CAMPO"
HEADERS = {
    "orgao_executor", "origem_recurso", "cod_emenda", "nome_parlamentar",
    "partido", "num_instrumento_juridico", "nome_beneficiario", "objeto",
    "tipo_emenda", "nome_funcao", "municipio_gasto", "vl_empenhado",
    "vl_liquidado", "vl_pago"
}

def normalize(value):
    v = unicodedata.normalize("NFKD", str(value or ""))
    return re.sub(r"\s+", " ", "".join(c for c in v if not unicodedata.combining(c)).upper()).strip()

def category(beneficiary):
    name = normalize(beneficiary)
    if name in {"PREFEITURA MUNICIPAL DE SAO BERNARDO DO CAMPO",
                "MUNICIPIO DE SAO BERNARDO DO CAMPO"}:
        return "prefeitura"
    if "FUNDO MUNICIPAL DE SAUDE" in name and "SAO BERNARDO" in name:
        return "saude"
    return "outro"

def amount_in_cents(raw):
    """A fonte entrega centavos como 198806000.00, NÃO valores em reais.
    Ex.: emenda 2024.018.58123 = R$ 1.988.060,00 na Alesp."""
    s = str(raw or "").strip()
    if not s:
        return None
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        v = Decimal(s)
        if not v.is_finite() or v != v.to_integral_value():
            raise ValueError("Quantidade fracionária de centavos")
        return int(v)
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Montante inesperado: " + repr(raw)) from exc

def self_test():
    assert amount_in_cents("198806000.00") == 198806000
    assert amount_in_cents("-1100000.00") == -1100000
    assert amount_in_cents("") is None
    assert normalize("São Bernardo do Campo") == TARGET
    assert category("PREFEITURA MUNICIPAL DE SAO BERNARDO DO CAMPO") == "prefeitura"
    assert category("IRMANDADE DA SANTA CASA DE SAO BERNARDO DO CAMPO") == "outro"
    print("Testes básicos de moeda e beneficiário: OK")

def fetch():
    request = urllib.request.Request(SOURCE, headers={
        "User-Agent": "ConsultaEmendasSBC/1.0 (dados publicos)",
        "Accept": "application/zip,application/octet-stream"
    })
    with urllib.request.urlopen(request, timeout=120) as response:
        data = response.read(32 * 1024 * 1024 + 1)
        if len(data) > 32 * 1024 * 1024:
            raise ValueError("ZIP excedeu o limite de tamanho")
        if not zipfile.is_zipfile(io.BytesIO(data)):
            raise ValueError("Portal SP não retornou ZIP válido")
        return data

def process(archive):
    groups = {}
    scanned = 0
    target_rows = 0
    by_origin = {}
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        files = [x for x in z.infolist() if x.filename.lower().endswith("emenda.csv")]
        if len(files) != 1 or files[0].file_size > 95 * 1024 * 1024:
            raise ValueError("Arquivo emenda.csv ausente, duplicado ou maior que o esperado")
        with z.open(files[0]) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig", newline=""), delimiter=";")
            if not reader.fieldnames or not HEADERS.issubset(set(reader.fieldnames)):
                raise ValueError("Cabeçalho estadual mudou; atualização bloqueada: " + repr(reader.fieldnames))
            for r in reader:
                scanned += 1
                if normalize(r.get("municipio_gasto")) != TARGET:
                    continue
                target_rows += 1
                code = str(r.get("cod_emenda") or "").strip()
                ben = str(r.get("nome_beneficiario") or "").strip()
                instrument = str(r.get("num_instrumento_juridico") or "").strip()
                obj = str(r.get("objeto") or "").strip()
                orgao = str(r.get("orgao_executor") or "").strip()
                origin = str(r.get("origem_recurso") or "").strip()
                parlamentar = str(r.get("nome_parlamentar") or "").strip()
                key = (code, normalize(ben), instrument, normalize(obj), normalize(orgao), normalize(origin), normalize(parlamentar))
                by_origin[origin] = by_origin.get(origin, 0) + 1
                if key not in groups:
                    year = int(code[:4]) if re.match(r"^20\d\d[.\-/]", code) else None
                    groups[key] = {
                        "codigo": code, "ano": year,
                        "parlamentar": parlamentar, "partido": str(r.get("partido") or "").strip(),
                        "beneficiario": ben, "categoria": category(ben), "cnpj": None,
                        "objeto": obj, "instrumento": instrument, "orgaoExecutor": orgao,
                        "origemRecurso": origin,
                        "tipo": str(r.get("tipo_emenda") or "").strip(),
                        "funcao": str(r.get("nome_funcao") or "").strip(),
                        "municipioGasto": "São Bernardo do Campo",
                        "empenhadoCentavos": None, "liquidadoCentavos": None, "pagoCentavos": None,
                        "lancamentos": 0, "banco": None, "agencia": None, "conta": None,
                        "vinculoBancario": "Não identificado na fonte estadual",
                        "fonteURL": PORTAL
                    }
                entry = groups[key]
                entry["lancamentos"] += 1
                for input_key, output_key in (
                    ("vl_empenhado", "empenhadoCentavos"),
                    ("vl_liquidado", "liquidadoCentavos"),
                    ("vl_pago", "pagoCentavos")
                ):
                    delta = amount_in_cents(r.get(input_key))
                    if delta is not None:
                        entry[output_key] = (entry[output_key] or 0) + delta
    if scanned < 100 or target_rows < 1 or not groups:
        raise RuntimeError("Volume inesperado ou nenhum dado para SBC; arquivo antigo preservado")
    items = list(groups.values())
    items.sort(key=lambda x: (x["ano"] or 0, x["codigo"], x["beneficiario"], x["instrumento"]), reverse=True)
    by_category = {}
    for item in items:
        by_category[item["categoria"]] = by_category.get(item["categoria"], 0) + 1
    return {
        "status": "ok",
        "atualizadoEmUTC": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": "Governo do Estado de São Paulo - Portal da Transparência",
        "fonteURL": PORTAL, "downloadURL": SOURCE,
        "municipio": "São Bernardo do Campo",
        "identificacaoFavorecido": "Nome da entidade no CSV, sem CNPJ",
        "unidadeMonetariaOriginal": "centavos; entradas como 198806000.00 representam R$ 1.988.060,00",
        "observacao": "Valores empenhados, liquidados e pagos pelo Estado; não comprovam crédito em conta específica do Município. Transferências Voluntárias devem ser filtradas separadamente das Emendas LOA.",
        "estatisticas": {
            "linhasFonte": scanned, "lancamentosMunicipio": target_rows,
            "registrosAgrupados": len(items), "porOrigem": by_origin,
            "porCategoria": by_category
        },
        "registros": items
    }

def main():
    self_test()
    if "--self-test" in sys.argv:
        return
    payload = process(fetch())
    path = DEST.with_suffix(".json.tmp")
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    path.replace(DEST)
    print("SP concluído: " + json.dumps(payload["estatisticas"], ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("ERRO: coleta SP não atualizada: " + str(exc), file=sys.stderr)
        sys.exit(1)
