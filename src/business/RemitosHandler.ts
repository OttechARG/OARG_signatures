import { queryRemitosDynamic } from "../graphql/queries.js";


export class RemitosHandler {
  private columns: any[] = [];

  constructor() {
    this.loadTableConfig();
  }

  private async loadTableConfig(): Promise<void> {
    // NO CONFIG - All columns come from SQL query only
    console.log("🚫 RemitosHandler.loadTableConfig() - ignoring, using SQL columns only");
    this.columns = []; // Empty - not used anymore
  }

  async fetchRemitos(company: string, facility: string, desde?: string, page: number = 1, pageSize: number = 50, firmadoFilter?: string, textFilters?: Record<string, string>) {
    // No config loading - columns come from SQL
    
    // Build dynamic filters based on text filters
    const filters = [];
    if (firmadoFilter === "no-firmados") {
      filters.push({ field: "XX6FLSIGN_0", operator: "NOT_EQUALS", value: "2" });
    } else if (firmadoFilter === "si-firmados") {
      filters.push({ field: "XX6FLSIGN_0", operator: "EQUALS", value: "2" });
    }
    
    // Apply text filters dynamically based on column configuration
    if (textFilters) {
      Object.entries(textFilters).forEach(([key, value]) => {
        if (value) {
          filters.push({ field: key, operator: "LIKE", value: value });
        }
      });
    }

    // Columns will be extracted automatically from SQL by the resolver

    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: queryRemitosDynamic,
        variables: { 
          cpy: company, 
          stofcy: facility,
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
      columns: result.columns || [],
      pagination: result.pagination
    };
  }
}