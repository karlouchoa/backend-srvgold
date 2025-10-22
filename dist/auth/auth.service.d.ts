import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from './enums/role.enum';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PasswordService } from './password.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    private readonly passwordService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, passwordService: PasswordService);
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
                role: Role;
                permissions: {
                    admin: boolean;
                    multLogin: boolean;
                };
            };
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
            role: Role;
            permissions: {
                admin: boolean;
                multLogin: boolean;
            };
        };
    }>;
    private validateUser;
    private resolveSubject;
    private resolveRole;
    changePassword(user: JwtPayload, dto: ChangePasswordDto): Promise<{
        success: boolean;
        message: string;
        data: {
            updatedAt: string;
        };
    }>;
    private findUserByPayload;
}
