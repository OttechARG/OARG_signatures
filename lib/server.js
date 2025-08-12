import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getConnection } from './configDB.js';
import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from "@graphql-tools/schema";
import { companyResolvers } from "./graphql/resolvers/CompanyResolvers.js";
import { facilityResolvers } from "./graphql/resolvers/FacilityResolvers.js";
import { remitoResolvers } from "./graphql/resolvers/RemitoResolvers.js";
const app = express();
const PORT = 3000;
export const resolvers = {
    Query: {
        ...companyResolvers.Query,
        ...facilityResolvers.Query,
        ...remitoResolvers.Query
    },
    Mutation: {
        ...remitoResolvers.Mutation
    }
};
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Multer setup
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir))
            fs.mkdirSync(uploadsDir);
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
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'signMain.html'));
});
app.use(express.json({ limit: '50mb' }));
app.get('/firmar/:archivo', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'signPDFFromHTTP.html'));
});
app.get("/proxy-getrpt", async (req, res) => {
    const { PCLE } = req.query;
    if (!PCLE || typeof PCLE !== "string") {
        return res.status(400).send("Falta parámetro PCLE");
    }
    const url = `http://localhost:3111/getrpt/getrpt?PRPT=ZREMITOAI&POBJ=SDH&POBJORI=SDH&PCLE=${encodeURIComponent(PCLE)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).send(response.statusText);
        }
        // Leer como buffer para datos binarios (PDF)
        const buffer = await response.arrayBuffer();
        // Setear header correcto para PDF
        res.set("Content-Type", "application/pdf");
        // Enviar el buffer como respuesta
        res.send(Buffer.from(buffer));
    }
    catch (error) {
        console.error("Error proxy /proxy-getrpt:", error);
        res.status(500).send("Error en proxy");
    }
});
app.get('/test-db', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT TOP 5 * FROM COMPANY');
        res.json(result.recordset);
    }
    catch (err) {
        if (err instanceof Error) {
            res.status(500).json({ error: err.message });
        }
        else {
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
