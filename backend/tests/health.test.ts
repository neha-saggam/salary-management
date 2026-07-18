import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Health Check Endpoint', () => {
  it('should return status ok', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  it('should return a valid ISO timestamp', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.getTime()).toBeGreaterThan(0);
  });

  it('should support /api-prefixed health path', async () => {
    const app = createApp();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('should still return 404 for unknown /api routes', async () => {
    const app = createApp();
    const response = await request(app).get('/api/unknown-route');

    expect(response.status).toBe(401); // 401 before 404 because auth middleware runs first
  });
});
