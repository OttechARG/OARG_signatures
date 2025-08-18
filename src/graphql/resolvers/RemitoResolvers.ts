import { getConnection } from "../../configDB.js";
import { GraphQLDate } from 'graphql-scalars';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const remitoResolvers = {
  Date: GraphQLDate,

  Query: {
    async remitos(_: any, { cpy, stofcy, desde, page = 1, pageSize = 50 }: { 
      cpy: string; 
      stofcy: string; 
      desde?: string; 
      page?: number; 
      pageSize?: number 
    }) {
      console.log("Parametros recibidos en resolver remitos:", { cpy, stofcy, desde, page, pageSize });
      const pool = await getConnection();
      
      // First, get total count
      const countResult = await pool.request()
        .input("cpy", cpy)
        .input("stofcy", stofcy)
        .input("dlvdat", desde ?? '2022-01-01')
        .query(`
          SELECT COUNT(*) as total
          FROM SDELIVERY
          WHERE DLVDAT_0 > @dlvdat AND CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy
        `);
      
      const totalCount = countResult.recordset[0]?.total || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      const offset = (page - 1) * pageSize;
      
      // Then get paginated results
      const result = await pool.request()
        .input("cpy", cpy)
        .input("stofcy", stofcy)
        .input("dlvdat", desde ?? '2022-01-01')
        .input("offset", offset)
        .input("pageSize", pageSize)
        .query(`
          SELECT CPY_0, DLVDAT_0, STOFCY_0, SDHNUM_0, BPCORD_0, BPDNAM_0, XX6FLSIGN_0
          FROM SDELIVERY
          WHERE DLVDAT_0 > @dlvdat AND CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy
          ORDER BY DLVDAT_0 DESC
          OFFSET @offset ROWS
          FETCH NEXT @pageSize ROWS ONLY
        `);
      
      console.log("Resultado SQL:", result.recordset);
      
      return {
        remitos: result.recordset,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
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
    }
  }
};

export { GraphQLDate };