import sql from 'mssql';
import * as ini from "ini";
import * as fs from "fs";
// Load configuration once
let config_ini = ini.parse(fs.readFileSync("signatures.ini", "utf-8"));
const config = config_ini.db;
// Backend-only exports (contains Node.js modules)
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
// Frontend-safe exports (no Node.js modules)
export const report = config_ini.rpt;
