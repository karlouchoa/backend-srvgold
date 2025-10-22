import { SyncService } from './sync.service';
import { SyncRecordsDto } from './dto/sync-records.dto';
import { SyncQueryDto } from './dto/sync-query.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    pull(entity: string, query: SyncQueryDto, user: JwtPayload): Promise<{
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
    push(entity: string, payload: SyncRecordsDto, user: JwtPayload): Promise<{
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
}
