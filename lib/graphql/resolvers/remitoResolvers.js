import { getConnection } from "../../configDB.js";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const remitoResolvers = {
    Query: {
        async remitos(_, { cpy, stofcy }) {
            const pool = await getConnection();
            const result = await pool.request()
                .input("cpy", cpy)
                .input("stofcy", stofcy)
                .query(`
          SELECT TOP 20 CPY_0, STOFCY_0, SDHNUM_0, BPCORD_0, BPDNAM_0
          FROM SDELIVERY
          WHERE CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy
        `);
            return result.recordset;
        }
    }, /*Mutation: {
      async subirPdfBase64(_: any, { pdfBase64 }: { pdfBase64: string }) {
        // Llamamos al endpoint REST que guarda el pdf y devuelve la URL
          console.log("Recibido pdfBase64 tamaño:", pdfBase64.length);
        const response = await fetch('http://localhost:3000/firmar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64 })
        });
  
        if (!response.ok) {
              console.error("Error en POST /firmar:", response.status);
          throw new Error('Error guardando PDF');
        }
  
        const data = await response.json();
        return {
          url: data.url
        };*/
    Mutation: {
        async subirPdfBase64(_, { pdfBase64 }) {
            if (!pdfBase64) {
                throw new Error("No se recibió pdfBase64");
            }
            // Extraer sólo base64 (si viene con data URI)
            const base64Data = pdfBase64.split(',').pop() ?? pdfBase64;
            // Crear carpeta uploads si no existe
            const uploadsDir = path.join(__dirname, '../../../uploads');
            if (!fs.existsSync(uploadsDir))
                fs.mkdirSync(uploadsDir, { recursive: true });
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
