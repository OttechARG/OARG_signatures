import { getConnection } from "../../core/AppConfig.js";
import { GraphQLDate, GraphQLJSON } from 'graphql-scalars';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const remitoResolvers = {
  Date: GraphQLDate,
  JSON: GraphQLJSON,

  Query: {

    async remitosDynamic(_: any, { cpy, stofcy, columns, filters = [], desde, page = 1, pageSize = 50 }: {
      cpy: string;
      stofcy: string;
      columns: string[];
      filters?: Array<{ field: string; operator: string; value: string }>;
      desde?: string;
      page?: number;
      pageSize?: number;
    }) {
      console.log("🔄 USANDO QUERY DINAMICA - remitosDynamic");
      console.log("Dynamic remitos parameters:", { cpy, stofcy, columns, filters, desde, page, pageSize });
      
      const pool = await getConnection();
      
      // Sanitize column names to prevent SQL injection
      const sanitizedColumns = columns.filter(col => /^[A-Za-z0-9_]+$/.test(col));
      if (sanitizedColumns.length !== columns.length) {
        throw new Error("Invalid column names detected");
      }
      
      // Build SELECT clause
      const selectClause = sanitizedColumns.join(', ');
      
      // Build base WHERE clause
      let whereClause = "WHERE DLVDAT_0 > @dlvdat AND CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy";
      const parameters: any = {
        cpy,
        stofcy,
        dlvdat: desde ?? '2022-01-01'
      };
      
      // Build dynamic filters
      filters.forEach((filter, index) => {
        // Sanitize field name
        if (!/^[A-Za-z0-9_]+$/.test(filter.field)) {
          throw new Error(`Invalid field name: ${filter.field}`);
        }
        
        const paramName = `filter${index}`;
        
        switch (filter.operator.toLowerCase()) {
          case 'equals':
            whereClause += ` AND ${filter.field} = @${paramName}`;
            parameters[paramName] = filter.value;
            break;
          case 'like':
            whereClause += ` AND UPPER(CAST(${filter.field} AS NVARCHAR)) LIKE UPPER(@${paramName})`;
            parameters[paramName] = `%${filter.value}%`;
            break;
          case 'not_equals':
            whereClause += ` AND ${filter.field} != @${paramName}`;
            parameters[paramName] = filter.value;
            break;
          case 'greater_than':
            whereClause += ` AND ${filter.field} > @${paramName}`;
            parameters[paramName] = filter.value;
            break;
          case 'less_than':
            whereClause += ` AND ${filter.field} < @${paramName}`;
            parameters[paramName] = filter.value;
            break;
          case 'in':
            const values = filter.value.split(',').map(v => v.trim());
            const inParams = values.map((_, i) => `@${paramName}_${i}`).join(',');
            whereClause += ` AND ${filter.field} IN (${inParams})`;
            values.forEach((value, i) => {
              parameters[`${paramName}_${i}`] = value;
            });
            break;
          default:
            throw new Error(`Unsupported operator: ${filter.operator}`);
        }
      });
      
      // Count query
      const countRequest = pool.request();
      Object.keys(parameters).forEach(key => {
        countRequest.input(key, parameters[key]);
      });
      
      const countResult = await countRequest.query(`
        SELECT COUNT(*) as total
        FROM SDELIVERY
        ${whereClause}
      `);
      
      const totalCount = countResult.recordset[0]?.total || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      const offset = (page - 1) * pageSize;
      
      // Main query
      const mainRequest = pool.request();
      Object.keys(parameters).forEach(key => {
        mainRequest.input(key, parameters[key]);
      });
      mainRequest.input("offset", offset);
      mainRequest.input("pageSize", pageSize);
      
      const result = await mainRequest.query(`
        SELECT ${selectClause}
        FROM SDELIVERY
        ${whereClause}
        ORDER BY DLVDAT_0 DESC
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `);
      
      console.log("Dynamic SQL result:", result.recordset);
      
      return {
        remitos: result.recordset.map(row => ({ data: row })),
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

export { GraphQLDate, GraphQLJSON };