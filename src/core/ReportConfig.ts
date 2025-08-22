// Frontend-safe configuration without Node.js dependencies
// This configuration is fetched from backend at runtime

export interface ReportConfig {
  remito: string;
}

// Cached configuration
let cachedConfig: ReportConfig | null = null;

export async function getReport(): Promise<ReportConfig> {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  try {
    const response = await fetch('/api/config/report');
    const data = await response.json();
    cachedConfig = data.report;
    return data.report;
  } catch (error) {
    console.warn('Failed to fetch report config, using fallback:', error);
    // Fallback if backend is not available
    return { remito: 'ZREMITOAI' };
  }
}