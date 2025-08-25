import sql from 'mssql';
import * as ini from "ini";
import * as fs from "fs";
import path from 'path';

// Load configuration with property-level fallback
function loadConfiguration(): any {
  // Load defaults first
  let config: any = {};
  const defaultsPath = path.join("config", "signatures-defaults.ini");
  if (fs.existsSync(defaultsPath)) {
    config = ini.parse(fs.readFileSync(defaultsPath, "utf-8"));
  }

  // Override with specific customizations (property by property)
  const customizationsPath = path.join("specific", "signatures-customizations.ini");
  if (fs.existsSync(customizationsPath)) {
    const customConfig: any = ini.parse(fs.readFileSync(customizationsPath, "utf-8"));
    
    // Merge root level properties
    Object.keys(customConfig).forEach(key => {
      if (typeof customConfig[key] === 'object' && config[key]) {
        // Merge section properties (like [db])
        config[key] = { ...config[key], ...customConfig[key] };
      } else {
        // Override root properties
        config[key] = customConfig[key];
      }
    });
  }

  return config;
}

// Load database config
let config_ini = loadConfiguration();
const config = config_ini.db;

export async function getConnection() {
    try {
        const pool = await sql.connect(config);
        return pool;
    }
    catch (err) {
        if (err instanceof Error) {
            console.error('Error de conexión a la base de datos:', err.message);
            throw err;
        }
        else {
            console.error('Error desconocido:', err);
            throw new Error('Error desconocido al conectar a la base de datos');
        }
    }
}

// Simple SQL query loader with auto-completion of required structure
export function getSqlQuery(queryName: string): string {
    try {
        const defaultsPath = path.join(process.cwd(), 'config', 'sql-defaults.json');
        const customPath = path.join(process.cwd(), 'specific', 'sql-customizations.json');
        
        // Load defaults
        let defaults: any = {};
        if (fs.existsSync(defaultsPath)) {
            defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
        }
        
        // Load customizations
        let custom: any = {};
        if (fs.existsSync(customPath)) {
            custom = JSON.parse(fs.readFileSync(customPath, 'utf-8'));
        }
        
        // If no customizations, return default
        if (!custom.queries || !custom.queries[queryName]) {
            return defaults.queries?.[queryName] || '';
        }
        
        // If remitos_query, auto-complete with required structure
        if (queryName === 'remitos_query') {
            return autoCompleteRemitoQuery(custom.queries[queryName], defaults);
        }
        
        // Otherwise, return custom query as-is
        return custom.queries[queryName];
        
    } catch (error) {
        console.error('Error loading SQL query:', queryName, error);
        return '';
    }
}

// Auto-complete user query with required pagination and filters
function autoCompleteRemitoQuery(userQuery: string, defaults: any): string {
    try {
        // If user query already has WHERE, ORDER BY, OFFSET - return as-is
        if (userQuery.includes('WHERE') && userQuery.includes('ORDER BY') && userQuery.includes('OFFSET')) {
            return userQuery;
        }
        
        // Extract user's SELECT and FROM parts
        const selectMatch = userQuery.match(/SELECT\s+(.*?)\s+FROM\s+(.*)/i);
        if (!selectMatch) {
            return userQuery; // Can't parse, return as-is
        }
        
        const userColumns = selectMatch[1].trim();
        const userFromPart = selectMatch[2].trim();
        
        // Auto-add required columns for system functionality
        const requiredColumns = ['SDHNUM_0', 'BPCORD_0', 'BPDNAM_0', 'CPY_0', 'STOFCY_0', 'DLVDAT_0', 'XX6FLSIGN_0', 'COUNT(*) OVER() as total_count'];
        
        // Combine user columns + required columns
        const allColumns = `${userColumns}, ${requiredColumns.join(', ')}`;
        
        // Auto-add required WHERE, ORDER BY, OFFSET
        const finalQuery = `SELECT ${allColumns} FROM ${userFromPart} WHERE DLVDAT_0 > @dlvdat AND CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy {additionalFilters} ORDER BY DLVDAT_0 DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
        
        // Log the final query to see what's being generated
        console.log('=== FINAL MERGED QUERY ===');
        console.log(finalQuery);
        console.log('=== END QUERY ===');
        
        return finalQuery;
        
    } catch (error) {
        console.error('Error auto-completing remito query:', error);
        return userQuery; // Fallback to user query as-is
    }
}

// Get all SQL queries merged (defaults + customizations)
export function getAllSqlQueries(): Record<string, string> {
    try {
        const defaultsPath = path.join(process.cwd(), 'config', 'sql-defaults.json');
        const customPath = path.join(process.cwd(), 'specific', 'sql-customizations.json');
        
        let queries: Record<string, string> = {};
        
        // 1. Load defaults first
        if (fs.existsSync(defaultsPath)) {
            const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
            queries = { ...defaults.queries };
        }
        
        // 2. Merge user customizations (property-by-property)
        if (fs.existsSync(customPath)) {
            const custom = JSON.parse(fs.readFileSync(customPath, 'utf-8'));
            if (custom.queries) {
                // Merge each property individually
                Object.keys(custom.queries).forEach(key => {
                    if (custom.queries[key]) {
                        queries[key] = custom.queries[key];
                    }
                });
            }
        }
        
        return queries;
        
    } catch (error) {
        console.error('Error loading SQL queries:', error);
        return {};
    }
}