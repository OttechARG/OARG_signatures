import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as ini from 'ini';
import * as soap from 'soap';
import winston from 'winston';
import { getConnection } from './configDB.js';
import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from "@graphql-tools/schema";
import { companyResolvers } from "./graphql/resolvers/CompanyResolvers.js";
import { facilityResolvers } from "./graphql/resolvers/FacilityResolvers.js";
import { remitoResolvers, GraphQLDate} from "./graphql/resolvers/RemitoResolvers.js"

const app = express();
const PORT = 3000;

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

const logfile = path.join(__dirname, "..", "getrpt.log");

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
app.use('/lib', express.static(path.join(__dirname, '../lib')));
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
    const config = ini.parse(fs.readFileSync(path.join(__dirname, "..", "getrpt.ini"), "utf-8"));

    const options = {
      disableCache: true,
      connection: 'keep-alive'
    };

    let inputXML: string =
      '<PARAM><GRP ID="GRP1">\
					<FLD NAME="PRPT"    	TYPE="Char">ZREMITOAI</FLD>\
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
        logger.error("Error creating SOAP client:", err);
        return res.status(400).json(err);
      }

      client.setSecurity(new soap.BasicAuthSecurity(config.user, config.pass));

      client['run'](query, (err: any, result: any) => {
        if (err) {
          logger.error("Error executing SOAP request:", err);
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

          let item = resvec.find((i: any) => i.attributes?.NAME === 'PRPT64' || i.$?.NAME === 'PRPT64');
          if (!item) {
            throw new Error("PRPT64 field not found in response");
          }

          let pdfBase64 = item.$value || item._;
          if (!pdfBase64) {
            throw new Error("PDF data not found in PRPT64 field");
          }

          // Return JSON with base64 PDF data
          res.status(200).json({
            success: true,
            pdfBase64: pdfBase64,
            filename: PCLE + '.pdf'
          });

        } catch (error) {
          logger.error("Error processing SOAP response:", error);
          res.status(500).json({ message: error });
        }
      });
    });

  } catch (error) {
    logger.error("Error in /proxy-getrpt:", error);
    res.status(500).send("Error en proxy");
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

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log(`GraphQL listo en http://localhost:${PORT}/graphql`);
});
