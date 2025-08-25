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

// Load configuration once
let config_ini = loadConfiguration();
const config: sql.config = config_ini.db;

// Backend-only exports (contains Node.js modules)
export async function getConnection(): Promise<sql.ConnectionPool> {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Error de conexión a la base de datos:', err.message);
      throw err;
    } else {
      console.error('Error desconocido:', err);
      throw new Error('Error desconocido al conectar a la base de datos');
    }
  }
}

// Frontend-safe exports (no Node.js modules)
export const report = config_ini.rpt;