import { PrismaService } from '../prisma/prisma.service';
import { SyncRecordsDto } from './dto/sync-records.dto';
import { SyncQueryDto } from './dto/sync-query.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
export declare class SyncService {
    private readonly prisma;
    private readonly logger;
    private readonly defaultLimit;
    constructor(prisma: PrismaService);
    pull(entityKey: string, query: SyncQueryDto, user: JwtPayload): Promise<{
        success: boolean;
        message: string;
        data: {
            entity: string;
            since: string | null;
            limit: number;
            offset: number;
            count: any;
            records: any;
        };
    }>;
    push(entityKey: string, payload: SyncRecordsDto, user: JwtPayload): Promise<{
        success: boolean;
        message: string;
        data: {
            entity: string;
            received: number;
            inserted: number;
            source: string | null;
            cursor: string | null;
            processedAt: string;
        };
    }>;
    private resolveConfig;
    private ensureRole;
    private getDelegate;
    private buildWhereFilter;
    private buildOrderBy;
    private prepareRecord;
}
