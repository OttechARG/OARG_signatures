# Integration Tests - Comprehensive Documentation

This directory contains a complete integration test suite for the PDF signing application, providing end-to-end testing of all major system components and workflows.

## Overview

The test suite validates the entire application stack:
- **Frontend**: PDF processing, file handling, user interface interactions
- **Backend**: Express server, GraphQL API, routing, middleware
- **Database**: MS SQL Server integration, business logic queries, data validation
- **Integration**: External service proxies, file upload workflows, error handling

## Test Setup and Configuration

### Prerequisites and Installation
```bash
# Install all dependencies including test frameworks
npm install

# Build TypeScript source (required for some tests)
npm run build
```

### Test Execution Commands
```bash
# Run complete test suite (all 48 tests)
npm test

# Run tests in watch mode for development
# Automatically re-runs tests when files change
npm run test:watch

# Run tests with detailed coverage analysis
# Generates HTML, LCOV, and console coverage reports
npm run test:coverage
```

## Detailed Test Structure

### `integration/graphql.test.ts` - GraphQL API Integration
**Purpose**: Validates the GraphQL API layer that serves as the primary data interface

**Key Test Areas**:
- **Company Queries**: Tests business entity retrieval with optional search filtering
- **Facility Queries**: Tests location/facility data filtered by company relationships  
- **Remito Queries**: Tests delivery document retrieval with complex multi-parameter filtering (company, facility, date ranges)
- **PDF Upload Mutations**: Tests file upload workflow with Base64 encoding and URL generation
- **Schema Validation**: Tests GraphQL type safety, required arguments, and error handling

**Technical Details**:
- Uses mock resolvers to simulate database responses without requiring live DB
- Tests actual GraphQL schema from `types.graphql` for schema validation
- Validates business logic query patterns used throughout the application
- Tests error handling for malformed queries and missing parameters

### `integration/server.test.ts` - Express Server Integration  
**Purpose**: Tests the HTTP server layer, routing, middleware, and request/response handling

**Key Test Areas**:
- **Route Handling**: Tests main application routes (`/`, `/firmar/:archivo`) and parameter extraction
- **Static File Serving**: Tests public asset delivery and file system integration
- **Proxy Routes**: Tests external PDF retrieval proxy (`/proxy-getrpt`) with parameter validation
- **JSON Processing**: Tests large payload handling (up to 20MB) and parsing accuracy
- **Error Handling**: Tests 404 responses, invalid JSON handling, and error middleware

**Technical Details**:
- Creates isolated Express server instance for testing
- Uses temporary directories for file upload testing (cleaned up automatically)
- Tests middleware configuration including CORS, body parsing, and security headers
- Validates production-like request/response patterns

### `integration/pdf-processing.test.ts` - PDF Processing Workflow
**Purpose**: Tests the core PDF handling functionality that drives the application's main workflow

**Key Test Areas**:
- **Base64 Conversion**: Tests browser FileReader API simulation for file encoding
- **GraphQL Integration**: Tests PDF upload mutations with error handling and response parsing
- **Document Recovery**: Tests retry mechanisms for external PDF retrieval with timeout handling
- **Format Validation**: Tests PDF magic number detection and file type validation
- **Error Resilience**: Tests network failure handling, malformed data handling, and recovery strategies

**Technical Details**:
- Uses sophisticated browser API mocks (FileReader, Blob) for Node.js environment
- Tests complete PDF processing pipeline from upload to signing interface
- Validates retry logic with exponential backoff for external service calls
- Tests integration between frontend file handling and backend processing

### `integration/database.test.ts` - Database Integration
**Purpose**: Tests real database connectivity and business logic queries against MS SQL Server

**Key Test Areas**:
- **Connection Management**: Tests database connectivity, connection pooling, and error handling
- **Business Queries**: Tests CRUD operations on COMPANY, FACILITY, and SDELIVERY tables
- **Security**: Tests SQL injection prevention and parameter binding safety
- **Concurrency**: Tests concurrent database access patterns and connection reuse
- **Data Validation**: Tests business logic constraints and data integrity

**Technical Details**:
- Connects to actual MS SQL Server instance (172.20.1.69/x3db/sage)
- Uses parameterized queries to prevent SQL injection
- Gracefully skips tests if database is unavailable (CI/CD friendly)
- Tests actual business queries used by GraphQL resolvers
- Validates connection pool efficiency and resource management

## Test Configuration Deep Dive

### `jest.config.js` - Testing Framework Configuration
**Purpose**: Configures Jest for complex TypeScript/ES Module/Browser API testing

