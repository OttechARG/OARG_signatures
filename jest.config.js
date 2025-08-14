/**
 * Jest Configuration for PDF Signing Application Tests
 * 
 * This configuration sets up Jest for testing a TypeScript application that uses:
 * - ES modules (import/export syntax)
 * - Browser APIs (FileReader, Blob) that need mocking in Node.js
 * - GraphQL with complex schema validation
 * - Database integration with MS SQL Server
 * - PDF processing and file operations
 * 
 * Key Configuration Areas:
 * 1. TypeScript compilation and ES module support
 * 2. Browser API mocking for Node.js environment
 * 3. Module resolution and path mapping
 * 4. Coverage reporting and collection
 * 5. Test timeout configuration for database operations
 */
export default {
  // Use ts-jest preset optimized for ES modules
  // This handles TypeScript compilation and ES module imports/exports
  preset: 'ts-jest/presets/default-esm',
  
  // Treat .ts files as ES modules (allows import/export syntax)
  extensionsToTreatAsEsm: ['.ts'],
  
  // Use Node.js environment (not browser) but with browser API mocks
  testEnvironment: 'node',
  
  // Directories to search for tests and source files
  // Includes both test directory and src for TypeScript compilation
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  
  // Patterns to identify test files
  // Supports both __tests__ folders and .test/.spec suffixes
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  
  // TypeScript and JavaScript transformation configuration
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', {
      useESM: true, // Enable ES module support
      tsconfig: {
        // TypeScript compiler options for tests
        module: 'es2020',              // Use modern ES modules
        target: 'es2020',              // Target modern JavaScript
        moduleResolution: 'node',       // Use Node.js module resolution
        allowSyntheticDefaultImports: true, // Allow default imports from CommonJS
        esModuleInterop: true,          // Enable interop between ES and CommonJS
        skipLibCheck: true,             // Skip type checking of declaration files
        noImplicitAny: false,          // Allow implicit any for easier testing
        allowJs: true                   // Allow importing JavaScript files
      }
    }]
  },
  
  // Module name mapping for import resolution
  moduleNameMapper: {
    // Handle .js imports in TypeScript (common in ES modules)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Alias for cleaner imports (@/component instead of ../../src/component)
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Only transform certain node_modules files (ES modules)
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))' // Transform .mjs files but not regular node_modules
  ],
  
  // Global test setup file (runs before all tests)
  // Sets up browser API mocks and test environment
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.ts',        // Include all TypeScript source files
    '!src/**/*.d.ts',     // Exclude type definition files
    '!src/global.d.ts'    // Exclude global type definitions
  ],
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Coverage report formats
  coverageReporters: [
    'text',  // Console output
    'lcov',  // For CI/CD tools
    'html'   // HTML report for local viewing
  ],
  
  // Extended timeout for database operations and async tests
  // Database connections and complex operations may take longer
  testTimeout: 30000, // 30 seconds
  
  // Verbose output shows individual test results
  verbose: true,
  
  // File extensions Jest should handle
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']
};