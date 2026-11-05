# TSE Auditor: dados públicos

Dados extraídos dos arquivos oficiais das urnas eletrônicas publicados pelo TSE (BU, RDV e log de cada seção), com o índice de cada arquivo usado (URL no TSE, SHA-512 e MD5 conferidos na coleta).

Os arquivos ficam nos [Releases](../../releases). Uma seção destoante (achados) **não é prova de nada**: é um sinal estatístico que vem com explicações técnicas candidatas, que precisam ser verificadas antes de qualquer conclusão.

Licença dos dados: CC BY 4.0. Cite o TSE como fonte original.

## Nomes dos anexos

O Release não tem pastas, então cada arquivo leva a pasta no nome (`/` vira `_`):

| no pacote | no Release |
|---|---|
| `dados/<UF>/secoes.parquet` | `dados_<UF>_secoes.parquet` |
| `logs/<UF>/eventos_log_<n>.parquet` | `logs_<UF>_eventos_log_<n>.parquet` |
| `fontes/<UF>.parquet` | `fontes_<UF>.parquet` |

O `SHA256SUMS` do Release usa esses nomes. A estrutura, o dicionário de dados e como conferir a origem no TSE estão no `LEIA-ME.md` anexado.

## Como verificar

Baixe os anexos para uma pasta e rode nela:

- Linux/macOS: `sha256sum -c SHA256SUMS`
- Windows (PowerShell): `Get-Content SHA256SUMS | ForEach-Object { $h, $f = $_ -split '  ', 2; if ((Get-FileHash $f -Algorithm SHA256).Hash -ne $h.ToUpper()) { "DIFERENTE: $f" } }`
