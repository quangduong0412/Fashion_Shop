import { createHmac } from 'crypto';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config';
import type { PrincipalRole } from './access';

export type Principal = { id: number; email: string; role: PrincipalRole };
export const sessionVersion = (passwordHash: string, epoch = 0) => createHmac('sha256', jwtSecret()).update(`${passwordHash}:${epoch}`).digest('hex');
export const sessionOptions = { issuer: 'fashion-haven', audience: 'fashion-haven-clients' };
export function issueToken(principal: Principal, passwordHash: string, epoch = 0) {
  return jwt.sign({ ...principal, sessionVersion: sessionVersion(passwordHash, epoch) }, jwtSecret(), {
    ...sessionOptions, algorithm: 'HS256', expiresIn: principal.role === 'user' ? '7d' : '1d'
  });
}
