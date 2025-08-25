import { getConnection } from "../../core/AppConfig.js";
import { getSqlQuery } from "../../core/configDB.js";
import { GraphQLDate, GraphQLJSON } from 'graphql-scalars';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function extractColumnsFromSQL(sqlQuery) {
    const selectMatch = sqlQuery.match(/SELECT\s+(.*?)\s+FROM/i);
    if (!selectMatch)
        return [];
    const columnsStr = selectMatch[1].trim();
    return columnsStr.split(',')
        .map(col => {
        col = col.trim();
        // Extract clean column name that SQL Server actually returns
        // BPC.XARGTYPCOB_0 -> XARGTYPCOB_0
        if (col.includes('.')) {
            const parts = col.split('.');
            return parts[parts.length - 1]; // Take the part after the last dot
        }
        return col;
    })
        .filter(col => !col.includes('COUNT(') && !col.includes('OVER('));
}
function readSQLFromConfig() {
    return {
        remitosQuery: getSqlQuery('remitos_query')
    };
}
export const remitoResolvers = {
    Date: GraphQLDate,
    JSON: GraphQLJSON,
    Query: {
        async remitosDynamic(_, { cpy, stofcy, filters = [], desde, page = 1, pageSize = 50 }) {
            console.log("🔄 USANDO QUERY DINAMICA - remitosDynamic");
            console.log("Dynamic remitos parameters:", { cpy, stofcy, filters, desde, page, pageSize });
            const pool = await getConnection();
            // Read SQL queries from config
            const { remitosQuery } = readSQLFromConfig();
            // Extract columns from SQL
            const columns = extractColumnsFromSQL(remitosQuery);
            console.log("📊 SQL QUERY:", remitosQuery);
            console.log("📊 EXTRACTED COLUMNS:", columns);
            // Sanitize column names to prevent SQL injection
            const sanitizedColumns = columns.filter(col => /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)?$/.test(col));
            if (sanitizedColumns.length !== columns.length) {
                throw new Error("Invalid column names detected");
            }
            // Build additional filters for dynamic WHERE conditions
            let additionalFilters = "";
            const parameters = {
                cpy,
                stofcy,
                dlvdat: desde ?? '2022-01-01'
            };
            // Build dynamic filters
            filters.forEach((filter, index) => {
                // Sanitize field name
                if (!/^[A-Za-z0-9_.]+$/.test(filter.field)) {
                    throw new Error(`Invalid field name: ${filter.field}`);
                }
                const paramName = `filter${index}`;
                switch (filter.operator.toLowerCase()) {
                    case 'equals':
                        additionalFilters += ` AND ${filter.field} = @${paramName}`;
                        parameters[paramName] = filter.value;
                        break;
                    case 'like':
                        additionalFilters += ` AND UPPER(CAST(${filter.field} AS NVARCHAR)) LIKE UPPER(@${paramName})`;
                        parameters[paramName] = `%${filter.value}%`;
                        break;
                    case 'not_equals':
                        additionalFilters += ` AND ${filter.field} != @${paramName}`;
                        parameters[paramName] = filter.value;
                        break;
                    case 'greater_than':
                        additionalFilters += ` AND ${filter.field} > @${paramName}`;
                        parameters[paramName] = filter.value;
                        break;
                    case 'less_than':
                        additionalFilters += ` AND ${filter.field} < @${paramName}`;
                        parameters[paramName] = filter.value;
                        break;
                    case 'in':
                        const values = filter.value.split(',').map(v => v.trim());
                        const inParams = values.map((_, i) => `@${paramName}_${i}`).join(',');
                        additionalFilters += ` AND ${filter.field} IN (${inParams})`;
                        values.forEach((value, i) => {
                            parameters[`${paramName}_${i}`] = value;
                        });
                        break;
                    default:
                        throw new Error(`Unsupported operator: ${filter.operator}`);
                }
            });
            const offset = (page - 1) * pageSize;
            // Single query with COUNT(*) OVER() for pagination
            const mainRequest = pool.request();
            Object.keys(parameters).forEach(key => {
                mainRequest.input(key, parameters[key]);
            });
            mainRequest.input("offset", offset);
            mainRequest.input("pageSize", pageSize);
            const finalMainQuery = remitosQuery.replace('{additionalFilters}', additionalFilters);
            const result = await mainRequest.query(finalMainQuery);
            const totalCount = result.recordset[0]?.total_count || 0;
            const totalPages = Math.ceil(totalCount / pageSize);
            console.log("Dynamic SQL result:", result.recordset);
            return {
                remitos: result.recordset.map(row => ({ data: row })),
                columns: sanitizedColumns,
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
export { GraphQLDate, GraphQLJSON };
