import './tracing';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new EnvelopeInterceptor(),
    new LoggingInterceptor(),
  );

  app.use(helmet({
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: false, // CSP handled by SPA's meta tag
  }));

  const corsOrigin = (() => {
    if (process.env.NODE_ENV === 'production') {
      const allowed = process.env.CORS_ALLOWED_ORIGINS;
      if (!allowed) {
        logger.error('FATAL: CORS_ALLOWED_ORIGINS is not set in production. Refusing to start.');
        process.exit(1);
      }
      return allowed.split(',').map((o) => o.trim());
    }
    return true;
  })();

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-idempotency-key'],
  });

  // Validate production secrets are not using defaults
  if (process.env.NODE_ENV === 'production') {
    const placeholders = ['CHANGE_ME_IN_PRODUCTION', 'CHANGE_ME_IN_PRODUCTION_ADMIN'];
    const secrets = ['JWT_SECRET', 'JWT_ADMIN_SECRET', 'OTP_HASH_SALT', 'CONTRACT_HASH_SALT'];
    for (const key of secrets) {
      if (!process.env[key] || placeholders.includes(process.env[key] as string)) {
        logger.error(`FATAL: ${key} is not configured for production. Refusing to start.`);
        process.exit(1);
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const swagger = require('@nestjs/swagger');
      const config = new swagger.DocumentBuilder()
        .setTitle('VIN Portal API')
        .setDescription('API for adding vehicles to warranty contracts')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = swagger.SwaggerModule.createDocument(app, config);
      swagger.SwaggerModule.setup('api/docs', app, document);
      logger.log('Swagger docs available at /api/docs');
    } catch {
      logger.warn('Swagger not available — install @nestjs/swagger to enable API docs');
    }
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

bootstrap();
