import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncRecordsDto } from './dto/sync-records.dto';
import { SyncQueryDto } from './dto/sync-query.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { resolveSyncEntity, SyncEntityConfig } from './sync-entities';
import { Role } from '../auth/enums/role.enum';
import { createHash } from 'crypto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly defaultLimit = 100;

  constructor(private readonly prisma: PrismaService) {}

  async pull(entityKey: string, query: SyncQueryDto, user: JwtPayload) {
    const config = this.resolveConfig(entityKey);
    this.ensureRole(config, user.role, 'pull');

    const limit = query.limit ?? this.defaultLimit;
    const offset = query.offset ?? 0;
    const sinceDate = query.since ? new Date(query.since) : undefined;

    if (sinceDate && Number.isNaN(sinceDate.getTime())) {
      this.logger.warn(
        `[Pull] entity=${config.slug} user=${user.username} since=${query.since} :: parametro since invalido`,
      );
      throw new BadRequestException('Parametro since invalido. Use timestamp ISO 8601.');
    }

    this.logger.log(
      `[Pull] entity=${config.slug} user=${user.username} since=${query.since ?? 'null'} limit=${limit} offset=${offset}`,
    );

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

  async push(entityKey: string, payload: SyncRecordsDto, user: JwtPayload) {
    const config = this.resolveConfig(entityKey);
    this.ensureRole(config, user.role, 'push');

    if (!payload.idempotency_key) {
      this.logger.warn(`[Push] entity=${config.slug} user=${user.username} :: idempotency_key ausente`);
      throw new BadRequestException('Campo idempotency_key é obrigatório.');
    }

    const idempotencyKey = payload.idempotency_key.trim();

    if (!idempotencyKey) {
      this.logger.warn(`[Push] entity=${config.slug} user=${user.username} :: idempotency_key vazio`);
      throw new BadRequestException('Campo idempotency_key não pode ser vazio.');
    }

    if (!payload.records || payload.records.length === 0) {
      throw new BadRequestException('Nenhum registro informado para sincronização.');
    }

    const preparedRecords = payload.records.map((record) => this.prepareRecord(record, config));
    const received = preparedRecords.length;

    const payloadHash = createHash('sha256').update(JSON.stringify(payload.records)).digest('hex');

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

        const insertedKey = await tx.$executeRawUnsafe(
          `
          INSERT INTO dbo.sync_idempotency (entity, idempotency_key, payloadhash)
          SELECT @p1, @p2, @p3
          WHERE NOT EXISTS (
            SELECT 1 FROM dbo.sync_idempotency WITH (UPDLOCK, HOLDLOCK)
            WHERE entity = @p1 AND idempotency_key = @p2
          )
          `,
          config.slug,
          idempotencyKey,
          payloadHash,
        );

        if (!insertedKey) {
          this.logger.warn(
            `[Push] duplicata detectada entity=${config.slug} user=${user.username} idempotency=${idempotencyKey}`,
          );
          throw new ConflictException('Requisicao duplicada (idempotencia).');
        }

        const delegate = this.getDelegate(config, tx as unknown as Record<string, any>);

        const result = await delegate.createMany({
          data: preparedRecords,
          skipDuplicates: true,
        });

        return result.count ?? preparedRecords.length;
      });

      this.logger.log(
        `[Push] entity=${config.slug} user=${user.username} idempotency=${idempotencyKey} received=${received} inserted=${inserted}`,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(
        `[Push] erro entity=${config.slug} user=${user.username} idempotency=${idempotencyKey}: ${
          (error as Error).message
        }`,
        (error as Error).stack,
      );
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

  private resolveConfig(entityKey: string): SyncEntityConfig {
    const config = resolveSyncEntity(entityKey);
    if (!config) {
      throw new NotFoundException(`Entidade de sincronização não configurada: ${entityKey}`);
    }
    return config;
  }

  private ensureRole(config: SyncEntityConfig, role: Role, operation: 'pull' | 'push') {
    const allowed = operation === 'pull' ? config.readRoles : config.writeRoles;
    if (!allowed.includes(role)) {
      throw new ForbiddenException(`Perfil ${role} não possui permissão para ${operation} em ${config.slug}.`);
    }
  }

  private getDelegate(config: SyncEntityConfig, client?: Record<string, any>) {
    const provider = client ?? ((this.prisma as unknown as Record<string, any>));
    const delegate = provider[config.model];
    if (!delegate) {
      throw new NotFoundException(`Delegate Prisma não encontrado para ${config.model}`);
    }
    return delegate;
  }

  private buildWhereFilter(config: SyncEntityConfig, since?: Date) {
    const filters: Record<string, unknown>[] = [];

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

  private buildOrderBy(config: SyncEntityConfig) {
    if (config.updatedField) {
      return {
        [config.updatedField]: 'asc',
      };
    }

    return undefined;
  }

  private prepareRecord(record: Record<string, unknown>, config: SyncEntityConfig) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      throw new BadRequestException('Cada registro deve ser um objeto JSON.');
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
}
