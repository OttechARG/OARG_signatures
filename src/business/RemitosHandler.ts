import { queryRemitosDynamic } from "../graphql/queries.js";


export class RemitosHandler {
  async fetchRemitos(company: string, facility: string, desde?: string, page: number = 1, pageSize: number = 50, firmadoFilter?: string, textFilters?: { remito?: string, fecha?: string, codigo?: string, razon?: string }) {
    // Build dynamic filters based on text filters
    const filters = [];
    if (firmadoFilter === "no-firmados") {
      filters.push({ field: "XX6FLSIGN_0", operator: "NOT_EQUALS", value: "2" });
    } else if (firmadoFilter === "si-firmados") {
      filters.push({ field: "XX6FLSIGN_0", operator: "EQUALS", value: "2" });
    }
    if (textFilters?.remito) {
      filters.push({ field: "SDHNUM_0", operator: "LIKE", value: textFilters.remito });
    }
    if (textFilters?.fecha) {
      filters.push({ field: "DLVDAT_0", operator: "LIKE", value: textFilters.fecha });
    }
    if (textFilters?.codigo) {
      filters.push({ field: "BPCORD_0", operator: "LIKE", value: textFilters.codigo });
    }
    if (textFilters?.razon) {
      filters.push({ field: "BPDNAM_0", operator: "LIKE", value: textFilters.razon });
    }

    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: queryRemitosDynamic,
        variables: { 
          cpy: company, 
          stofcy: facility,
          columns: ['CPY_0', 'DLVDAT_0', 'STOFCY_0', 'SDHNUM_0', 'BPCORD_0', 'BPDNAM_0', 'XX6FLSIGN_0'],
          filters: filters,
          desde: desde, 
          page: page, 
          pageSize: pageSize
        }
      })
    });

    const { data, errors } = await response.json();
    if (errors) throw new Error(JSON.stringify(errors));

    const result = data.remitosDynamic || { remitos: [], pagination: {} };

    // Convertir DLVDAT_0 a dd/mm/yyyy
    const formattedRemitos = result.remitos.map((r: any) => ({
      ...r.data,
      DLVDAT_0: (() => {
        const dateValue = r.data.DLVDAT_0;
        if (typeof dateValue === 'string' && dateValue.includes('T')) {
          // Handle ISO date format (2025-03-29T00:00:00.000Z)
          const [yyyy, mm, dd] = dateValue.split('T')[0].split('-');
          return `${dd}/${mm}/${yyyy}`;
        } else if (typeof dateValue === 'string' && dateValue.includes('-')) {
          // Handle simple date format (2025-03-29)
          const [yyyy, mm, dd] = dateValue.split('-');
          return `${dd}/${mm}/${yyyy}`;
        }
        return dateValue; // Fallback
      })()
    }));

    return {
      remitos: formattedRemitos,
      pagination: result.pagination
    };
  }
}