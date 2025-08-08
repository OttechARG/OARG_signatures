import { getConnection } from "../../configDB.js";
export const remitoResolvers = {
    Query: {
        async remitos(_, { cpy, stofcy }) {
            const pool = await getConnection();
            const result = await pool.request()
                .input("cpy", cpy)
                .input("stofcy", stofcy)
                .query(`
          SELECT TOP 20 CPY_0, STOFCY_0, SDHNUM_0, BPCORD_0, BPDNAM_0
          FROM SDELIVERY
          WHERE CFMFLG_0 = 2 AND CPY_0 = @cpy AND STOFCY_0 = @stofcy
        `);
            return result.recordset;
        }
    }
};
