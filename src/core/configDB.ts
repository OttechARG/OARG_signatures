import sql from 'mssql';
import * as ini from "ini";
import * as fs from "fs";
import path from 'path';

// Load database config from signatures.ini
let config_ini = ini.parse(fs.readFileSync("signatures.ini", "utf-8"));
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

// New function to get SQL queries from JSON files with fallback to signatures.ini
export function getSqlQuery(queryName: string): string {
    try {
        // Try JSON files first
        const defaultsPath = path.join(process.cwd(), 'config', 'sql-defaults.json');
        const customPath = path.join(process.cwd(), 'specific', 'sql-customizations.json');
        
        let query = '';
        
        // Load defaults
        if (fs.existsSync(defaultsPath)) {
            const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
            query = defaults.queries[queryName] || '';
        }
        
        // Override with user customizations if they exist
        if (fs.existsSync(customPath)) {
            const custom = JSON.parse(fs.readFileSync(customPath, 'utf-8'));
            if (custom.queries[queryName]) {
                query = custom.queries[queryName];
            }
        }
        
        // Fallback to signatures.ini if not found in JSON files
        if (!query && config_ini.sql) {
            query = config_ini.sql[queryName] || '';
        }
        
        return query;
        
    } catch (error) {
        console.error('Error loading SQL query:', queryName, error);
        // Final fallback to signatures.ini
        return config_ini.sql?.[queryName] || '';
    }
}