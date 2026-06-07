import 'dotenv/config';
import { CommandFactory } from 'nest-commander';
import { CliModule } from '../src/cli/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule, {
    logger: false,
    errorHandler: (err) => {
      console.error('[Gateway CLI] Error:', err.message);
      process.exit(1);
    },
  });
}

bootstrap();
