import type { Prisma } from '@prisma/client';

// Customer emails and employee usernames share one login namespace even though
// they live in different tables. Hold this row lock until the surrounding write
// transaction commits so its uniqueness check cannot race another provisioner.
export async function lockLoginNamespace(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`INSERT INTO appmutex (Name) VALUES ('login-namespace') ON DUPLICATE KEY UPDATE Name = Name`;
}
