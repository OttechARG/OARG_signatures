import { getConnection } from "../../core/AppConfig.js";

export const facilityResolvers = {
  Query: {
    async facilities(_: any, { legcpy }: { legcpy?: string }) {
      const pool = await getConnection();
      const request = pool.request();
      if (legcpy) request.input("legcpyParam", legcpy);
      const result = await request.query(`
        SELECT FCY_0, FCYSHO_0 FROM FACILITY
        WHERE WRHFLG_0 = 2 AND (@legcpyParam IS NULL OR LEGCPY_0 = @legcpyParam)
      `);
      return result.recordset;
    }
  }
};