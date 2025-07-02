import Fastify from 'fastify';
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload';
import { join } from 'node:path';

const fastify = Fastify({
  logger: true
});

const pluginOptions: Partial<AutoloadPluginOptions> = {
  // Place your custom options the autoload plugin below here.
}

fastify.register(AutoLoad, {
  dir: join(__dirname, 'plugins'),
  options: pluginOptions
});

fastify.register(AutoLoad, {
  dir: join(__dirname, 'routes'),
  options: pluginOptions
});

fastify.listen({ host: '::', port: Number(process.env.PORT) || 5050 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});