import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = createApp();

afterAll(() => prisma.$disconnect());

describe('Auth Endpoints', () => {
  it('POST /auth/login returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@acme.com', password: 'Admin1234!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role', 'HR_ADMIN');
  });

  it('POST /auth/login returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@acme.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('POST /auth/login returns 401 for unknown user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@acme.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });

  it('POST /auth/login returns 400 when fields missing', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'admin@acme.com' });
    expect(res.status).toBe(400);
  });

  it('GET /employees returns 401 without token', async () => {
    const res = await request(app).get('/employees');
    expect(res.status).toBe(401);
  });

  it('GET /employees returns 200 with valid token', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@acme.com', password: 'Admin1234!' });

    const res = await request(app)
      .get('/employees')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .query({ limit: 1 });

    expect(res.status).toBe(200);
  });

  it('GET /employees returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/employees')
      .set('Authorization', 'Bearer not.a.valid.token');

    expect(res.status).toBe(401);
  });

  it('POST /auth/register returns 403 for HR_MANAGER role', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'hr@acme.com', password: 'HrUser123!' });

    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ email: 'new@acme.com', password: 'Test1234!' });

    expect(res.status).toBe(403);
  });

  it('POST /auth/register creates user for HR_ADMIN', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@acme.com', password: 'Admin1234!' });

    const ts = Date.now();
    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ email: `new-${ts}@acme.com`, password: 'Test1234!', role: 'HR_MANAGER' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(`new-${ts}@acme.com`);
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});
