// Smoke test for the cn() class-name helper — also verifies the Vitest setup
// (config, setupFiles) is wired correctly for the rest of the test suite.
import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins plain string inputs', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('drops falsy conditional inputs', () => {
    expect(cn('px-2', false && 'hidden', undefined, null)).toBe('px-2');
  });

  it('resolves conflicting Tailwind utilities by keeping the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('supports object-map conditional syntax', () => {
    expect(cn('px-2', { 'text-white': true, 'text-black': false })).toBe('px-2 text-white');
  });
});
