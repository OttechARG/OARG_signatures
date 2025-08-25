# Signatures - PDF Signing System

## Overview
A TypeScript-based PDF signing application that integrates with SAGE X3 ERP system to handle digital document signatures for delivery notes (remitos). The system provides both a web interface and API endpoints for PDF processing, signing, and document management.

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Language**: TypeScript (compiled to ES2020)
- **Database**: MS SQL Server (SAGE X3 integration)
- **GraphQL**: Query and mutation support
- **PDF Processing**: pdf-lib for document manipulation
- **Authentication**: SOAP-based integration with SAGE X3
- **Testing**: Jest with comprehensive coverage
- **Service**: Windows Service support

### Project Structure
```
├── src/                    # TypeScript source code
│   ├── core/              # Core application configuration
│   ├── business/          # Business logic handlers
│   ├── graphql/           # GraphQL schema and resolvers
│   ├── pdf/               # PDF processing and signing
│   ├── ui/                # UI handlers and components
│   ├── types/             # TypeScript type definitions
│   └── server.ts          # Main server entry point
├── lib/                   # Compiled JavaScript output
├── public/                # Static web assets
├── config/                # Standard configurations (distributed with updates)
│   ├── table-defaults.json    # Default table structure & columns
│   ├── visual-defaults.json   # Default visual preferences
│   └── sql-defaults.json      # Default SQL queries
├── specific/              # User-specific configurations
│   ├── table-customizations.json  # User table customizations
│   ├── visual-preferences.json    # User visual preferences
│   └── sql-customizations.json    # User custom SQL queries
├── tests/                 # Jest test suites
├── backup_changes/        # Configuration backups
└── signatures.ini         # Main configuration file
```

## ⚙️ Configuration

### Configuration Architecture
The system uses a two-tier configuration approach:

**Standard Configurations (`config/` folder):**
- `table-defaults.json` - Default table structure and column definitions
- `visual-defaults.json` - Default visual preferences and themes
- `sql-defaults.json` - Default SQL queries and database operations
- These files are distributed with application updates

**User-Specific Configurations (`specific/` folder):**
- `table-customizations.json` - User's table customizations and overrides
- `visual-preferences.json` - User's visual preference overrides  
- `sql-customizations.json` - User's custom SQL queries and database modifications
- These files contain user customizations and are preserved during updates
- **Priority**: User-specific configurations always take precedence over standard configurations

### Main Configuration (`signatures.ini`)
```ini
; Server Configuration
winservice='OARG_signatures'
http_port=3111

; SAGE X3 SOAP Integration
urlsoap='http://172.20.1.69:8124/soap-wsdl/...'
user='EFIRMA'
pass='efirma2025!'

; Database Connection
[db]
server='172.20.1.69'
database='x3db'
user='SGETO'
password='tiger'

; Report Configuration
[rpt]
remito='ZREMITOAI'
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- TypeScript 5.x
- MS SQL Server access
- SAGE X3 ERP system

### Installation
```bash
npm install
```

### Development
```bash
# Build TypeScript
npm run build

