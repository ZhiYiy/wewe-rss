import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrpcRouter } from '@server/trpc/trpc.router';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigurationType } from './configuration';
import { join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

// 尝试从多个可能的位置读取package.json
let appVersion = '0.0.0'; // 默认版本号，以防无法读取
try {
  // 首先尝试从dist目录的上一级读取
  const distPackagePath = resolve(__dirname, '..', './package.json');
  // 然后尝试从src目录的上一级读取
  const srcPackagePath = resolve(__dirname, '..', '..', './package.json');
  
  let packagePath;
  if (existsSync(distPackagePath)) {
    packagePath = distPackagePath;
  } else if (existsSync(srcPackagePath)) {
    packagePath = srcPackagePath;
  }
  
  if (packagePath) {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    appVersion = packageJson.version;
  }
} catch (error) {
  console.error('无法读取package.json文件，使用默认版本号', error);
}

console.log('appVersion: v' + appVersion);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const { host, isProd, port } =
    configService.get<ConfigurationType['server']>('server')!;

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.useStaticAssets(join(__dirname, '..', 'client', 'assets'), {
    prefix: '/dash/assets/',
  });
  app.setBaseViewsDir(join(__dirname, '..', 'client'));
  app.setViewEngine('hbs');

  if (isProd) {
    app.enable('trust proxy');
  }

  app.enableCors({
    exposedHeaders: ['authorization'],
  });

  const trpc = app.get(TrpcRouter);
  trpc.applyMiddleware(app);

  await app.listen(port, host);

  console.log(`Server is running at http://${host}:${port}`);
}
bootstrap();
