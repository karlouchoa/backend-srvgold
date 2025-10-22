"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const sync_entities_1 = require("./sync-entities");
const crypto_1 = require("crypto");
let SyncService = SyncService_1 = class SyncService {
    prisma;
    logger = new common_1.Logger(SyncService_1.name);
    defaultLimit = 100;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async pull(entityKey, query, user) {
        const config = this.resolveConfig(entityKey);
        this.ensureRole(config, user.role, 'pull');
        const limit = query.limit ?? this.defaultLimit;
        const offset = query.offset ?? 0;
        const sinceDate = query.since ? new Date(query.since) : undefined;
        if (sinceDate && Number.isNaN(sinceDate.getTime())) {
            this.logger.warn(`[Pull] entity=${config.slug} user=${user.username} since=${query.since} :: parametro since invalido`);
            throw new common_1.BadRequestException('Parametro since invalido. Use timestamp ISO 8601.');
        }
        this.logger.log(`[Pull] entity=${config.slug} user=${user.username} since=${query.since ?? 'null'} limit=${limit} offset=${offset}`);
        const delegate = this.getDelegate(config);
        const where = this.buildWhereFilter(config, sinceDate);
        const orderBy = this.buildOrderBy(config);
        const records = await delegate.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy,
        });
        return {
            success: true,
            message: `Registros de ${config.slug} recuperados com sucesso.`,
            data: {
                entity: config.slug,
                since: query.since ?? null,
                limit,
                offset,
                count: records.length,
                records,
            },
        };
    }
    async push(entityKey, payload, user) {
        const config = this.resolveConfig(entityKey);
        this.ensureRole(config, user.role, 'push');
        if (!payload.idempotency_key) {
            this.logger.warn(`[Push] entity=${config.slug} user=${user.username} :: idempotency_key ausente`);
            throw new common_1.BadRequestException('Campo idempotency_key é obrigatório.');
        }
        const idempotencyKey = payload.idempotency_key.trim();
        if (!idempotencyKey) {
            this.logger.warn(`[Push] entity=${config.slug} user=${user.username} :: idempotency_key vazio`);
            throw new common_1.BadRequestException('Campo idempotency_key não pode ser vazio.');
        }
        if (!payload.records || payload.records.length === 0) {
            throw new common_1.BadRequestException('Nenhum registro informado para sincronização.');
        }
        const preparedRecords = payload.records.map((record) => this.prepareRecord(record, config));
        const received = preparedRecords.length;
        const payloadHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(payload.records)).digest('hex');
        let inserted = 0;
        try {
            inserted = await this.prisma.$transaction(async (tx) => {
                await tx.$executeRawUnsafe(`
          IF OBJECT_ID('dbo.sync_idempotency', 'U') IS NULL
          BEGIN
            CREATE TABLE dbo.sync_idempotency (
              id INT IDENTITY(1,1) PRIMARY KEY,
              entity VARCHAR(100) NOT NULL,
              idempotency_key VARCHAR(100) NOT NULL,
              payloadhash VARCHAR(128) NULL,
              createdat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
            );
            CREATE UNIQUE INDEX UX_sync_idempotency_entity_key ON dbo.sync_idempotency(entity, idempotency_key);
          END
        `);
                const insertedKey = await tx.$executeRawUnsafe(`
          INSERT INTO dbo.sync_idempotency (entity, idempotency_key, payloadhash)
          SELECT @p1, @p2, @p3
          WHERE NOT EXISTS (
            SELECT 1 FROM dbo.sync_idempotency WITH (UPDLOCK, HOLDLOCK)
            WHERE entity = @p1 AND idempotency_key = @p2
          )
          `, config.slug, idempotencyKey, payloadHash);
                if (!insertedKey) {
                    this.logger.warn(`[Push] duplicata detectada entity=${config.slug} user=${user.username} idempotency=${idempotencyKey}`);
                    throw new common_1.ConflictException('Requisicao duplicada (idempotencia).');
                }
                const delegate = this.getDelegate(config, tx);
                const result = await delegate.createMany({
                    data: preparedRecords,
                    skipDuplicates: true,
                });
                return result.count ?? preparedRecords.length;
            });
            this.logger.log(`[Push] entity=${config.slug} user=${user.username} idempotency=${idempotencyKey} received=${received} inserted=${inserted}`);
        }
        catch (error) {
            if (error instanceof common_1.ConflictException) {
                throw error;
            }
            this.logger.error(`[Push] erro entity=${config.slug} user=${user.username} idempotency=${idempotencyKey}: ${error.message}`, error.stack);
            throw error;
        }
        return {
            success: true,
            message: `Payload de ${config.slug} processado com sucesso.`,
            data: {
                entity: config.slug,
                received,
                inserted,
                source: payload.source ?? null,
                cursor: payload.cursor ?? null,
                processedAt: new Date().toISOString(),
            },
        };
    }
    resolveConfig(entityKey) {
        const config = (0, sync_entities_1.resolveSyncEntity)(entityKey);
        if (!config) {
            throw new common_1.NotFoundException(`Entidade de sincronização não configurada: ${entityKey}`);
        }
        return config;
    }
    ensureRole(config, role, operation) {
        const allowed = operation === 'pull' ? config.readRoles : config.writeRoles;
        if (!allowed.includes(role)) {
            throw new common_1.ForbiddenException(`Perfil ${role} não possui permissão para ${operation} em ${config.slug}.`);
        }
    }
    getDelegate(config, client) {
        const provider = client ?? this.prisma;
        const delegate = provider[config.model];
        if (!delegate) {
            throw new common_1.NotFoundException(`Delegate Prisma não encontrado para ${config.model}`);
        }
        return delegate;
    }
    buildWhereFilter(config, since) {
        const filters = [];
        if (since && config.updatedField) {
            filters.push({
                [config.updatedField]: {
                    gte: since,
                },
            });
        }
        if (config.deletedFlagField) {
            filters.push({
                [config.deletedFlagField]: false,
            });
        }
        if (config.deletedAtField) {
            filters.push({
                [config.deletedAtField]: null,
            });
        }
        if (filters.length === 0) {
            return undefined;
        }
        return {
            AND: filters,
        };
    }
    buildOrderBy(config) {
        if (config.updatedField) {
            return {
                [config.updatedField]: 'asc',
            };
        }
        return undefined;
    }
    prepareRecord(record, config) {
        if (record === null || typeof record !== 'object' || Array.isArray(record)) {
            throw new common_1.BadRequestException('Cada registro deve ser um objeto JSON.');
        }
        const payload = { ...record };
        const now = new Date();
        if (config.updatedField && payload[config.updatedField] === undefined) {
            payload[config.updatedField] = now;
        }
        if (config.deletedFlagField && payload[config.deletedFlagField] === undefined) {
            payload[config.deletedFlagField] = false;
        }
        if (config.deletedAtField && payload[config.deletedAtField] === undefined) {
            payload[config.deletedAtField] = null;
        }
        return payload;
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyncService);
//# sourceMappingURL=sync.service.js.map