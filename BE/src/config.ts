import 'dotenv/config';

export function jwtSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters. See BE/.env.example.');
  return value;
}
