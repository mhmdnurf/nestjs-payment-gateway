import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('MAIL_HOST');
        const portRaw = configService.get<string>('MAIL_PORT');
        const user = configService.get<string>('MAIL_USER');
        const pass = configService.get<string>('MAIL_PASS');
        const from = configService.get<string>('MAIL_FROM');

        if (!host || !portRaw || !user || !pass || !from) {
          throw new Error(
            'Missing mail configuration. Check MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, and MAIL_FROM.',
          );
        }

        const port = Number(portRaw);

        if (!Number.isInteger(port) || port <= 0) {
          throw new Error(`Invalid MAIL_PORT value: ${portRaw}`);
        }

        return {
          transport: {
            host,
            port,
            secure: false,
            auth: {
              user,
              pass,
            },
          },
          defaults: {
            from,
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