**Key Configurations**:
- **ES Module Support**: Handles `import/export` syntax in TypeScript
- **Browser API Mocking**: Transforms Node.js environment to support browser APIs
- **TypeScript Integration**: Compiles TypeScript on-the-fly with proper module resolution
- **Coverage Collection**: Tracks code coverage across all source files
- **Timeout Management**: 30-second timeout for database operations

**Technical Details**:
- Uses `ts-jest` with ES module preset for modern JavaScript support
- Module name mapping handles `.js` imports in TypeScript files
- Transform ignore patterns ensure proper handling of ES modules in node_modules
- Coverage excludes type definition files but includes all business logic

### `setup.ts` - Global Test Environment Setup
**Purpose**: Configures Node.js environment to simulate browser capabilities

**Mock Implementations**:
- **FileReader**: Simulates asynchronous file reading with predictable Base64 output
- **Blob**: Provides browser-compatible Blob API using Node.js Buffer
- **Window/DOM**: Mocks `window.location`, `alert()`, and other browser globals
- **Console**: Replaces console methods to prevent noise in test output

**Environmental Setup**:
- Sets `NODE_ENV=test` for application test mode detection
- Configures SSL certificate handling for development environments
- Initializes all browser API mocks before any tests run
- Provides cleanup hooks to restore original implementations

## Mock Data and Test Isolation

### Database Mocking Strategy
- **Integration Tests**: Use real database with read-only operations
- **GraphQL Tests**: Use mock resolvers with predictable test data
- **Graceful Degradation**: Skip database tests if connection unavailable
- **Safe Operations**: Only perform SELECT queries, no data modification

### File System Isolation
- **Temporary Directories**: Tests create isolated upload directories
- **Automatic Cleanup**: All temporary files removed after test completion
- **No Production Impact**: Tests never modify production file locations

### Network Mocking
- **HTTP Mocks**: External API calls use Jest mocks with controlled responses
- **Timeout Simulation**: Tests can simulate network timeouts and failures
- **Retry Testing**: Validates application resilience to network issues

## Coverage Analysis and Reporting

### Coverage Collection
```bash
# Generate comprehensive coverage report
npm run test:coverage
```

**Coverage Targets**:
- **Source Files**: All TypeScript files in `src/` directory
- **Exclusions**: Type definitions (`.d.ts`) and test files
- **Metrics**: Line, branch, function, and statement coverage

**Report Formats**:
- **Console**: Immediate feedback during test runs
- **HTML**: Detailed interactive coverage browser (`coverage/index.html`)
- **LCOV**: Machine-readable format for CI/CD integration

### Coverage Interpretation
- **Line Coverage**: Percentage of executed code lines
- **Branch Coverage**: Percentage of conditional branches tested
- **Function Coverage**: Percentage of functions called during tests
- **Statement Coverage**: Percentage of JavaScript statements executed

## CI/CD Integration and Production Readiness

### Pipeline Compatibility
- **Environment Agnostic**: Tests adapt to available resources (database, external services)
- **No External Dependencies**: Can run completely offline with mocks
- **Deterministic Results**: Tests produce consistent results across environments
- **Parallel Execution**: Safe for concurrent test execution

### Production Safety
- **Read-Only Operations**: Database tests never modify production data
- **Isolated Resources**: Tests use separate directories and mock services
- **Error Handling**: Tests validate error scenarios without causing system failures
- **Resource Cleanup**: All temporary resources cleaned up automatically

### Performance Considerations
- **Database Timeouts**: 30-second timeout accommodates slow connections
- **Connection Pooling**: Tests validate efficient database connection reuse
- **Memory Management**: Large payload tests ensure proper memory handling
- **Concurrent Access**: Tests validate system behavior under concurrent load

## Test Development Guidelines

### Adding New Tests
1. **Identify Test Category**: Determine if test belongs in GraphQL, server, PDF, or database suite
2. **Follow Naming Convention**: Use descriptive names that explain the test purpose
3. **Add Detailed Comments**: Include comprehensive comments explaining test logic
4. **Handle Edge Cases**: Test both success and failure scenarios
5. **Clean Up Resources**: Ensure tests clean up any created resources

### Debugging Test Failures
1. **Check Environment**: Verify database connectivity and required services
2. **Review Logs**: Examine console output for specific error messages
3. **Isolate Tests**: Run individual test suites to identify specific failures
4. **Validate Mocks**: Ensure mock data matches expected application behavior

This comprehensive test suite ensures the PDF signing application is robust, reliable, and ready for production deployment.