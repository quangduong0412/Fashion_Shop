import 'dotenv/config';
import prisma from '../src/db';
import { ApiError } from '../src/services/apiErrors';
import { hashPassword } from '../src/services/credentials';
import { createDevelopmentCustomer, developmentCustomerConfig } from '../src/services/developmentCustomer';

export async function provisionDemoCustomer() {
  const customer = developmentCustomerConfig(process.env);
  const hash = await hashPassword(customer.password);
  return prisma.$transaction(tx => createDevelopmentCustomer(tx, customer, hash));
}
if (require.main === module) provisionDemoCustomer().then(result => {
  console.log(result.created ? `Created development customer #${result.id}. Sign in using the email/password supplied in BE/.env.` : `Customer #${result.id} already exists. Password and profile were not changed.`);
}).catch(error => { console.error(error instanceof ApiError ? error.message : 'Demo provisioning failed. Check local configuration; no password was logged.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
