import { describe, it, expect } from 'vitest';

describe('ErrorBoundary Import Test', () => {
  it('should import ErrorBoundary without errors', async () => {
    try {
      const { default: ErrorBoundary } = await import('../components/ErrorBoundary');
      expect(ErrorBoundary).toBeDefined();
      expect(typeof ErrorBoundary).toBe('function');
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  });
});