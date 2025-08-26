import sql from 'mssql';
import * as ini from "ini";
import * as fs from "fs";
import path from 'path';
// Load configuration with property-level fallback
function loadConfiguration() {
    // Load defaults first
    let config = {};
    const defaultsPath = path.join("config", "signatures-defaults.ini");
    if (fs.existsSync(defaultsPath)) {
        config = ini.parse(fs.readFileSync(defaultsPath, "utf-8"));
    }
    // Override with specific customizations (property by property)
    const customizationsPath = path.join("specific", "signatures-customizations.ini");
    if (fs.existsSync(customizationsPath)) {
        const customConfig = ini.parse(fs.readFileSync(customizationsPath, "utf-8"));
        // Merge root level properties
        Object.keys(customConfig).forEach(key => {
            if (typeof customConfig[key] === 'object' && config[key]) {
                // Merge section properties (like [db])
                config[key] = { ...config[key], ...customConfig[key] };
            }
            else {
                // Override root properties
                config[key] = customConfig[key];
            }
        });
    }
    return config;
}
// Load configuration once
let config_ini = loadConfiguration();
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
// Report configuration with 3-level hierarchy fallback
export function getReportTemplate(codsoc, type) {
    const rptConfig = config_ini.rpt;
    // Level 3: report.remito.CODSOC.TYPE (highest priority)
    if (codsoc && type) {
        const level3Key = `remito.${codsoc}.${type}`;
        if (rptConfig[level3Key]) {
            console.log(`🎯 Using Level 3 config: ${level3Key} = ${rptConfig[level3Key]}`);
            return rptConfig[level3Key];
        }
    }
    // Level 2: report.remito.CODSOC (medium priority)
    if (codsoc) {
        const level2Key = `remito.${codsoc}`;
        if (rptConfig[level2Key]) {
            console.log(`🎯 Using Level 2 config: ${level2Key} = ${rptConfig[level2Key]}`);
            return rptConfig[level2Key];
        }
    }
    // Level 1: report.remito (default fallback)
    console.log(`🎯 Using Level 1 config: remito = ${rptConfig.remito}`);
    return rptConfig.remito;
}
