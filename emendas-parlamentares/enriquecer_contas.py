#!/usr/bin/env python3
"""Enriquecimento auditável CGU -> dados bancários de planos especiais.

A CGU permanece fonte dos valores recebidos. Os dados de conta provêm da
API pública de planos de ação do Transferegov e NÃO comprovam, sozinhos, crédito.
O vínculo usa obrigatoriamente a igualdade de código da emenda E CNPJ do
beneficiário, verificados via id_beneficiario retornado pela API oficial.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

DIR = Path(__file__).resolve().parent
BASE = "https://api-publica.transferegov.gestao.gov.br/especiais"
CNPJS = {"46523239000147": "prefeitura", "13961905000170": "saude"}
INPUT = DIR / "dados-cgu.json"
OUTPUT = DIR / "dados-contas.json"


def digits(value):
    return re.sub(r"\D", "", str(value or ""))


def value(obj, key):
    v = obj.get(key)
    return str(v).strip() if v is not None else ""


def query(path, params):
    url = BASE + "/" + path + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "EmendasSBC/1.1 (dados publicos)"})
            with urllib.request.urlopen(req, timeout=35) as response:
                doc = json.load(response)
            if not isinstance(doc, dict) or not isinstance(doc.get("data"), list):
                raise ValueError("API devolveu formato inesperado: " + path)
            return doc
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == 2:
                raise RuntimeError("Falha de rede ao consultar " + path) from exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("Falha ao consultar: " + path)


def all_pages(path, params):
    result = []
    for page in range(1, 51):
        doc = query(path, {**params, "pagina": page, "tamanho_da_pagina": 200})
        part = doc["data"]
        result.extend(part)
        pages = int(doc.get("total_pages") or 0)
        if not part or (pages and page >= pages) or (not pages and len(part) < 200):
            return result
    raise RuntimeError("Paginação acima do limite de segurança para " + path)


def main():
    raw = json.loads(INPUT.read_text(encoding="utf-8"))
    if raw.get("status") != "ok" or not raw.get("registros"):
        raise ValueError("Base CGU não validada: enriquecimento interrompido")
    targets = {
        (row.get("codigo"), row.get("cnpj"))
        for row in raw["registros"]
        if row.get("categoria") in {"prefeitura", "saude"}
        and row.get("cnpj") in CNPJS
        and len(digits(row.get("codigo"))) == 12
    }
    matched = defaultdict(dict)
    diagnostics = {}
    for cnpj, category in CNPJS.items():
        groups = all_pages("beneficiarios-especiais", {"cnpj_beneficiario": cnpj})
        ids = sorted({value(x, "id_beneficiario") for x in groups if digits(x.get("cnpj_beneficiario")) == cnpj and value(x, "id_beneficiario")})
        diagnostics[category] = {"cadastros_validos": len(ids), "planos_examinados": 0, "contas_vinculadas": 0}
        for idb in ids:
            plans = all_pages("planos-acao-especiais", {"id_beneficiario": idb})
            for item in plans:
                if value(item, "id_beneficiario") != idb:
                    continue
                diagnostics[category]["planos_examinados"] += 1
                code = digits(item.get("numero_emenda_parlamentar_plano_acao"))
                key = (code, cnpj)
                if key not in targets:
                    continue
                bank = value(item, "codigo_banco_plano_acao")
                agency = value(item, "numero_agencia_plano_acao")
                account = value(item, "numero_conta_plano_acao")
                if not all((bank, agency, account)):
                    continue
                plan_id = value(item, "id_plano_acao")
                if not plan_id.isdigit():
                    continue
                if bank.isdigit() and len(bank) < 3:
                    bank = bank.zfill(3)
                entry = {
                    "codigo": code,
                    "cnpj": cnpj,
                    "categoria": category,
                    "bancoCodigo": bank,
                    "bancoNome": value(item, "nome_banco_plano_acao"),
                    "agencia": agency,
                    "agenciaDigito": value(item, "dv_agencia_plano_acao"),
                    "conta": account,
                    "contaDigito": value(item, "dv_conta_plano_acao"),
                    "situacaoBancaria": value(item, "descricao_situacao_dado_bancario_plano_acao"),
                    "idPlanoAcao": plan_id,
                    "tipoVinculo": "conta_vinculada_plano_acao",
                    "comprovacaoDeposito": False,
                    "fonte": "API pública de Transferências Especiais - plano de ação",
                    "fonteURL": BASE + "/planos-acao-especiais?id_plano_acao=" + plan_id,
                }
                account_key = "|".join([bank,agency,entry["agenciaDigito"],account,entry["contaDigito"]])
                matched[key][account_key] = entry
        diagnostics[category]["contas_vinculadas"] = sum(len(v) for (code,c),v in matched.items() if c == cnpj)
    entries = [
        account
        for key in sorted(matched)
        for account in sorted(matched[key].values(), key=lambda e:(e["idPlanoAcao"],e["conta"]))
    ]
    # A API confirmou 9 planos na Prefeitura em 05/11/2026.
    # Se a coleta passar a retornar zero inesperadamente, preservar base já publicada.
    if not entries:
        raise RuntimeError("Nenhuma conta pôde ser vinculada à CGU; arquivo anterior preservado")
    payload = {
        "status": "ok",
        "atualizadoEmUTC": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": "Transferegov - API pública de planos de ação (enriquecimento, não valores CGU)",
        "interpretacao": "Conta vinculada ao plano de ação: dado bancário cadastral, não prova de que o valor CGU foi efetivamente creditado nessa conta.",
        "metodoVinculacao": "Código de emenda de 12 dígitos + CNPJ do beneficiário validado na API",
        "estatisticas": diagnostics,
        "registros": entries,
    }
    temp = OUTPUT.with_suffix(".json.tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(OUTPUT)
    print("Contas vinculadas a emendas CGU:", len(entries))
    print("Diagnóstico sem números bancários:", diagnostics)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("ERRO: banco não atualizado; CGU permanece intacta. " + str(exc), file=sys.stderr)
        sys.exit(1)
