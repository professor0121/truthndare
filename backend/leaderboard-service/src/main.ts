import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT_LEADERBOARD_SERVICE ?? 3007;
  await app.listen(port);
  console.log(`[LEADERBOARD SERVICE] Running on: http://localhost:${port}`);
}
bootstrap();
