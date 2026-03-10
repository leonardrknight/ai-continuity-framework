import { serve } from '@hono/node-server';
import { app } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`Guardian Agent listening on port ${info.port}`);
});
