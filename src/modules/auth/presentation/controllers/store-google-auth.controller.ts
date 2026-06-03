import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../../../shared/decorators/public.decorator';
import { getRequestContext } from '../../../../shared/helpers/request-context.helper';
import { GoogleProfilePayload } from '../../domain/types/login-context.type';
import { AuthService } from '../../application/services/auth.service';
import { GoogleAuthGuard } from '../../infrastructure/guards/google-auth.guard';

@ApiTags('Store Auth')
@Controller('store/auth')
export class StoreGoogleAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Iniciar sesión con Google (redirección OAuth)',
    description:
      'Redirige al usuario a Google. Tras autenticarse, vuelve al callback y redirige al frontend con tokens.',
  })
  googleAuth(): void {
    // Passport maneja la redirección
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback OAuth de Google' })
  async googleCallback(
    @Req() request: Request & { user: GoogleProfilePayload },
    @Res() response: Response,
  ): Promise<void> {
    const tokens = await this.authService.handleGoogleLogin(
      request.user,
      getRequestContext(request),
    );

    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );

    const redirectUrl = new URL(`${frontendUrl}/auth/google/callback`);
    redirectUrl.searchParams.set('accessToken', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);

    response.redirect(redirectUrl.toString());
  }
}
