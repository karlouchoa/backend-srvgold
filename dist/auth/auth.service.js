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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const role_enum_1 = require("./enums/role.enum");
const password_service_1 = require("./password.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    configService;
    passwordService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, configService, passwordService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.passwordService = passwordService;
    }
    async login(dto) {
        const user = await this.validateUser(dto.login, dto.password);
        const role = this.resolveRole(user);
        const userCode = user.cdusu.trim();
        const userEmail = user.email?.trim() ?? null;
        const userName = user.deusu?.trim() ?? null;
        const payload = {
            sub: this.resolveSubject(user),
            role,
            username: userCode,
        };
        const accessToken = await this.jwtService.signAsync(payload);
        const expiresIn = this.configService.get('JWT_EXPIRES_IN', '12h');
        this.logger.log(`Login successful for user ${userCode}`);
        return {
            success: true,
            message: 'Login realizado com sucesso.',
            data: {
                tokenType: 'Bearer',
                accessToken,
                expiresIn,
                user: {
                    id: this.resolveSubject(user),
                    code: userCode,
                    name: userName,
                    email: userEmail,
                    role,
                    permissions: {
                        admin: role === role_enum_1.Role.ADMIN,
                        multLogin: user.multlog?.toUpperCase() === 'S',
                    },
                },
            },
        };
    }
    async getProfile(user) {
        const prismaUser = await this.findUserByPayload(user);
        const role = this.resolveRole(prismaUser);
        const userCode = prismaUser.cdusu?.trim() ?? null;
        const userEmail = prismaUser.email?.trim() ?? null;
        const userName = prismaUser.deusu?.trim() ?? null;
        return {
            success: true,
            message: 'Perfil recuperado com sucesso.',
            data: {
                id: this.resolveSubject(prismaUser),
                code: userCode,
                name: userName,
                email: userEmail,
                role,
                permissions: {
                    admin: role === role_enum_1.Role.ADMIN,
                    multLogin: prismaUser.multlog?.toUpperCase() === 'S',
                },
            },
        };
    }
    async validateUser(login, password) {
        const identifier = login.trim();
        const user = await this.prisma.t_users.findFirst({
            where: {
                isdeleted: false,
                OR: [
                    { cdusu: identifier },
                    { email: identifier },
                ],
            },
        });
        if (!user) {
            this.logger.warn(`Login failed for identifier ${identifier}: user not found`);
            throw new common_1.UnauthorizedException('Credenciais invalidas.');
        }
        if (user.ativo?.toUpperCase() === 'N') {
            this.logger.warn(`Login failed for identifier ${identifier}: user inactive`);
            throw new common_1.UnauthorizedException('Usuario inativo.');
        }
        const isPasswordValid = await this.passwordService.verify(password, user.senha);
        if (!isPasswordValid) {
            this.logger.warn(`Login failed for identifier ${identifier}: invalid password`);
            throw new common_1.UnauthorizedException('Credenciais invalidas.');
        }
        return user;
    }
    resolveSubject(user) {
        if (user.ID) {
            return user.ID;
        }
        return user.codigo.toString();
    }
    resolveRole(user) {
        if (user.adm?.toUpperCase() === 'S') {
            return role_enum_1.Role.ADMIN;
        }
        const modulo = user.modulo?.toUpperCase();
        const setor = user.setor?.toUpperCase();
        const officeValues = ['OFF', 'OFFICE', 'ADM', 'ADMIN', 'ESCR', 'ESCRITORIO', 'BACKOFFICE'];
        if ((modulo && officeValues.includes(modulo)) || (setor && officeValues.includes(setor))) {
            return role_enum_1.Role.OFFICE;
        }
        return role_enum_1.Role.PDV;
    }
    async changePassword(user, dto) {
        const username = user.username?.trim();
        const currentPassword = dto.currentPassword.trim();
        const newPassword = dto.newPassword.trim();
        if (newPassword.length < 6) {
            throw new common_1.BadRequestException('A nova senha deve conter pelo menos 6 caracteres.');
        }
        if (newPassword === currentPassword) {
            throw new common_1.BadRequestException('A nova senha deve ser diferente da senha atual.');
        }
        const prismaUser = await this.findUserByPayload(user);
        const isCurrentValid = await this.passwordService.verify(currentPassword, prismaUser.senha);
        if (!isCurrentValid) {
            this.logger.warn(`Password change failed for user ${username}: invalid current password`);
            throw new common_1.UnauthorizedException('Senha atual invalida.');
        }
        const hashedPassword = await this.passwordService.hash(newPassword);
        const changedAt = new Date();
        await this.prisma.t_users.update({
            where: { codigo: prismaUser.codigo },
            data: {
                senha: hashedPassword,
                dtaltuse: changedAt,
            },
        });
        this.logger.log(`Password updated for user ${username}`);
        return {
            success: true,
            message: 'Senha alterada com sucesso.',
            data: {
                updatedAt: changedAt.toISOString(),
            },
        };
    }
    async findUserByPayload(user) {
        const subject = user.sub?.trim();
        const username = user.username?.trim();
        const identifierConditions = [];
        if (subject) {
            identifierConditions.push({ ID: subject });
        }
        if (username) {
            identifierConditions.push({ cdusu: username });
        }
        if (identifierConditions.length === 0) {
            this.logger.warn('User lookup failed: missing identifiers in token payload');
            throw new common_1.UnauthorizedException('Sessao invalida.');
        }
        const prismaUser = await this.prisma.t_users.findFirst({
            where: {
                isdeleted: false,
                OR: identifierConditions,
            },
        });
        if (!prismaUser) {
            this.logger.warn(`User lookup failed for subject ${subject ?? username}: not found`);
            throw new common_1.NotFoundException('Usuario nao encontrado.');
        }
        if (prismaUser.ativo?.toUpperCase() === 'N') {
            throw new common_1.UnauthorizedException('Usuario inativo.');
        }
        return prismaUser;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        password_service_1.PasswordService])
], AuthService);
//# sourceMappingURL=auth.service.js.map