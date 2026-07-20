import { createApp } from './app.js';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3000;
const app = createApp();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api|\/health).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
