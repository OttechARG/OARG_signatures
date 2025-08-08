import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getConnection } from './configDB.js';
import https from 'https';
import sql from 'mssql';
import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from "@graphql-tools/schema";
import { companyResolvers } from "./graphql/resolvers/CompanyResolvers.js";
import { facilityResolvers } from "./graphql/resolvers/FacilityResolvers.js";
import { remitoResolvers } from "./graphql/resolvers/RemitoResolvers.js";
export const resolvers = {
    Query: {
        ...companyResolvers.Query,
        ...facilityResolvers.Query,
        ...remitoResolvers.Query
    }
};
const app = express();
const PORT = 3000;
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
app.get('/api/companias', async (req, res) => {
    const search = req.query.search || '';
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query('SELECT CPY_0, CPYNAM_0 FROM COMPANY');
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar base de datos' });
    }
});
app.get('/api/facilities', async (req, res) => {
    try {
        const { legcpy } = req.query; // Obtengo el parámetro legcpy desde la query string
        const pool = await getConnection();
        const request = pool.request();
        // Para evitar inyección SQL, usá parámetros en la consulta:
        request.input('legcpyParam', legcpy || 'BP'); // si no envían, usa 'BP' por defecto
        const result = await request.query(`
      SELECT FCY_0, FCYSHO_0 
      FROM FACILITY 
      WHERE WRHFLG_0 = 2 AND LEGCPY_0 = @legcpyParam
    `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar base de datos' });
    }
});
app.get('/api/remitos', async (req, res) => {
    const { cpy, stofcy } = req.query; // Pasamos CPY_0 y STOFCY_0 para filtrar
    if (!cpy || !stofcy) {
        return res.status(400).json({ error: "Parámetros 'cpy' y 'stofcy' son requeridos" });
    }
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('cpy', sql.VarChar, cpy)
            .input('stofcy', sql.VarChar, stofcy)
            .query(`
        SELECT TOP 20 CPY_0, STOFCY_0, SDHNUM_0, BPCORD_0, BPDNAM_0
        FROM SDELIVERY
        WHERE CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy
      `);
        res.json(result.recordset);
    }
    catch (error) {
        console.error('Error al consultar remitos:', error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
app.post('/subir', upload.single('archivo'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No se subió archivo' });
    const urlFirma = `http://localhost:${PORT}/firmar/${req.file.filename}`;
    res.json({ url: urlFirma });
});
app.get('/firmar/:archivo', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'signPDFFromHTTP.html'));
});
// Proxy a servidor externo
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
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
