import dotenv from 'dotenv';
import express from 'express';
import { resolve } from 'node:path';
import { createApp } from './app';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });
const app = createApp();
app.use(express.static(resolve('dist')));
app.get('/{*path}', (_request, response) => response.sendFile(resolve('dist/index.html')));
const port = Number(process.env.PORT || 3001);
app.listen(port, '127.0.0.1', () => console.log(`Neartrip API: http://127.0.0.1:${port}`));
