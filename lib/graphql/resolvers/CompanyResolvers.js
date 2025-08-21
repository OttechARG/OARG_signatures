import { getConnection } from "../../core/configDB.js";
export const companyResolvers = {
    Query: {
        async companies() {
            const pool = await getConnection();
            const query = `SELECT CPY_0, CPYNAM_0 FROM COMPANY`;
            const result = await pool.request().query(query);
            return result.recordset;
        },
        async testDB() {
            const pool = await getConnection();
            const result = await pool.request().query("SELECT TOP 10 CPY_0, CPYNAM_0 FROM COMPANY");
            return result.recordset;
        }
    }
};
