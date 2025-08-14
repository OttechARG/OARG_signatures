/**
 * Global Test Setup Configuration
 * 
 * This file configures the testing environment to work with browser-specific APIs
 * and sets up necessary mocks for Node.js testing environment.
 * 
 * Key Setup Areas:
 * 1. Environment variables for test mode
 * 2. Browser API mocks (FileReader, Blob, TextEncoder/Decoder)
 * 3. DOM API mocks (window, alert)
 * 4. Console method mocking for cleaner test output
 * 
 * This setup runs before all tests and ensures that:
 * - Browser APIs work in Node.js environment
 * - Tests can simulate file operations
 * - External dependencies are properly mocked
 * - Test output is clean and focused
 */
import { afterAll, beforeAll } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';
import { Blob } from 'buffer';

/**
 * Global Test Environment Setup
 * 
 * Runs once before all test suites to configure the testing environment.
 * Sets up mocks and environment variables needed across all tests.
 */
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Allow self-signed certificates in tests

  // Mock browser APIs for Node.js environment
  // These are needed because our application code uses browser APIs
  // but tests run in Node.js which doesn't have these APIs
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
  (global as any).Blob = Blob;

  /**
   * Mock FileReader API
   * 
   * FileReader is a browser API used to read file contents as Base64.
   * Since Node.js doesn't have FileReader, we create a mock that:
   * 
   * 1. Simulates asynchronous file reading
   * 2. Handles empty files appropriately
   * 3. Returns predictable Base64 data for testing
   * 4. Calls onloadend callback to simulate completion
   * 
   * The mock returns "test content" as Base64 for any non-empty blob,
   * which allows tests to verify the conversion logic without needing
   * actual file reading capabilities.
   */
  (global as any).FileReader = class FileReader {
    readAsDataURL(blob: Blob) {
      // Handle empty files - return empty Base64 data URI
      if (blob.size === 0) {
        this.result = 'data:application/pdf;base64,';
        this.onloadend?.call(this, {} as ProgressEvent);
        return;
      }

      // Mock base64 conversion - always returns "test content" encoded
      // This provides predictable test data regardless of input
      this.result = `data:${blob.type};base64,${Buffer.from('test content').toString('base64')}`;
      
      // Simulate asynchronous behavior with setTimeout
      setTimeout(() => {
        this.onloadend?.call(this, {} as ProgressEvent);
      }, 0);
    }

    result: string | null = null;
    onloadend: ((this: FileReader, ev: ProgressEvent) => any) | null = null;
    onerror: ((this: FileReader, ev: ProgressEvent) => any) | null = null;
  } as any;

  /**
   * Mock Browser DOM APIs
   * 
   * These mocks simulate browser window object and related APIs
   * that the application uses for navigation and user interaction.
   */
  
  // Mock window.location for navigation testing
  // The application uses window.location.href to redirect users to PDF signing interface
  Object.defineProperty(global, 'window', {
    value: {
      location: {
        href: '' // Tests can verify this gets set to the correct URL
      }
    },
    writable: true
  });

  // Mock browser alert function
  // The application uses alert() to notify users of various conditions
  // Mocking prevents actual alert dialogs during testing
  (global as any).alert = jest.fn();

  /**
   * Mock Console Methods
   * 
   * Replaces console methods with Jest mocks to:
   * 1. Prevent noise in test output from application logging
   * 2. Allow tests to verify that logging occurs when expected
   * 3. Keep test output clean and focused on test results
   * 
   * The original console is preserved so Jest can still output test results.
   */
  global.console = {
    ...console,
    log: jest.fn(),    // Mock application info logging
    warn: jest.fn(),   // Mock application warnings
    error: jest.fn(),  // Mock application error logging
  };
});

/**
 * Global Test Cleanup
 * 
 * Runs after all tests complete to clean up mocks and restore
 * original implementations. This prevents test pollution and
 * ensures a clean state for subsequent test runs.
 */
afterAll(async () => {
  // Restore all mocked functions to their original implementations
  jest.restoreAllMocks();
});