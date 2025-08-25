import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as ini from 'ini';
import * as soap from 'soap';
import winston from 'winston';
import { getConnection, report } from './core/AppConfig.js';
import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from "@graphql-tools/schema";
import { companyResolvers } from "./graphql/resolvers/CompanyResolvers.js";
import { facilityResolvers } from "./graphql/resolvers/FacilityResolvers.js";
import { remitoResolvers, GraphQLDate} from "./graphql/resolvers/RemitoResolvers.js"

const app = express();
let config = ini.parse(fs.readFileSync("signatures.ini", "utf-8"));

// In-memory storage for PDF data
const pdfMemoryStore = new Map<string, Buffer>();

export const resolvers = {
  Date: GraphQLDate,
  Query: {
    ...companyResolvers.Query,
    ...facilityResolvers.Query,
    ...remitoResolvers.Query
  },
  Mutation:{
    ...remitoResolvers.Mutation
  }
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logfile = path.join(__dirname, "..", "signatures.log");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json(), winston.format.prettyPrint()),
  transports: [
    new winston.transports.File({ filename: logfile, tailable: true }),
  ],
});

// Multer setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

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
app.use(express.static(path.join(__dirname, '../public')));
app.use('/lib', express.static(path.join(__dirname, '.')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public', 'signMain.html'));
});

app.use(express.json({ limit: '50mb' }));

app.get('/firmar/:archivo', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public', 'signPDFFromHTTP.html'));
});

