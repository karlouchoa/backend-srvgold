export declare class SyncRecordsDto {
    readonly idempotency_key: string;
    readonly records: Record<string, unknown>[];
    readonly source?: string;
    readonly cursor?: string;
}
