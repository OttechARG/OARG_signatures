import { getConnection } from "../../configDB.js";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GraphQLDate } from 'graphql-scalars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del JSON compartido de PDFs firmados
const signedPdfsPath = path.join(__dirname, '../../../signedPdfs.json');

// Función auxiliar para leer JSON
function readSignedPdfs(): Record<string, boolean> {
  if (!fs.existsSync(signedPdfsPath)) return {};
  const data = fs.readFileSync(signedPdfsPath, 'utf-8');
  return JSON.parse(data);
}

// Función auxiliar para guardar JSON
function writeSignedPdfs(data: Record<string, boolean>) {
  fs.writeFileSync(signedPdfsPath, JSON.stringify(data, null, 2));
}

export const remitoResolvers = {
  Date: GraphQLDate,

  Query: {
    async remitos(_: any, { cpy, stofcy, desde }: { cpy: string; stofcy: string; desde?: string }) {
      console.log("Parametros recibidos en resolver remitos:", { cpy, stofcy, desde });
      const pool = await getConnection();
      const result = await pool.request()
        .input("cpy", cpy)
        .input("stofcy", stofcy)
        .input("dlvdat", desde ?? '2022-01-01')
        .query(`
          SELECT TOP 20 CPY_0, DLVDAT_0, STOFCY_0, SDHNUM_0, BPCORD_0, BPDNAM_0
          FROM SDELIVERY
          WHERE DLVDAT_0 > @dlvdat AND CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy
        `);
      console.log("Resultado SQL:", result.recordset);
      return result.recordset;
    },

    // NUEVA QUERY: obtener todos los PDFs firmados
    signedPdfs(): string[] {
      const data = readSignedPdfs();
      return Object.keys(data); // devuelve array de claves firmadas
    },
  },

  Mutation: {
  async subirPdfBase64(_: any, { pdfBase64 }: { pdfBase64: string }) {
    if (!pdfBase64) throw new Error("No se recibió pdfBase64");

    const base64Data = pdfBase64.split(',').pop() ?? pdfBase64;
    const uploadsDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `pdf_${Date.now()}_${Math.floor(Math.random() * 1e6)}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    await fs.promises.writeFile(filePath, base64Data, { encoding: 'base64' });

    const url = `http://localhost:3000/firmar/${fileName}`;
    return { url };
  },

  async signPdf(_: any, { key }: { key: string }) {
    if (!key) throw new Error("Falta key");

    const data = readSignedPdfs();
    data[key] = true;
    writeSignedPdfs(data);

    return true;
  },

  // Si querés mantener el nombre original
  async guardarJsonArchive(_: any, { key, jsonData }: { key: string, jsonData: any }) {
  if (!key) throw new Error("Falta key");
  if (!jsonData) throw new Error("Falta jsonData");

  const data = readSignedPdfs();

  // Guardamos todo el JSON del PDF firmado
  data[key] = jsonData;
  writeSignedPdfs(data);

  return true;
}
}};

export { GraphQLDate };