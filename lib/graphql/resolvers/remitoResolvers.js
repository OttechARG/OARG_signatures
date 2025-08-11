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
    }, Mutation: {
        async subirPdfBase64(_, { pdfBase64 }) {
            // Llamamos al endpoint REST que guarda el pdf y devuelve la URL
            console.log("Recibido pdfBase64 tamaño:", pdfBase64.length);
            const response = await fetch('http://localhost:3000/firmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfBase64 })
            });
            if (!response.ok) {
                console.error("Error en POST /firmar:", response.status);
                throw new Error('Error guardando PDF');
            }
            const data = await response.json();
            return {
                url: data.url
            };
        }
    }
};
