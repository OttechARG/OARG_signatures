// Frontend-safe configuration without Node.js dependencies
// This configuration is fetched from backend at runtime
// Cached configuration
let cachedConfig = null;
export async function getReport() {
    if (cachedConfig !== null) {
        return cachedConfig;
    }
    try {
        const response = await fetch('/api/config/report');
        const data = await response.json();
        cachedConfig = data.report;
        return data.report;
    }
    catch (error) {
        console.warn('Failed to fetch report config, using fallback:', error);
        // Fallback if backend is not available
        return { remito: 'ZREMITOAI' };
    }
}
// Get report template with 3-level hierarchy fallback
export async function getReportTemplate(codsoc, type) {
    try {
        const params = new URLSearchParams();
        if (codsoc)
            params.append('codsoc', codsoc);
        if (type)
            params.append('type', type);
        const response = await fetch(`/api/config/report-template?${params.toString()}`);
        const data = await response.json();
        return data.template;
    }
    catch (error) {
        console.warn('Failed to fetch report template, using fallback:', error);
        return 'ZREMITOAI';
    }
}
