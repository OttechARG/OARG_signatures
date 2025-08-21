import { getConnection } from "../../core/configDB.js";
import { GraphQLDate } from 'graphql-scalars';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const remitoResolvers = {
    Date: GraphQLDate,
    Query: {
        async remitos(_, { cpy, stofcy, desde, page = 1, pageSize = 50, firmadoFilter, remitoFilter, fechaFilter, codigoFilter, razonFilter }) {
            console.log("Parametros recibidos en resolver remitos:", { cpy, stofcy, desde, page, pageSize, firmadoFilter, remitoFilter, fechaFilter, codigoFilter, razonFilter });
            const pool = await getConnection();
            // Build WHERE clause with optional filters
            let whereClause = "WHERE DLVDAT_0 > @dlvdat AND CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy";
            // Firmado filter
            if (firmadoFilter === "no-firmados") {
                whereClause += " AND XX6FLSIGN_0 != 2";
            }
            else if (firmadoFilter === "si-firmados") {
                whereClause += " AND XX6FLSIGN_0 = 2";
            }
            // Text filters (case insensitive)
            if (remitoFilter) {
                whereClause += " AND UPPER(CAST(SDHNUM_0 AS NVARCHAR)) LIKE UPPER(@remitoFilter)";
            }
            if (fechaFilter) {
                whereClause += " AND CAST(DLVDAT_0 AS NVARCHAR) LIKE @fechaFilter";
            }
            if (codigoFilter) {
                whereClause += " AND BPCORD_0 LIKE @codigoFilter";
            }
            if (razonFilter) {
                whereClause += " AND UPPER(BPDNAM_0) LIKE UPPER(@razonFilter)";
            }
            // First, get total count
            const countRequest = pool.request()
                .input("cpy", cpy)
                .input("stofcy", stofcy)
                .input("dlvdat", desde ?? '2022-01-01');
            // Add text filter parameters if provided
            if (remitoFilter) {
                countRequest.input("remitoFilter", `%${remitoFilter}%`);
            }
            if (fechaFilter) {
                countRequest.input("fechaFilter", `%${fechaFilter}%`);
            }
            if (codigoFilter) {
                countRequest.input("codigoFilter", `%${codigoFilter}%`);
            }
            if (razonFilter) {
                countRequest.input("razonFilter", `%${razonFilter}%`);
            }
            const countResult = await countRequest.query(`
        SELECT COUNT(*) as total
        FROM SDELIVERY
        ${whereClause}
      `);
            const totalCount = countResult.recordset[0]?.total || 0;
            const totalPages = Math.ceil(totalCount / pageSize);
            const offset = (page - 1) * pageSize;
            // Then get paginated results
            const mainRequest = pool.request()
                .input("cpy", cpy)
                .input("stofcy", stofcy)
                .input("dlvdat", desde ?? '2022-01-01')
                .input("offset", offset)
                .input("pageSize", pageSize);
            // Add text filter parameters if provided
            if (remitoFilter) {
                mainRequest.input("remitoFilter", `%${remitoFilter}%`);
            }
            if (fechaFilter) {
                mainRequest.input("fechaFilter", `%${fechaFilter}%`);
            }
            if (codigoFilter) {
                mainRequest.input("codigoFilter", `%${codigoFilter}%`);
            }
            if (razonFilter) {
                mainRequest.input("razonFilter", `%${razonFilter}%`);
            }
            const result = await mainRequest.query(`
        SELECT CPY_0, DLVDAT_0, STOFCY_0, SDHNUM_0, BPCORD_0, BPDNAM_0, XX6FLSIGN_0
        FROM SDELIVERY
        ${whereClause}
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
        async subirPdfBase64(_, { pdfBase64 }) {
            if (!pdfBase64)
                throw new Error("No se recibió pdfBase64");
            const base64Data = pdfBase64.split(',').pop() ?? pdfBase64;
            const uploadsDir = path.join(__dirname, '../../../uploads');
            if (!fs.existsSync(uploadsDir))
                fs.mkdirSync(uploadsDir, { recursive: true });
            const fileName = `pdf_${Date.now()}_${Math.floor(Math.random() * 1e6)}.pdf`;
            const filePath = path.join(uploadsDir, fileName);
            await fs.promises.writeFile(filePath, base64Data, { encoding: 'base64' });
            const url = `http://localhost:3000/firmar/${fileName}`;
            return { url };
        }
    }
};
export { GraphQLDate };
