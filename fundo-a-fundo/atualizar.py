"""Coleta planos de ação do município na API pública, sem publicar resultados parciais."""
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://api-publica.transferegov.gestao.gov.br/fundoafundo/planos-acao"
DESTINO = Path(__file__).with_name("dados.json")
CODIGO_IBGE = "3548708"
MUNICIPIO = "SÃO BERNARDO DO CAMPO"

def obter(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "ConsultaPublicaSBC/1.0"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status}")
        return json.load(resp)

def lista(obj):
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict) and isinstance(obj.get("data"), list):
        return obj["data"]
    raise ValueError("Formato de resposta desconhecido; dados anteriores preservados.")

def pertence(item):
    ibge = str(item.get("codigo_ibge_municipio_ente_recebedor_plano_acao") or "").split(".")[0]
    nome = str(item.get("nome_municipio_ente_recebedor_plano_acao") or "").upper()
    return ibge == CODIGO_IBGE or nome.replace("Ã", "A").replace("Ç", "C") == "SAO BERNARDO DO CAMPO"

def main():
    encontrados = {}
    # A API deve aceitar filtro por município ou IBGE. Nunca publicar um resultado
    # sem comprovar que a consulta foi processada corretamente.
    params = {"codigo_ibge_municipio_ente_recebedor_plano_acao": CODIGO_IBGE}
    for pagina in range(1, 501):
        body = obter({**params, "pagina": pagina, "tamanho_da_pagina": 100})
        registros = lista(body)
        for item in registros:
            if not isinstance(item, dict):
                raise ValueError("Registro inesperado")
            if pertence(item):
                chave = str(item.get("id_plano_acao") or item.get("codigo_plano_acao") or json.dumps(item, sort_keys=True))
                encontrados[chave] = item
        if not isinstance(body, dict):
            raise ValueError("Paginação não comprovada")
        total_paginas = body.get("total_pages")
        if total_paginas is None:
            raise ValueError("Resposta sem total_pages: paginação não comprovada")
        if pagina >= int(total_paginas):
            break
    else:
        raise RuntimeError("Limite de páginas excedido; dados não publicados")
    if not encontrados:
        raise RuntimeError("Consulta sem registros: preservar dados anteriores até validação manual")
    payload = {
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
        "origem": API,
        "municipio": MUNICIPIO,
        "codigo_ibge": CODIGO_IBGE,
        "total": len(encontrados),
        "data": list(encontrados.values())
    }
    temporario = DESTINO.with_suffix(".tmp")
    temporario.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temporario, DESTINO)
    print(f"Validados {len(encontrados)} registros de São Bernardo do Campo.")

if __name__ == "__main__":
    main()
