import { queryRemitos } from "../graphql/queries.js";


export class RemitosHandler {
  async fetchRemitos(company: string, facility: string, desde?: string, page: number = 1, pageSize: number = 50, firmadoFilter?: string, textFilters?: { remito?: string, fecha?: string, codigo?: string, razon?: string }) {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: queryRemitos,
        variables: { 
          cpy: company, 
          stofcy: facility, 
          desde: desde, 
          page: page, 
          pageSize: pageSize, 
          firmadoFilter: firmadoFilter,
          remitoFilter: textFilters?.remito || null,
          fechaFilter: textFilters?.fecha || null,
          codigoFilter: textFilters?.codigo || null,
          razonFilter: textFilters?.razon || null
        }
      })
    });

    const { data, errors } = await response.json();
    if (errors) throw new Error(JSON.stringify(errors));

    const result = data.remitos || { remitos: [], pagination: {} };

    // Convertir DLVDAT_0 a dd/mm/yyyy
    const formattedRemitos = result.remitos.map((r: any) => ({
      ...r,
      DLVDAT_0: (() => {
        const [yyyy, mm, dd] = r.DLVDAT_0.split('-'); // GraphQLDate viene como yyyy-mm-dd
        return `${dd}/${mm}/${yyyy}`;
      })()
    }));

    return {
      remitos: formattedRemitos,
      pagination: result.pagination
    };
  }
}