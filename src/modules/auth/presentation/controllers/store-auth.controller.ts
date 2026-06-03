import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../../shared/decorators/public.decorator';
import { AUTH_AUDIENCE } from '../../../../shared/constants/auth.constants';
import { getRequestContext } from '../../../../shared/helpers/request-context.helper';
import { AuthTokensResponseDto } from '../../application/dto/auth-tokens-response.dto';
import { LoginDto } from '../../application/dto/login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { StoreRegisterDto } from '../../application/dto/store-register.dto';
import { VerifyEmailDto } from '../../application/dto/verify-email.dto';
import { AuthService } from '../../application/services/auth.service';

@ApiTags('Store Auth')
@Controller('store/auth')
export class StoreAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registro de cliente en la tienda' })
  register(@Body() dto: StoreRegisterDto) {
    return this.authService.storeRegister(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verificar correo y activar cuenta de cliente' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request) {
    return this.authService.verifyStoreEmail(
      dto.token,
      getRequestContext(request),
    );
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Inicio de sesión de cliente en la tienda' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.storeLogin(
      dto.email,
      dto.password,
      getRequestContext(request),
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar tokens de la tienda' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refreshTokens(
      dto.refreshToken,
      AUTH_AUDIENCE.STORE,
      getRequestContext(request),
    );
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión de la tienda' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
