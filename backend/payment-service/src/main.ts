import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT_PAYMENT_SERVICE ?? 3013;
  await app.listen(port);
  console.log(`[PAYMENT SERVICE] Running on: http://localhost:${port}`);
}
bootstrap();
