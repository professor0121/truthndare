import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT_NOTIFICATION_SERVICE ?? 3009;
  await app.listen(port);
  console.log(`[NOTIFICATION SERVICE] Running on: http://localhost:${port}`);
}
bootstrap();
