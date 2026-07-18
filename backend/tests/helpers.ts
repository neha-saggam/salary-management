import request from 'supertest';
import { Express } from 'express';

/**
 * Obtains a JWT for the default admin seed user.
 * Call this in beforeAll and store the result in a module-level variable.
 */
export async function getAuthToken(app: Express): Promise<string> {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@acme.com', password: 'Admin1234!' });

  if (res.status !== 200) {
    throw new Error(`Auth failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}
