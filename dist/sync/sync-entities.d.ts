import { Role } from '../auth/enums/role.enum';
export type SyncEntityCategory = 'cadastro' | 'movimentacao';
export interface SyncEntityConfig {
    slug: string;
    model: string;
    category: SyncEntityCategory;
    readRoles: Role[];
    writeRoles: Role[];
    aliases: string[];
    fields: string[];
    updatedField?: string;
    deletedAtField?: string;
    deletedFlagField?: string;
}
export declare const SYNC_ENTITY_CONFIGS: SyncEntityConfig[];
export declare function resolveSyncEntity(entityKey: string): SyncEntityConfig | undefined;
