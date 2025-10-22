import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
export declare class AuthController {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        success: boolean;
        message: string;
        data: {
            tokenType: string;
            accessToken: string;
            expiresIn: string;
            user: {
                id: string;
                code: string;
                name: string | null;
                email: string | null;
                role: import("./enums/role.enum").Role;
                permissions: {
                    admin: boolean;
                    multLogin: boolean;
                };
            };
        };
    }>;
    changePassword(user: JwtPayload, dto: ChangePasswordDto): Promise<{
        success: boolean;
        message: string;
        data: {
            updatedAt: string;
        };
    }>;
    getProfile(user: JwtPayload): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            code: string;
            name: string | null;
            email: string | null;
            role: import("./enums/role.enum").Role;
            permissions: {
                admin: boolean;
                multLogin: boolean;
            };
        };
    }>;
}