app.get("/proxy-getrpt", async (req: Request, res: Response) => {
  const { PRPT, POBJ, POBJORI, PCLE, WSIGN, PIMPRIMANTE } = req.query;

  if (!PRPT || !POBJ || !POBJORI || !PCLE || !WSIGN || !PIMPRIMANTE) {
    return res.status(400).send('Faltan parametros');
  }

  try {
    const config = ini.parse(fs.readFileSync(path.join(__dirname, "..", "signatures.ini"), "utf-8"));

    const options = {
      disableCache: true,
      connection: 'keep-alive'
    };

    let inputXML: string =
      '<PARAM><GRP ID="GRP1">\
					<FLD NAME="PRPT"    	TYPE="Char">' + report.remito + '</FLD>\
          <FLD NAME="PIMPRIMANTE"  TYPE="Char">WSPRINT</FLD>\
          <FLD NAME="POBJ"    	TYPE="Char">SDH</FLD>\
					<FLD NAME="POBJORI" 	TYPE="Char">SDH</FLD>\
					<FLD NAME="PCLE" 		TYPE="Char">' + PCLE + '</FLD>\
					<FLD NAME="WSIGN" 		TYPE="Char">2</FLD>\
        </GRP></PARAM>';

    let query = {
      PRPT,
      POBJ, 
      POBJORI,
      PCLE,
      WSIGN,
      PIMPRIMANTE,
      callContext: {
        codeLang: config.codeLang,
        poolAlias: config.poolAlias
      },
      publicName: config.publicName,
      inputXml: '<![CDATA[' + inputXML + ']]>'
    };

    soap.createClient(config.urlsoap, options, (err: any, client: any) => {
      if (err) {
        logger.error("Error al crear el cliente SOAP:", err);
        return res.status(400).json(err);
      }

      client.setSecurity(new soap.BasicAuthSecurity(config.user, config.pass));

      client['run'](query, (err: any, result: any) => {
        if (err) {
          logger.error("Error al ejecutar la petición SOAP:", err);
          return res.status(500).send('error');
        }

        try {
          console.log("=== SOAP RESPONSE STRUCTURE ===");
          console.log(JSON.stringify(result, null, 2));
          console.log("=== END SOAP RESPONSE ===");
          logger.info("SOAP response logged to console");
          
          // Try to navigate the response structure more safely
          let resvec;
          if (result?.runReturn?.resultXml?.$value?.RESULT?.GRP?.FLD) {
            resvec = result.runReturn.resultXml.$value.RESULT.GRP.FLD;
          } else if (result?.runReturn?.resultXml?.RESULT?.GRP?.FLD) {
            resvec = result.runReturn.resultXml.RESULT.GRP.FLD;
          } else {
            throw new Error("Unexpected SOAP response structure");
          }

          let pdfItem = resvec.find((i: any) => i.attributes?.NAME === 'PRPT64' || i.$?.NAME === 'PRPT64');
          if (!pdfItem) {
            throw new Error("PRPT64 field not found in response");
          }

          let pdfBase64 = pdfItem.$value || pdfItem._;
          if (!pdfBase64) {
            throw new Error("PDF data not found in PRPT64 field");
          }

          // Extract coordinates if available
          let coordinates = null;
          console.log("=== SEARCHING FOR PXY FIELD ===");
          console.log("Available fields:", resvec.map((i: any) => i.attributes?.NAME || i.$?.NAME));
          
          let coordItem = resvec.find((i: any) => (i.attributes?.NAME === 'PXY' || i.$?.NAME === 'PXY'));
          console.log("PXY item found:", coordItem);
          
          if (coordItem) {
            const coordValue = coordItem.$value || coordItem._;
            console.log("PXY value:", coordValue);
            if (coordValue) {
              try {
                // Clean up malformed JSON by removing extra commas
                const cleanedValue = coordValue.replace(/\":\",\"/g, '":"').replace(/\":\"?,/g, '":"');
                console.log("Cleaned JSON:", cleanedValue);
                coordinates = JSON.parse(cleanedValue);
                console.log("Parsed coordinates:", coordinates);
              } catch (e) {
                console.warn("Could not parse coordinates:", e);
              }
            }
          } else {
            console.log("PXY field not found in response");
          }

          // Return JSON with base64 PDF data and coordinates
          res.status(200).json({
            success: true,
            pdfBase64: pdfBase64,
            coordinates: coordinates,
            filename: PCLE + '.pdf'
          });

        } catch (error) {
          logger.error("Error al procesar la respuesta SOAP:", error);
          res.status(500).json({ message: error });
        }
      });
    });

  } catch (error) {
    logger.error("Error in /proxy-getrpt:", error);
    res.status(500).send("Error en proxy");
  }
});

app.post("/send-signed-pdf", async (req: Request, res: Response) => {
  const { NREMITO, PRPT64 } = req.body;
  if (!NREMITO || !PRPT64) {
    return res.status(400).json({ error: 'NREMITO and PRPT64 are required' });
  }

  try {
    const config = ini.parse(fs.readFileSync(path.join(__dirname, "..", "signatures.ini"), "utf-8"));

    const options = {
      disableCache: true,
      connection: 'keep-alive'
    };

    // Hardcoded values as per boss requirements
    const PABREV = "SDH"; // hardcoded
    const PVOL = "ADJUNTOS"; // from settings (private, not for user)
    const PTYP = "PDF"; // constant
    const PCAT = "1"; // constant
    const PMOTCLE1 = "";
    const PMOTCLE2 = "";
    const PMOTCLE3 = "";
    const PMOTCLE4 = "";
    const PMOTCLE5 = "";
    const PNAM = `${NREMITO}_signed`; // N°Remito_signed without extension
    const PIDENT1 = NREMITO; // NREMITO
    const PIDENT2 = "";
    const PIDENT3 = "SIGN"; // constant

    let inputXML: string =
      `<PARAM>
        <GRP ID="GRP1">
          <FLD NAME="PABREV"    TYPE="Char">${PABREV}</FLD>
          <FLD NAME="PVOL"      TYPE="Char">${PVOL}</FLD>
          <FLD NAME="PTYP"      TYPE="Char">${PTYP}</FLD>
          <FLD NAME="PCAT"      TYPE="Char">${PCAT}</FLD>
          <FLD NAME="PMOTCLE1"  TYPE="Char">${PMOTCLE1}</FLD>
          <FLD NAME="PMOTCLE2"  TYPE="Char">${PMOTCLE2}</FLD>
          <FLD NAME="PMOTCLE3"  TYPE="Char">${PMOTCLE3}</FLD>
          <FLD NAME="PMOTCLE4"  TYPE="Char">${PMOTCLE4}</FLD>
          <FLD NAME="PMOTCLE5"  TYPE="Char">${PMOTCLE5}</FLD>
          <FLD NAME="PNAM"      TYPE="Char">${PNAM}</FLD>
          <FLD NAME="PIDENT1"   TYPE="Char">${PIDENT1}</FLD>
          <FLD NAME="PIDENT2"   TYPE="Char">${PIDENT2}</FLD>
          <FLD NAME="PIDENT3"   TYPE="Char">${PIDENT3}</FLD>
          <FLD NAME="PRPT64"    TYPE="Char">${PRPT64}</FLD>
        </GRP>
      </PARAM>`;
    let query = {
      callContext: {
        codeLang: config.codeLang,
        poolAlias: config.poolAlias,
        poolId: "",
        requestConfig: "adxwss.beautify=true"
      },
      publicName: "XX6FLAOX", // Different from the get method
      inputXml: '<![CDATA[' + inputXML + ']]>'
    };

    soap.createClient(config.urlsoap, options, (err: any, client: any) => {
      if (err) {
        logger.error("Error al crear el cliente SOAP para send-signed-pdf:", err);
        return res.status(400).json({ error: "Error al crear el cliente SOAP", details: err });
      }

      client.setSecurity(new soap.BasicAuthSecurity(config.user, config.pass));

      client['run'](query, (err: any, result: any) => {
        if (err) {
          logger.error("Error al ejecutar la petición SOAP para send-signed-pdf:", err);
          return res.status(500).json({ error: "Error en la petición SOAP", details: err });
        }

        try {
          console.log("=== SEND SIGNED PDF SOAP RESPONSE ===");
          console.log(JSON.stringify(result, null, 2));
          console.log("=== END RESPONSE ===");
          logger.info("Send signed PDF SOAP response logged");

          res.status(200).json({
            success: true,
            message: "Signed PDF sent successfully",
            remito: NREMITO,
            response: result
          });

        } catch (error) {
          logger.error("Error al procesar la respuesta del PDF firmado:", error);
          res.status(500).json({ error: "Error al procesar la respuesta", details: error });
        }
      });
    });

  } catch (error) {
    logger.error("Error en /send-signed-pdf:", error);
    res.status(500).json({ error: "Error interno del servidor", details: error });
  }
});

app.get('/test-db', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT TOP 5 * FROM COMPANY'); 
    res.json(result.recordset);
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Error desconocido' });
    }
  }
});


