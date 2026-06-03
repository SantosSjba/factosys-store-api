import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../../shared/decorators/public.decorator';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { AUTH_AUDIENCE } from '../../../../shared/constants/auth.constants';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { getRequestContext } from '../../../../shared/helpers/request-context.helper';
import { AuthTokensResponseDto } from '../../application/dto/auth-tokens-response.dto';
import { LoginDto } from '../../application/dto/login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { AuthService } from '../../application/services/auth.service';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Inicio de sesión del panel administrativo' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.adminLogin(
      dto.email,
      dto.password,
      getRequestContext(request),
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar tokens del panel administrativo' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refreshTokens(
      dto.refreshToken,
      AUTH_AUDIENCE.ADMIN,
      getRequestContext(request),
    );
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión del panel administrativo' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UserTypes('STAFF')
  @Get('login-audit')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Auditoría de inicios de sesión' })
  listLoginAudit() {
    return this.authService.listLoginAudits();
  }
}
