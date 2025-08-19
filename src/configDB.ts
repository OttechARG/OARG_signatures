import sql from 'mssql';
import * as ini from "ini";
import * as fs from "fs";


/*const config: sql.config = {
    user: 'SGETO',
    password: 'tiger',
    server: '172.20.1.69',
    database: 'x3db',
    options: {
    instanceName: 'sage',
    encrypt: false,
    trustServerCertificate: true,
  },
};*/

let config_ini = ini.parse(fs.readFileSync("signatures.ini", "utf-8"));
const config: sql.config = config_ini.db;
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