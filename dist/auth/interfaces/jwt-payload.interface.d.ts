import { Role } from '../enums/role.enum';
export interface JwtPayload {
    sub: string;
    role: Role;
    username: string;
    tenantId?: string | null;
}
