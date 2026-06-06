import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('mail.host', 'localhost');
    const port = this.configService.get<number>('mail.port', 1025);
    const secure = this.configService.get<boolean>('mail.secure', false);
    const user = this.configService.get<string>('mail.user', '');
    const pass = this.configService.get<string>('mail.password', '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
  }

  async sendVerificationCodeEmail(
    email: string,
    code: string,
    firstName?: string | null,
  ): Promise<boolean> {
    const frontendStoreUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );

    const verificationUrl = new URL(`${frontendStoreUrl}/verify-email`);
    verificationUrl.searchParams.set('email', email);
    verificationUrl.searchParams.set('code', code);

    const greeting = firstName ? `Hola ${firstName}` : 'Hola';

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('mail.from'),
        to: email,
        subject: 'Confirma tu correo en Factosys Store',
        html: `
          <p>${greeting},</p>
          <p>Gracias por registrarte en Factosys Store.</p>
          <p>Tu código de verificación es:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 16px 0;">${code}</p>
          <p>También puedes confirmar tu cuenta desde este enlace:</p>
          <p><a href="${verificationUrl.toString()}">${verificationUrl.toString()}</a></p>
          <p>El código expira en 24 horas.</p>
          <p>Si no creaste esta cuenta, ignora este mensaje.</p>
        `,
        text: `${greeting},\n\nTu código de verificación es: ${code}\n\nConfirma tu cuenta: ${verificationUrl.toString()}\n\nEl código expira en 24 horas.`,
      });

      this.logger.log(`Correo de verificación enviado a ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de verificación a ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }
}