const schemaString = fs.readFileSync(path.join(process.cwd(), "src/graphql/schemas/types.graphql"), "utf-8");

const schema = makeExecutableSchema({
  typeDefs: schemaString,
  resolvers
});


app.use("/graphql", graphqlHTTP({
  schema,
  graphiql: true, // habilita interfaz para pruebas
}));

// Report configuration endpoint for frontend
app.get('/api/config/report', (req: Request, res: Response) => {
  res.json({ report });
});

// Check if client IP matches server IP
app.get('/api/ip-match', (req: Request, res: Response) => {
  try {
    // Get client IP
    let clientIP = '127.0.0.1'; // default fallback
    
    if (req.ip) {
      clientIP = req.ip;
    } else if (req.headers['x-forwarded-for']) {
      const forwardedIps = (req.headers['x-forwarded-for'] as string).split(',');
      clientIP = forwardedIps[0].trim();
    } else if (req.connection && req.connection.remoteAddress) {
      clientIP = req.connection.remoteAddress;
    } else if ((req as any).socket && (req as any).socket.remoteAddress) {
      clientIP = (req as any).socket.remoteAddress;
    }
    
    // Use require for synchronous import
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let serverIPs: string[] = [];
    
    // Get all network interface IPs
    try {
      Object.keys(networkInterfaces).forEach(interfaceName => {
        const addresses = networkInterfaces[interfaceName];
        if (addresses) {
          addresses.forEach((address: any) => {
            if (!address.internal && address.family === 'IPv4') {
              serverIPs.push(address.address);
            }
          });
        }
      });
    } catch (interfaceError) {
      logger.warn('Error reading network interfaces:', interfaceError);
    }
    
    // Always add localhost variants
    serverIPs.push('127.0.0.1', '::1', 'localhost');
    
    // Normalize client IP (remove IPv6 prefix if present)
    const normalizedClientIP = clientIP.replace(/^::ffff:/, '');
    
    // Check if client IP matches any server IP
    const isMatch = serverIPs.includes(normalizedClientIP) || 
                    serverIPs.includes(clientIP);
    
    logger.info(`IP match check - Client: ${clientIP}, Normalized: ${normalizedClientIP}, ServerIPs: ${serverIPs.join(',')}, Match: ${isMatch}`);
    
    res.json({ 
      isMatch,
      clientIP: normalizedClientIP,
      serverIPs: serverIPs,
      debug: {
        originalClientIP: clientIP,
        normalizedClientIP: normalizedClientIP,
        serverNetworkIPs: serverIPs.filter(ip => ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost')
      }
    });
    
  } catch (error) {
    logger.error('Error in IP match endpoint:', error);
    // Fallback for any error - just check if it's localhost
    const clientIP = req.ip || '127.0.0.1';
    const normalizedClientIP = clientIP.replace(/^::ffff:/, '');
    const isLocalhost = normalizedClientIP === '127.0.0.1' || clientIP === '127.0.0.1' || 
                       normalizedClientIP === 'localhost' || clientIP === 'localhost' ||
                       normalizedClientIP === '::1' || clientIP === '::1';
    
    res.json({ 
      isMatch: isLocalhost,
      clientIP: normalizedClientIP,
      serverIPs: ['127.0.0.1'],
      error: 'Fallback mode - localhost only'
    });
  }
});

// Visual preferences endpoints
app.get('/api/visual-preferences', (req: Request, res: Response) => {
  try {
    // Load defaults from config folder
    const defaultsPath = path.join(__dirname, '..', 'config', 'visual-defaults.json');
    const specificPath = path.join(__dirname, '..', 'specific', 'visual-preferences.json');
    
    let preferences = {};
    
    // Load defaults
    if (fs.existsSync(defaultsPath)) {
      const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
      preferences = defaults.visualPreferences;
    } else {
      // Fallback hardcoded defaults
      preferences = {
        theme: 'default',
        background: 'white',
        backgroundImage: null,
        customLogo: null,
        customThemeColor: null,
        customBackgroundColor: null,
        pageSize: 50
      };
    }
    
    // Override with user-specific preferences
    if (fs.existsSync(specificPath)) {
      const specific = JSON.parse(fs.readFileSync(specificPath, 'utf-8'));
      preferences = { ...preferences, ...specific.visualPreferences };
    }
    
    res.json(preferences);
  } catch (error) {
    logger.error('Error al cargar las preferencias visuales:', error);
    res.status(500).json({ error: 'Error al cargar las preferencias visuales' });
  }
});

app.post('/api/visual-preferences', (req: Request, res: Response) => {
  try {
    const configPath = path.join(__dirname, '..', 'specific', 'visual-preferences.json');
    const configDir = path.dirname(configPath);
    const preferences = req.body;
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const config = {
      version: '1.0.0',
      visualPreferences: preferences,
      metadata: {
        lastModified: new Date().toISOString(),
        createdAt: fs.existsSync(configPath) ? 
          (JSON.parse(fs.readFileSync(configPath, 'utf-8')).metadata?.createdAt || new Date().toISOString()) : 
          new Date().toISOString()
      }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info('Visual preferences saved successfully');
    res.json({ success: true, message: 'Visual preferences saved' });
  } catch (error) {
    logger.error('Error al guardar las preferencias visuales:', error);
    res.status(500).json({ error: 'Error al guardar las preferencias visuales' });
  }
});

// Client Table Configuration API endpoints
app.get('/api/config/table-defaults', (req: Request, res: Response) => {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'table-defaults.json');
    console.log('Looking for table-defaults.json at:', configPath);
    console.log('File exists:', fs.existsSync(configPath));
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      res.json(config);
    } else {
      logger.warn('table-defaults.json not found at:', configPath);
      res.status(404).json({ error: 'Default table configuration not found', path: configPath });
    }
  } catch (error) {
    logger.error('Error al cargar la configuración estándar de tabla:', error);
    res.status(500).json({ error: 'Error al cargar la configuración estándar' });
  }
});

