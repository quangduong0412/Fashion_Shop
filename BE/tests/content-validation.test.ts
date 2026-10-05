import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentPage, contactInput, postChanges } from '../src/services/content';

test('CMS accepts canonical fields and preserves omitted media in partial updates', () => {
  assert.deepEqual(postChanges({ title: ' Edited title ' }, true), { TieuDe: 'Edited title' });
  assert.deepEqual(postChanges({ image: '' }, true), { Anh: '' });
  assert.deepEqual(postChanges({ title: ' Article ', description: ' Body ', type: 'Tin tức' }), { TieuDe: 'Article', MoTa: 'Body', TheLoai: 'Tin tức', Anh: '' });
  assert.throws(() => postChanges({ TieuDe: 'Wrong API contract' }));
  assert.throws(() => postChanges({}, true));
});

test('CMS refuses invalid type, oversized body and active or traversal image URLs', () => {
  assert.throws(() => postChanges({ type: 'Invalid' }, true));
  assert.throws(() => postChanges({ description: 'x'.repeat(12001) }, true));
  for (const image of ['javascript:alert(1)', '/images/../private.jpg', 'https://example.invalid/private.svg', 'https://user:password@example.invalid/image.jpg']) assert.throws(() => postChanges({ image }, true));
});

test('contact trims input, normalizes email and limits stored message content', () => {
  assert.deepEqual(contactInput({ name: ' Customer ', email: ' USER@EXAMPLE.INVALID ', message: ' Help ' }), { HoTen: 'Customer', Email: 'user@example.invalid', NoiDung: 'Help' });
  assert.throws(() => contactInput({ name: 'Customer', email: 'invalid', message: 'Help' }));
  assert.throws(() => contactInput({ name: 'Customer', email: 'user@example.invalid', message: 'x'.repeat(5001) }));
  assert.throws(() => contactInput({ name: '', email: 'user@example.invalid', message: 'Help' }));
});

test('content pagination validates limits and refuses arrays or fractional inputs', () => {
  assert.deepEqual(contentPage({}), { page: 1, pageSize: 20, search: '' });
  assert.deepEqual(contentPage({ page: '2', pageSize: '50', search: ' Article ' }), { page: 2, pageSize: 50, search: 'Article' });
  for (const query of [{ page: '0' }, { page: '1.5' }, { pageSize: '51' }, { search: ['x'] }]) assert.throws(() => contentPage(query));
});
