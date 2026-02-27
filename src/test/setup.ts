// Global test setup for Vitest
// Import jest-dom matchers for DOM assertions (toBeInTheDocument, toHaveAttribute, etc.)
import '@testing-library/jest-dom';

// Mock DatabaseService globally to prevent sql-wasm.wasm loading errors in tests
import { vi } from 'vitest';

const mockDb = {
  ready: false,
  init: vi.fn(() => Promise.resolve()),
  run: vi.fn(() => Promise.resolve()),
  query: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve(undefined)),
  exec: vi.fn(() => Promise.resolve([])),
};

vi.mock('../services/DatabaseService', () => ({
  databaseService: mockDb,
  default: mockDb,
}));
