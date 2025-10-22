## GoldPDV Sync Service

Backend NestJS que centraliza autenticacao e sincronizacao do ecossistema GoldPDV (VPS, escritorio administrativo e PDVs locais). O projeto utiliza NestJS modular, Prisma ORM e autenticacao JWT com perfis `admin`, `office` e `pdv`.

### Setup rapido

```bash
npm install
npm run start:dev
```

O servidor inicia em `http://localhost:3000` e todas as rotas usam o prefixo `/api/v1`.

---

## Fluxo de login

1. **Checar disponibilidade**  
   `GET /api/v1`  
   Retorna o status padrao:
   ```json
   {
     "success": true,
     "message": "Servico disponivel.",
     "data": {
       "uptime": 12.345,
       "timestamp": "2025-01-01T12:00:00.000Z"
     }
   }
   ```
   Esta rota e publica e pode ser usada para health-check.

2. **Autenticar usuario**  
   `POST /api/v1/auth/login`  
   Body:
   ```json
   {
     "login": "codigo-ou-email",
     "password": "senhaEmTexto"
   }
   ```
   Resposta bem-sucedida:
   ```json
   {
     "success": true,
     "message": "Login realizado com sucesso.",
     "data": {
       "tokenType": "Bearer",
       "accessToken": "jwt.token.aqui",
       "expiresIn": "12h",
       "user": {
         "id": "guid-ou-codigo",
         "code": "CDUSU",
         "name": "Nome do usuario",
         "email": "email@empresa.com",
         "role": "admin",
         "permissions": {
           "admin": true,
           "multLogin": false
         }
       }
     }
   }
   ```
   Possiveis erros (HTTP 401) retornam `{"statusCode":401,"message":"Credenciais invalidas.","error":"Unauthorized"}` ou mensagens similares para perfil inativo ou token ausente.

3. **Consumir rotas protegidas**  
   - Inclua o header `Authorization: Bearer <accessToken>` em todas as requisicoes subsequentes.
   - Os guards `JwtAuthGuard` e `RolesGuard` sao aplicados globalmente.  
     Use o decorator `@Roles('admin')`, `@Roles('office')` ou `@Roles('pdv')` nos controladores para restringir o acesso.
   - Para rotas publicas adicionais, adicione o decorator `@Public()` no controlador ou handler.

4. **Alterar senha**  
   `PATCH /api/v1/auth/password`  
   Headers: `Authorization: Bearer <accessToken>`  
   Body:
   ```json
   {
     "currentPassword": "senhaAtual",
     "newPassword": "NovaSenhaForte"
   }
   ```
   Resposta:
   ```json
   {
     "success": true,
     "message": "Senha alterada com sucesso.",
     "data": {
       "updatedAt": "2025-01-01T12:05:00.000Z"
     }
   }
   ```
   A senha eh verificada com o valor atual (incluindo senhas legadas em texto puro) e armazenada com hashing `bcrypt`.

5. **Consultar perfil**  
   `GET /api/v1/auth/me`  
   Headers: `Authorization: Bearer <accessToken>`  
   Retorna os dados do usuario autenticado, incluindo perfil (`admin`, `office`, `pdv`) e permissoes derivadas. Tokens expiraram em 12 horas por padrao (`JWT_EXPIRES_IN=12h`).

---

## API de sincronizacao

- `GET /api/v1/sync/:entity`  
  Recupera deltas para uma entidade (roles `admin`, `office`, `pdv`). Query params opcionais: `since` (ISO 8601), `limit`, `offset`. Retorna apenas registros atualizados após o valor informado em `since`.

- `POST /api/v1/sync/sales`  
  Recebe vendas provenientes dos PDVs (roles `admin`, `pdv`).

- **Sincronização dinâmica baseada no schema Prisma**  
  As entidades listadas no `schema.prisma` para cadastros e movimentações são mapeadas automaticamente.  
  - Exemplo: `GET /api/v1/sync/items?since=2025-10-01T00:00:00Z&limit=200&offset=0`  
  - Exemplo: `POST /api/v1/sync/items` com body:
    ```json
    {
      "idempotency_key": "uuid-123",
      "records": [ { "...": "..." } ]
    }
    ```  
  - Para movimentos: `POST /api/v1/sync/sales` (alias de `t_vendas`), `POST /api/v1/sync/pedcmp` (alias `purchases`), etc.  
  - Filtros de versão (`updatedAt`/`dtalteracao`) e soft delete (`deletedAt`/`isdeleted`) são aplicados automaticamente quando disponíveis.  
  - Respostas: `201 Created` em sucesso, `409 Conflict` para duplicatas de `idempotency_key`, `400 Bad Request` para validação e `500 Internal Server Error` para falhas inesperadas.

- `POST /api/v1/sync/purchases`  
  Recebe notas de compra do escritorio (roles `admin`, `office`).

- `POST /api/v1/sync/payables`  
  Recebe contas a pagar (roles `admin`, `office`).

- `POST /api/v1/sync/receivables`  
  Recebe contas a receber (roles `admin`, `office`).

Todos os endpoints de sincronizacao exigem header `Authorization: Bearer <token>` e estao cobertos pelo middleware de validacao e pelos guards JWT + Roles.

---

## Estrutura relevante

- `src/app.controller.ts` / `src/app.service.ts`  
  Health-check padrao em `/api/v1`.
- `src/auth`  
 Contem controller, service, DTOs, guards e estrategias JWT.  
  O modulo registra `JwtAuthGuard` e `RolesGuard` como guards globais.
- `src/sync`  
  Endpoints de sincronizacao (`GET /sync/:entity`, `POST /sync/sales`, etc.) com regras de roles.
- `src/sync/sync-entities.ts`  
  Parser do `schema.prisma` que descobre campos (`updatedAt`, `deletedAt`, `isdeleted`) e gera rotas dinamicamente.
- `src/common`  
  Middleware de validacao de token e filtro global de excecoes.
- `prisma/schema.prisma`  
  Mapeamentos do banco (SQL Server por padrao).

---

## Scripts principais

```bash
npm run start        # modo padrao
npm run start:dev    # modo watch
npm run build
npm test
```

Para explorar a documentacao interativa, acesse `http://localhost:3000/docs` (Swagger).  
Para deploy ou configuracoes adicionais, ajuste variaveis em `.env` (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, etc.).
