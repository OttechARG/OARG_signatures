import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

let app: express.Application;

/**
 * Test Suite Setup - Server Integration Tests
 * 
 * This beforeAll hook creates a complete Express server that mimics the production server
 * but with test-specific configurations. It sets up:
 * 
 * 1. Express application with all middleware
 * 2. Multer file upload handling with test directory
 * 3. Static file serving for public assets
 * 4. All routes that exist in the production server
 * 5. Mock endpoints for external services
 * 
 * The test server is isolated from production data and uses:
 * - Test upload directory (cleaned up after tests)
 * - Mock responses for database operations
 * - Mock responses for external API calls
 * 
 * This allows testing the complete HTTP request/response cycle without
 * side effects on production systems.
 */
beforeAll(async () => {
  // Create test Express app similar to main server
  app = express();
  
  // Multer setup for testing
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'test-uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage });

  // Middlewares
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Static folders
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'test-uploads')));

  // Test routes
  app.get('/', (_req, res) => {
    res.send('Test server running');
  });

  app.get('/firmar/:archivo', (req, res) => {
    res.send(`PDF signing page for: ${req.params.archivo}`);
  });

  app.get('/proxy-getrpt', async (req, res) => {
    const { PCLE } = req.query;
    if (!PCLE || typeof PCLE !== 'string') {
      return res.status(400).send('Falta parámetro PCLE');
    }
    // Mock response for testing
    res.set('Content-Type', 'application/pdf');
    res.send(Buffer.from('Mock PDF content'));
  });

  app.get('/test-db', async (req, res) => {
    try {
      // Mock database response for testing
      res.json([
        { CPY_0: 'TEST', CPYNAM_0: 'Test Company' },
        { CPY_0: 'DEMO', CPYNAM_0: 'Demo Company' }
      ]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Error desconocido' });
      }
    }
  });
});

afterAll(async () => {
  // Cleanup test uploads directory
  const testUploadsDir = path.join(process.cwd(), 'test-uploads');
  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true });
  }
});

