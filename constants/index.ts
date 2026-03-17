/**
 * Re-export all constants from src/constants so that @/constants resolves correctly.
 * Files in app/ and other directories use `@/constants` which maps to this file.
 */
export * from '../src/constants/index';