# Run application
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch tests during development
npm run test:watch
```

### Available Scripts
- `npm start` - Build and start the server
- `npm run build` - Compile TypeScript to JavaScript
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Main application interface
- `GET /firmar/:archivo` - PDF signing interface
- `POST /proxy-getrpt` - Retrieve PDF from SAGE X3
- `POST /send-signed-pdf` - Upload signed PDF back to SAGE X3
- `GET /test-db` - Database connectivity test

### GraphQL Endpoint
- `POST /graphql` - GraphQL query/mutation endpoint
- `GET /graphql` - GraphiQL interface for development

### Configuration Endpoints (Updated)
- `GET /api/config/table-defaults` - Standard table configuration
- `GET /api/config/table-customizations` - User table customizations
- `POST /api/config/table-customizations` - Update user table customizations
- `GET /api/visual-preferences` - Visual preferences (merged defaults + user)
- `POST /api/visual-preferences` - Update user visual preferences

## 🗃️ Database Integration

### Connection Details
- **Provider**: MS SQL Server
- **Integration**: SAGE X3 ERP system
- **Tables**: COMPANY, FACILITY, SDELIVERY
- **Authentication**: SQL Server authentication

### GraphQL Schema
- **Companies**: Query company information
- **Facilities**: Query facility data by company
- **Remitos**: Dynamic querying with filtering and pagination
- **Dynamic SQL**: Custom user queries merged with required system columns
- **Column Extraction**: Automatic column detection from SQL queries with clean name mapping
- **Mutations**: PDF upload and processing

## 🔧 Development Tools

### TypeScript Configuration
- **Target**: ES2020
- **Module**: ESNext
- **Strict mode**: Enabled
- **ES Module Interop**: Enabled

### Testing Setup
- **Framework**: Jest with ts-jest
- **Environment**: Node.js with browser API mocks
- **Coverage**: Comprehensive coverage reporting
- **Timeout**: 30s for database operations

### File Structure Conventions
- Source code in `src/` (TypeScript)
- Compiled output in `lib/` (JavaScript)
- Tests in `tests/` directory
- Static assets in `public/`
- Standard config in `config/`
- User customizations in `specific/`

## 📝 Features

### PDF Processing
- Digital signature application
- Base64 encoding/decoding
- PDF manipulation with pdf-lib
- Coordinate-based signature placement

### Document Management
- SAGE X3 integration for document retrieval
- Signed PDF upload back to ERP
- Document tracking and logging
- File storage management

### User Interface
- Web-based signing interface
- Dynamic table configuration with drag-and-drop column reordering
- Visual preferences customization with real-time preview
- Responsive design components with ellipsis text overflow
- Priority-based configuration loading (specific overrides standard)

### Security & Logging
- Winston-based logging system
- SOAP authentication with SAGE X3
- TLS configuration handling
- Error tracking and reporting

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run build && npm start
```

### Production Deployment
1. Configure `signatures.ini` with production settings
2. Set up database connections
3. Configure SAGE X3 SOAP endpoints
4. Run as Windows service (optional)

### Service Configuration
The application can run as a Windows service using the `winservice.ts` configuration for production environments.

## 🧪 Testing

### Test Structure
- **Integration Tests**: Database and GraphQL testing
- **Unit Tests**: Individual component testing
- **Setup**: Browser API mocking for Node.js environment

### Running Tests
```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📋 Dependencies

### Core Dependencies
- **express**: Web server framework
- **graphql**: GraphQL implementation
- **pdf-lib**: PDF manipulation
- **mssql**: SQL Server connectivity
- **winston**: Logging framework
- **soap**: SOAP client for SAGE X3

### Development Dependencies
- **typescript**: TypeScript compiler
- **jest**: Testing framework
- **ts-jest**: TypeScript Jest integration
- **@types/***: Type definitions

## 🛠️ Troubleshooting

### Common Issues

**Empty Table Columns:**
- Check column name mapping between SQL results and table configuration
- Verify `extractColumnsFromSQL` returns clean column names (e.g., `XARGTYPCOB_0` not `BPC.XARGTYPCOB_0`)
- Ensure `specific/table-customizations.json` uses correct column keys

**Configuration Not Loading:**
- System prioritizes `specific/` configurations over `config/` defaults
- Check browser console for "🎯 Using specific configuration as primary source"
- Verify configuration files have valid JSON syntax

**Text Overflow Issues:**
- CSS handles text overflow with ellipsis (`...`) automatically
- Check `layout-components.css` for `text-overflow: ellipsis` rules

**SQL Query Issues:**
- User queries are automatically merged with required system columns
- System adds WHERE clauses, pagination, and ORDER BY automatically
- Custom queries only need SELECT and FROM clauses

This README provides comprehensive information for developers working with the signatures system, covering architecture, setup, configuration, and development workflows.