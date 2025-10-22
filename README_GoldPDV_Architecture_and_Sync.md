# GoldPDV – Arquitetura e Serviços de Sincronização

Este documento unifica a **documentação arquitetural** e os **serviços de sincronização PDV (Pull/Push)** do sistema GoldPDV.

---

# Arquitetura Técnica – Sistema GoldPDV

O sistema GoldPDV é composto por três camadas principais: VPS (nuvem), Escritório administrativo e PDVs locais. 
O VPS atua como a fonte da verdade, concentrando o banco de dados central e as APIs REST. 
O Escritório envia cadastros, compras e baixas via API. 
Os PDVs fazem pull/push de dados de vendas e catálogo de forma assíncrona, garantindo operação offline.


---

# PDV Sync — Pull & Push Services (Robusto, Offline-first)

Arquitetura de sincronização entre **PDV (SQL Server local)** e **Servidor Central (VPS/SQL Server)**, separando:
- **pull_service**: recebe *deltas* do servidor (cadastros e dados mestres)
- **push_service**: envia eventos imutáveis (vendas, caixa, NF-e) com **idempotência**

## Recursos-chave
- Idempotência (chave UUID) e outbox
- Retry com backoff exponencial
- Logs rotativos (JSON e texto)
- Healthcheck para orquestração
- Variáveis de ambiente (.env) e Docker
- Change Tracking no SQL Server central (para deltas)

## Estrutura
```
common/
  sqlserver_enable_change_tracking.sql
  pdv_aux_tables.sql
pull_service/
  Dockerfile
  requirements.txt
  src/
    main.py
    sync_pull.py
    api.py
    db.py
    config.py
    logging_conf.py
    healthcheck.py
push_service/
  Dockerfile
  requirements.txt
  src/
    main.py
    sync_push.py
    api.py
    db.py
    config.py
    logging_conf.py
    healthcheck.py
.env.example
docker-compose.yml
```

## Como rodar em desenvolvimento
1) Crie `.env` a partir de `.env.example` e ajuste as variáveis.
2) Configure ODBC Driver 18 no host (se necessário).
3) (Opcional) Execute os scripts de `common/`:
   - `sqlserver_enable_change_tracking.sql` (no servidor central)
   - `pdv_aux_tables.sql` (no PDV)
4) Build & up:
```bash
docker compose build
docker compose up -d
```

Logs:
```bash
docker logs -f pdv-sync-pull
docker logs -f pdv-sync-push
```

## Próximos passos
- Preencher consultas SQL reais em `sync_pull.py` (select de deltas por tabela) e `sync_push.py` (geração dos JSONs de venda).
- Integrar com sua API real (endpoints de leitura/escrita).
- Ajustar mapeamentos de colunas conforme seu schema.
