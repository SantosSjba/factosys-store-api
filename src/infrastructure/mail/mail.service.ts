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

  async sendVerificationEmail(
    email: string,
    token: string,
    firstName?: string | null,
  ): Promise<boolean> {
    const frontendStoreUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );

    const verificationUrl = `${frontendStoreUrl}/verify-email?token=${token}`;
    const greeting = firstName ? `Hola ${firstName}` : 'Hola';

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('mail.from'),
        to: email,
        subject: 'Verifica tu cuenta en Factosys Store',
        html: `
          <p>${greeting},</p>
          <p>Gracias por registrarte en Factosys Store.</p>
          <p>Haz clic en el siguiente enlace para activar tu cuenta:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>Este enlace expira en 24 horas.</p>
          <p>Si no creaste esta cuenta, ignora este mensaje.</p>
        `,
        text: `${greeting},\n\nVerifica tu cuenta: ${verificationUrl}\n\nEste enlace expira en 24 horas.`,
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
