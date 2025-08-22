import { queryRemitosDynamic } from "../graphql/queries.js";
export class RemitosHandler {
    constructor() {
        this.columns = [];
        this.loadTableConfig();
    }
    async loadTableConfig() {
        try {
            // Get merged config from ClientTableConfigManager
            if (window.clientTableConfigManager) {
                this.columns = window.clientTableConfigManager.getAllVisibleColumns();
            }
            // Fallback to default columns if no config available
            if (this.columns.length === 0) {
                this.columns = [
                    { field: 'CPY_0' },
                    { field: 'DLVDAT_0' },
                    { field: 'STOFCY_0' },
                    { field: 'SDHNUM_0' },
                    { field: 'BPCORD_0' },
                    { field: 'BPDNAM_0' },
                    { field: 'XX6FLSIGN_0' }
                ];
            }
        }
        catch (error) {
            console.error('Error loading table config:', error);
            // Use fallback columns
            this.columns = [
                { field: 'CPY_0' },
                { field: 'DLVDAT_0' },
                { field: 'STOFCY_0' },
                { field: 'SDHNUM_0' },
                { field: 'BPCORD_0' },
                { field: 'BPDNAM_0' },
                { field: 'XX6FLSIGN_0' }
            ];
        }
    }
    async fetchRemitos(company, facility, desde, page = 1, pageSize = 50, firmadoFilter, textFilters) {
        // Ensure config is loaded
        await this.loadTableConfig();
        // Build dynamic filters based on text filters
        const filters = [];
        if (firmadoFilter === "no-firmados") {
            filters.push({ field: "XX6FLSIGN_0", operator: "NOT_EQUALS", value: "2" });
        }
        else if (firmadoFilter === "si-firmados") {
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
        // Get dynamic columns from configuration
        const columnFields = this.columns.map(col => col.field);
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: queryRemitosDynamic,
                variables: {
                    cpy: company,
                    stofcy: facility,
                    columns: columnFields,
                    filters: filters,
                    desde: desde,
                    page: page,
                    pageSize: pageSize
                }
            })
        });
        const { data, errors } = await response.json();
        if (errors)
            throw new Error(JSON.stringify(errors));
        const result = data.remitosDynamic || { remitos: [], pagination: {} };
        // Convertir DLVDAT_0 a dd/mm/yyyy
        const formattedRemitos = result.remitos.map((r) => ({
            ...r.data,
            DLVDAT_0: (() => {
                const dateValue = r.data.DLVDAT_0;
                if (typeof dateValue === 'string' && dateValue.includes('T')) {
                    // Handle ISO date format (2025-03-29T00:00:00.000Z)
                    const [yyyy, mm, dd] = dateValue.split('T')[0].split('-');
                    return `${dd}/${mm}/${yyyy}`;
                }
                else if (typeof dateValue === 'string' && dateValue.includes('-')) {
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
