import { handle } from 'hono/vercel';
import { app } from '../src/app.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

export default handle(app);
