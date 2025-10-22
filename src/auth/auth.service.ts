import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from './enums/role.enum';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PasswordService } from './password.service';
import { Prisma, t_users as PrismaTUser } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.login, dto.password);

    const role = this.resolveRole(user);
    const userCode = user.cdusu.trim();
    const userEmail = user.email?.trim() ?? null;
    const userName = user.deusu?.trim() ?? null;

    const payload: JwtPayload = {
      sub: this.resolveSubject(user),
      role,
      username: userCode,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '12h');

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
            admin: role === Role.ADMIN,
            multLogin: user.multlog?.toUpperCase() === 'S',
          },
        },
      },
    };
  }

  async getProfile(user: JwtPayload) {
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
          admin: role === Role.ADMIN,
          multLogin: prismaUser.multlog?.toUpperCase() === 'S',
        },
      },
    };
  }

  private async validateUser(login: string, password: string): Promise<PrismaTUser> {
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
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    if (user.ativo?.toUpperCase() === 'N') {
      this.logger.warn(`Login failed for identifier ${identifier}: user inactive`);
      throw new UnauthorizedException('Usuario inativo.');
    }

    const isPasswordValid = await this.passwordService.verify(password, user.senha);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed for identifier ${identifier}: invalid password`);
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    return user;
  }

  private resolveSubject(user: PrismaTUser): string {
    if (user.ID) {
      return user.ID;
    }

    return user.codigo.toString();
  }

  private resolveRole(user: PrismaTUser): Role {
    if (user.adm?.toUpperCase() === 'S') {
      return Role.ADMIN;
    }

    const modulo = user.modulo?.toUpperCase();
    const setor = user.setor?.toUpperCase();

    const officeValues = ['OFF', 'OFFICE', 'ADM', 'ADMIN', 'ESCR', 'ESCRITORIO', 'BACKOFFICE'];

    if ((modulo && officeValues.includes(modulo)) || (setor && officeValues.includes(setor))) {
      return Role.OFFICE;
    }

    return Role.PDV;
  }

  async changePassword(user: JwtPayload, dto: ChangePasswordDto) {
    const username = user.username?.trim();
    const currentPassword = dto.currentPassword.trim();
    const newPassword = dto.newPassword.trim();

    if (newPassword.length < 6) {
      throw new BadRequestException('A nova senha deve conter pelo menos 6 caracteres.');
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    }

    const prismaUser = await this.findUserByPayload(user);

    const isCurrentValid = await this.passwordService.verify(currentPassword, prismaUser.senha);

    if (!isCurrentValid) {
      this.logger.warn(`Password change failed for user ${username}: invalid current password`);
      throw new UnauthorizedException('Senha atual invalida.');
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

  private async findUserByPayload(user: JwtPayload): Promise<PrismaTUser> {
    const subject = user.sub?.trim();
    const username = user.username?.trim();
    const identifierConditions: Prisma.t_usersWhereInput[] = [];

    if (subject) {
      identifierConditions.push({ ID: subject });
    }

    if (username) {
      identifierConditions.push({ cdusu: username });
    }

    if (identifierConditions.length === 0) {
      this.logger.warn('User lookup failed: missing identifiers in token payload');
      throw new UnauthorizedException('Sessao invalida.');
    }

    const prismaUser = await this.prisma.t_users.findFirst({
      where: {
        isdeleted: false,
        OR: identifierConditions,
      },
    });

    if (!prismaUser) {
      this.logger.warn(`User lookup failed for subject ${subject ?? username}: not found`);
      throw new NotFoundException('Usuario nao encontrado.');
    }

    if (prismaUser.ativo?.toUpperCase() === 'N') {
      throw new UnauthorizedException('Usuario inativo.');
    }

    return prismaUser;
  }
}
