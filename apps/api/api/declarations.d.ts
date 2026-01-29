declare module '../dist/index.js' {
  import { Hono } from 'hono';
  const app: Hono;
  export default app;
}
