# GoldPDV API Generator — Prompts para Codex / Copilot Chat

Este documento contém uma sequência de prompts cuidadosamente elaborados para guiar o desenvolvimento do webservice **GoldPDV**, utilizando **Node.js + NestJS + Prisma + JWT**.
Eles foram projetados para funcionar com o **schema.prisma** real do projeto e garantir compatibilidade total com os serviços de sincronização Python (`pull_service` e `push_service`).

---

## 🧩 Prompt 1 — Contexto Geral do Projeto
Use este prompt antes de pedir geração de código.

```
Contexto do projeto:
Estou criando um webservice corporativo para o sistema GoldPDV.

A arquitetura do sistema é composta por:
- VPS (servidor central e fonte da verdade)
- Escritório (API administrativa)
- PDVs locais (pull/push de dados).

O backend do VPS será desenvolvido em **Node.js + NestJS + Prisma**, conectado a um banco **PostgreSQL** (multiempresa) ou **SQL Server**.

O objetivo é criar APIs REST seguras, padronizadas e compatíveis com os serviços Python de sincronização (pull_service e push_service) já implementados.

Use sempre:
- Estrutura modular do NestJS (`modules`, `controllers`, `services`, `dto`)
- Prisma ORM (com `schema.prisma` existente)
- Middleware de autenticação JWT (roles: "admin", "office", "pdv")
- Respostas padronizadas em JSON
- Logging via `Logger` do NestJS
- Boas práticas de versionamento de API (`/api/v1/...`)
```

---

## ⚙️ Prompt 2 — Criação inicial do projeto

```
Crie a estrutura base de um projeto NestJS com Prisma e autenticação JWT para o sistema GoldPDV.

O projeto deve incluir:
- Módulo `auth` com JWT e roles (admin, office, pdv)
- Módulo `sync` com endpoints para:
  - `GET /sync/:entity` → retorna deltas (pull)
  - `POST /sync/sales` → recebe vendas (push)
  - `POST /sync/purchases` → recebe notas de compra
  - `POST /sync/payables` → recebe contas a pagar
  - `POST /sync/receivables` → recebe contas a receber
- Middleware de validação por token.
- Logger e tratamento de erros global (`HttpExceptionFilter`).
- Configuração de conexão Prisma (`PrismaService`).
- Swagger configurado em `/docs`.

Crie o esqueleto completo do projeto com todas essas pastas e arquivos.
```

---

## 🧠 Prompt 3 — Geração dos endpoints de sincronização

```
Com base no `schema.prisma`, gere automaticamente os endpoints de sincronização para cada entidade do sistema GoldPDV.

As entidades envolvidas são:
- T_ITENS
- T_ITENS_TRIB
- T_ITENS_IMG
- T_CLI
- T_CLI_END
- T_USERS
- T_MOTORISTAS
- T_EMP
- T_DEBCRECLI
- T_MOVEST
- T_VENDE

Crie rotas do tipo:
- `GET /sync/items?since=2025-10-01T00:00:00Z` → retorna apenas registros alterados após a data.
- `POST /sync/items` → recebe novos cadastros criados no Escritório.
- `POST /sync/sales` → recebe vendas vindas dos PDVs.

Implemente paginação (`limit`, `offset`), versionamento (`updatedAt`) e soft delete (`deletedAt`).
Use DTOs e validação com `class-validator`.
```

---

## 🔒 Prompt 4 — Implementação da autenticação

```
Implemente autenticação JWT no projeto NestJS com as seguintes regras:

- Cada requisição precisa enviar o token no header `Authorization: Bearer <token>`.
- Crie 3 perfis de usuário: `admin`, `office`, `pdv`.
- Apenas `admin` pode acessar endpoints de cadastro global.
- `office` pode criar/atualizar cadastros e enviar compras/pagamentos.
- `pdv` pode consultar cadastros e enviar vendas/notas.
- Tokens expiram em 12 horas.
- Crie o módulo `auth` com:
  - `auth.controller.ts`
  - `auth.service.ts`
  - `jwt.strategy.ts`
  - `roles.guard.ts`

Implemente `POST /auth/login` e `GET /auth/me`.
```

---

## 🔁 Prompt 5 — Integração com serviços Python

```
As APIs precisam ser compatíveis com os serviços Python `pdv-sync-pull` e `pdv-sync-push`.

Garanta:
- As rotas de leitura aceitam query `since` (timestamp ISO) e retornam registros modificados após esse valor.
- As rotas de escrita (`POST /sync/sales`, `POST /sync/purchases`) aceitam payload JSON com campo `idempotency_key`.
- Use o campo `idempotency_key` para ignorar duplicatas (unique constraint).
- As respostas devem ser:
  - 201 Created → sucesso
  - 409 Conflict → duplicata (idempotência)
  - 400 Bad Request → validação
  - 500 → erro interno
- Adicione log detalhado no `Logger` NestJS para cada evento.
```

---

## 🧩 Prompt 6 — Deploy

```
Gere um `Dockerfile` e `docker-compose.yml` para o backend NestJS do GoldPDV.

O ambiente deve incluir:
- app (Node 20 + NestJS + Prisma)
- banco (PostgreSQL ou SQL Server, configurável via `.env`)
- volumes persistentes
- healthcheck (rota `/health`)
- restart automático

Use variáveis de ambiente:
- DATABASE_URL
- JWT_SECRET
- PORT=3000
- NODE_ENV=production

Inclua instruções para build e execução:
```bash
docker compose build
docker compose up -d
```
```

---

## 💡 Dica Final

1. Cole cada prompt no **Copilot Chat** ou **Cursor IDE** conforme a etapa.
2. Deixe o `schema.prisma` aberto para o modelo entender suas tabelas.
3. Peça sempre: *"gere apenas o código, sem comentários explicativos."*
4. Teste cada módulo isoladamente antes de conectar aos serviços Python.
