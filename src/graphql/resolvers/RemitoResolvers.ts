import { getConnection } from "../../configDB.js";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GraphQLDate } from 'graphql-scalars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filterDate = '2025-01-01';
export const remitoResolvers = {
  Date: GraphQLDate,
  Query: {
    async remitos(_: any, { cpy, stofcy }: { cpy: string; stofcy: string }) {
      const pool = await getConnection();
      const result = await pool.request()
        .input("cpy", cpy)
        .input("stofcy", stofcy)
        .input("dlvdat", filterDate) 
        .query(`
          SELECT TOP 20 CPY_0, DLVDAT_0, STOFCY_0, SDHNUM_0, BPCORD_0, BPDNAM_0
          FROM SDELIVERY
          WHERE DLVDAT_0 > @dlvdat AND CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy
        `);
      return result.recordset;
    }
  }, 
      Mutation: {
    async subirPdfBase64(_: any, { pdfBase64 }: { pdfBase64: string }) {
      if (!pdfBase64) {
        throw new Error("No se recibió pdfBase64");
      }

      // Extraer sólo base64 (si viene con data URI)
      const base64Data = pdfBase64.split(',').pop() ?? pdfBase64;

      // Crear carpeta uploads si no existe
      const uploadsDir = path.join(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      // Nombre único para el archivo
      const fileName = `pdf_${Date.now()}_${Math.floor(Math.random() * 1e6)}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      // Guardar archivo como base64
      await fs.promises.writeFile(filePath, base64Data, { encoding: 'base64' });

      // URL pública (ajustar según tu host y puerto)
      const url = `http://localhost:3000/firmar/${fileName}`;

      return { url };
    }
  }
};
export { GraphQLDate };