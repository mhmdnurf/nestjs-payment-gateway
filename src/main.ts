import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import 'dotenv/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function formatValidationErrors(errors: ValidationError[]) {
  return errors.reduce(
    (acc, error) => {
      if (error.constraints) {
        acc[error.property] = Object.values(error.constraints);
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Payment API Docs')
    .setDescription('This is the description')
    .setVersion('1.0.0')
    .addTag('payments')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  app.setGlobalPrefix('api/v1', {});

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        return new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          errors: formatValidationErrors(errors),
        });
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