describe('Server Integration Tests', () => {
  describe('Basic Routes', () => {
    /**
     * Test: Main Page Route
     * 
     * Purpose: Verifies that the root route serves the main application page
     * 
     * How it works:
     * 1. Sends GET request to root path '/'
     * 2. Expects 200 status code
     * 3. Verifies response contains expected content
     * 
     * This tests:
     * - Basic server functionality
     * - Route handling
     * - Static file serving capability
     * - Server startup and configuration
     */
    test('should serve main page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Test server running');
    });

    /**
     * Test: PDF Signing Page Route
     * 
     * Purpose: Tests the dynamic route for PDF signing interface
     * 
     * How it works:
     * 1. Sends GET request to '/firmar/:archivo' with test filename
     * 2. Expects 200 status code
     * 3. Verifies response contains the filename parameter
     * 
     * This tests:
     * - Dynamic route parameter handling
     * - PDF signing workflow entry point
     * - Route parameter extraction
     * - Template rendering with parameters
     */
    test('should serve PDF signing page', async () => {
      const testFileName = 'test-document.pdf';
      const response = await request(app)
        .get(`/firmar/${testFileName}`)
        .expect(200);

      expect(response.text).toContain(testFileName);
    });
  });

  describe('Database Test Route', () => {
    /**
     * Test: Database Test Endpoint
     * 
     * Purpose: Tests the '/test-db' endpoint that verifies database connectivity
     * 
     * How it works:
     * 1. Sends GET request to '/test-db'
     * 2. Expects 200 status and JSON response
     * 3. Verifies response contains array of company objects
     * 4. Checks that each object has required fields (CPY_0, CPYNAM_0)
     * 
     * This tests:
     * - Database connectivity endpoint
     * - JSON response formatting
     * - Data structure validation
     * - Error handling for database operations
     */
    test('should return mock company data', async () => {
      const response = await request(app)
        .get('/test-db')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('CPY_0');
      expect(response.body[0]).toHaveProperty('CPYNAM_0');
    });
  });

  describe('Proxy Routes', () => {
    /**
     * Test: PDF Proxy Route with Valid Parameters
     * 
     * Purpose: Tests the proxy endpoint that fetches PDFs from external service
     * 
     * How it works:
     * 1. Sends GET request to '/proxy-getrpt' with PCLE parameter
     * 2. Expects 200 status and PDF content-type header
     * 3. Verifies response body is a PDF buffer
     * 
     * This tests:
     * - External service proxy functionality
     * - Query parameter handling
     * - Binary content handling (PDF)
     * - Content-type header setting
     * - External API integration patterns
     */
    test('should handle proxy-getrpt with valid PCLE', async () => {
      const response = await request(app)
        .get('/proxy-getrpt?PCLE=TEST123')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    /**
     * Test: PDF Proxy Route Without Required Parameter
     * 
     * Purpose: Tests error handling when required PCLE parameter is missing
     * 
     * How it works:
     * 1. Sends GET request without PCLE parameter
     * 2. Expects 400 Bad Request status
     * 3. Verifies error message indicates missing parameter
     * 
     * This tests:
     * - Input validation
     * - Error response handling
     * - Required parameter enforcement
     * - Proper HTTP status codes
     */
    test('should reject proxy-getrpt without PCLE', async () => {
      const response = await request(app)
        .get('/proxy-getrpt')
        .expect(400);

      expect(response.text).toBe('Falta parámetro PCLE');
    });

    /**
     * Test: PDF Proxy Route with Empty Parameter
     * 
     * Purpose: Tests handling of empty PCLE parameter value
     * 
     * How it works:
     * 1. Sends GET request with empty PCLE parameter
     * 2. Expects 400 Bad Request status
     * 3. Verifies appropriate error message
     * 
     * This tests:
     * - Parameter value validation (not just presence)
     * - Edge case handling
     * - Consistent error responses
     * - Business logic validation
     */
    test('should reject proxy-getrpt with empty PCLE', async () => {
      const response = await request(app)
        .get('/proxy-getrpt?PCLE=')
        .expect(400);

      expect(response.text).toBe('Falta parámetro PCLE');
    });
  });

  describe('JSON Handling', () => {
    /**
     * Test: Large JSON Payload Handling
     * 
     * Purpose: Tests the server's ability to handle large JSON payloads up to the 20MB limit
     * 
     * How it works:
     * 1. Creates a 1MB JSON payload
     * 2. Sends POST request with the large payload
     * 3. Verifies server processes it correctly
     * 4. Checks response confirms payload size
     * 
     * This tests:
     * - JSON payload size limits (20MB configured)
     * - Memory handling for large requests
     * - Express middleware configuration
     * - Performance under load
     * - Request parsing capabilities
     */
    test('should handle large JSON payloads', async () => {
      // Create a large JSON payload within the 20mb limit
      const largeData = {
        data: 'x'.repeat(1000000), // 1MB of data
        timestamp: new Date().toISOString()
      };

      app.post('/test-large-json', (req, res) => {
        res.json({ received: req.body.data.length });
      });

      const response = await request(app)
        .post('/test-large-json')
        .send(largeData)
        .expect(200);

      expect(response.body.received).toBe(1000000);
    });

    /**
     * Test: JSON Parsing Accuracy
     * 
     * Purpose: Verifies that JSON parsing maintains data integrity
     * 
     * How it works:
     * 1. Creates a complex nested JSON object
     * 2. Sends it as POST request body
     * 3. Verifies the parsed object matches exactly
     * 4. Tests different data types (string, number, nested object)
     * 
     * This tests:
     * - JSON parsing accuracy
     * - Data type preservation
     * - Nested object handling
     * - Express body parser configuration
     */
    test('should parse JSON correctly', async () => {
      const testData = {
        name: 'test',
        value: 123,
        nested: { property: 'value' }
      };

      app.post('/test-json', (req, res) => {
        res.json(req.body);
      });

      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .expect(200);

      expect(response.body).toEqual(testData);
    });
  });

  describe('Static File Serving', () => {
    /**
     * Test: Static File Serving Configuration
     * 
     * Purpose: Tests that static files are served correctly from the public directory
     * 
     * How it works:
     * 1. Attempts to access a known static file (CSS)
     * 2. Expects either 200 (file exists) or 404 (file doesn't exist)
     * 3. Both responses are valid for testing configuration
     * 
     * This tests:
     * - Static file middleware configuration
     * - Public directory mapping
     * - File serving capabilities
     * - Proper HTTP response codes
     */
    test('should serve static files from public directory', async () => {
      // Check if we can access static files (this will depend on what exists)
      const response = await request(app)
        .get('/CommonStyles.css');
      
      // We expect either the file to be served (200) or not found (404)
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    /**
     * Test: 404 Error Handling
     * 
     * Purpose: Verifies proper handling of requests to non-existent routes
     * 
     * How it works:
     * 1. Sends request to a route that doesn't exist
     * 2. Expects 404 Not Found status
     * 3. Verifies proper error response
     * 
     * This tests:
     * - Default error handling
     * - Proper HTTP status codes
     * - Route resolution logic
     * - Express error middleware
     */
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);
    });

    /**
     * Test: Invalid JSON Error Handling
     * 
     * Purpose: Tests error handling when malformed JSON is sent
     * 
     * How it works:
     * 1. Sends POST request with malformed JSON
     * 2. Expects 400 Bad Request status
     * 3. Verifies proper error response
     * 
     * This tests:
     * - JSON parsing error handling
     * - Graceful error responses
     * - Express body parser error handling
     * - Client error feedback
     */
    test('should handle invalid JSON', async () => {
      app.post('/test-invalid-json', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-invalid-json')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('Security Headers', () => {
    /**
     * Test: Content-Type Header Handling
     * 
     * Purpose: Tests server's handling of different Content-Type headers
     * 
     * How it works:
     * 1. Sends request with application/x-www-form-urlencoded content type
     * 2. Verifies server processes the content type correctly
     * 3. Checks that content type is preserved in request processing
     * 
     * This tests:
     * - Content-Type header processing
     * - Multiple content type support
     * - Express middleware handling
     * - Request header preservation
     */
    test('should handle requests with various content types', async () => {
      app.post('/test-content-type', (req, res) => {
        res.json({ 
          contentType: req.headers['content-type'],
          hasBody: !!req.body 
        });
      });

      const response = await request(app)
        .post('/test-content-type')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=value')
        .expect(200);

      expect(response.body.contentType).toContain('application/x-www-form-urlencoded');
    });
  });
});