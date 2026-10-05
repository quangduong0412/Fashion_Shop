import test from 'node:test';
import assert from 'node:assert/strict';
import { developmentCustomerConfig } from '../src/services/developmentCustomer';
const config = { NODE_ENV: 'development', ALLOW_DEMO_CUSTOMER: 'true', DATABASE_URL: 'mysql://fixture:fixture@localhost:3306/local_dev', DEMO_CUSTOMER_EMAIL: ' Demo@Example.Invalid ', DEMO_CUSTOMER_PASSWORD: 'SyntheticFixture1!' };

test('demo provisioning requires explicit opt-in and never allows production or test schemas', () => {
  for (const changes of [{ ALLOW_DEMO_CUSTOMER: 'false' }, { NODE_ENV: 'production' }, { NODE_ENV: undefined }, { NODE_ENV: 'test' }, { DATABASE_URL: 'mysql://fixture:fixture@remote.invalid:3306/local_dev' }, { DATABASE_URL: 'mysql://fixture:fixture@localhost:3306/FashionHeaven_test_123_abcd' }, { DATABASE_URL: 'mysql://fixture:fixture@localhost:3306/fashionhaven_test_123_abcd' }, { DATABASE_URL: 'mysql://fixture:fixture@localhost:3306/mysql' }, { DATABASE_URL: 'invalid' }, { DATABASE_URL: 'mysql://fixture:fixture@localhost:3306/' }]) assert.throws(() => developmentCustomerConfig({ ...config, ...changes }));
});
test('demo configuration normalizes email but requires the operator password and valid inputs', () => {
  assert.equal(developmentCustomerConfig(config).email, 'demo@example.invalid');
  assert.equal(developmentCustomerConfig(config).password, config.DEMO_CUSTOMER_PASSWORD);
  for (const changes of [{ DEMO_CUSTOMER_PASSWORD: undefined }, { DEMO_CUSTOMER_PASSWORD: 'short' }, { DEMO_CUSTOMER_PASSWORD: 'ế'.repeat(30) }, { DEMO_CUSTOMER_EMAIL: 'invalid' }]) assert.throws(() => developmentCustomerConfig({ ...config, ...changes }));
});
