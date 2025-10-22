import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    this.logger.debug(`Handling login for identifier ${dto.login}`);
    return this.authService.login(dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    this.logger.debug(`Handling password change for user ${user.username}`);
    return this.authService.changePassword(user, dto);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload) {
    this.logger.debug(`Fetching profile for user ${user.username}`);
    return this.authService.getProfile(user);
  }
}