app.get('/api/config/table-customizations', (req: Request, res: Response) => {
  try {
    const configPath = path.join(__dirname, '..', 'specific', 'table-customizations.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      res.json(config);
    } else {
      // Return default empty customizations
      const defaultConfig = {
        version: "1.0",
        lastModified: new Date().toISOString(),
        table: {
          customColumns: [],
          columnOverrides: {},
          customFilters: [],
          settings: {}
        }
      };
      res.json(defaultConfig);
    }
  } catch (error) {
    logger.error('Error al cargar las customizaciones de tabla:', error);
    res.status(500).json({ error: 'Error al cargar las customizaciones' });
  }
});

app.post('/api/config/table-customizations', (req: Request, res: Response) => {
  try {
    const configPath = path.join(__dirname, '..', 'specific', 'table-customizations.json');
    const configDir = path.dirname(configPath);
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const config = req.body;
    config.lastModified = new Date().toISOString();
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info('Table customizations saved successfully');
    res.json({ success: true, message: 'Customizations saved successfully' });
  } catch (error) {
    logger.error('Error al guardar las customizaciones de tabla:', error);
    res.status(500).json({ error: 'Error al guardar las customizaciones' });
  }
});

app.listen(config.http_port, () => {
  console.log(`Servidor en http://localhost:${config.http_port}`);
  console.log(`GraphQL listo en http://localhost:${config.http_port}/graphql`);
});
