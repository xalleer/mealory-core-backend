import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config({ path: '.env.local' });
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new LoggingInterceptor());

  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('Mealory Core API')
    .setDescription('API documentation')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
