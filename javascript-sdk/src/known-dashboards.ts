// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** A known COSEVI dashboard entry with stable key and GUID. */
export interface KnownCoseviDashboard {
  /** Stable camelCase/snake_case key for use in code. */
  key: string;
  /** Junar GUID used as the URL path segment when calling the API. */
  guid: string;
  /** Human-readable title in Spanish. */
  title: string;
  /** Category for filtering (e.g., "fallecidos", "accidentes"). */
  category: string;
  /** Optional description of the dashboard content. */
  description?: string;
}

// -----------------------------------------------------------------------------
// Dashboard registry
// -----------------------------------------------------------------------------

/** Complete list of known COSEVI dashboards with stable keys and GUIDs. */
export const KNOWN_COSEVI_DASHBOARDS: KnownCoseviDashboard[] = [
  { key: "datos_pais", guid: "DATOS-PAIS", title: "Información general de Costa Rica", category: "general" },
  { key: "infracciones", guid: "INFRA-43614", title: "Infracciones", category: "infracciones" },
  { key: "fallecidos_en_sitio", guid: "FALLE-EN-SITIO", title: "Fallecidos en sitio", category: "fallecidos" },
  { key: "accidentes_transito", guid: "ACCID-17064", title: "Accidentes de tránsito", category: "accidentes" },
  { key: "conductores_licencias", guid: "ACRED-DE-CONDU-2", title: "Conductores y licencias", category: "licencias" },
  { key: "pruebas_teoricas_practicas", guid: "PRUEB-TEORI-Y-PRACT", title: "Pruebas teóricas y prácticas", category: "pruebas" },
  { key: "tabla_interactiva_fallecidos", guid: "DATOS-PARA-TABLA-INTER-94312", title: "Datos para tabla interactiva de fallecidos", category: "fallecidos" },
  { key: "tabla_interactiva_accidentes", guid: "DATOS-PARA-TABLA-INTER-DE", title: "Datos para tabla interactiva de accidentes", category: "accidentes" },
  { key: "accidentes_con_victimas", guid: "ACCID", title: "Accidentes con víctimas", category: "accidentes" },
  { key: "caracteristicas_infracciones", guid: "CARAC-DE-INFRA", title: "Características de infracciones", category: "infracciones" },
  { key: "consulta_infracciones_articulo", guid: "CONSU-DE-INFRA-POR-ARTIC", title: "Consulta de infracciones por artículo", category: "infracciones" },
  { key: "infracciones_detalle", guid: "INFRA-46061", title: "Infracciones detalle", category: "infracciones" },
];

// -----------------------------------------------------------------------------
// Lookup helpers
// -----------------------------------------------------------------------------

/**
 * Returns all known dashboards, optionally filtered by category.
 * Matches the `category` field exactly (case-sensitive).
 */
export function listKnownDashboards(category?: string): KnownCoseviDashboard[] {
  if (!category) return KNOWN_COSEVI_DASHBOARDS;
  return KNOWN_COSEVI_DASHBOARDS.filter(d => d.category === category);
}

/**
 * Looks up a known dashboard by its stable key or its Junar GUID.
 * Returns `undefined` if no match is found.
 */
export function getKnownDashboard(keyOrGuid: string): KnownCoseviDashboard | undefined {
  return KNOWN_COSEVI_DASHBOARDS.find(d => d.key === keyOrGuid || d.guid === keyOrGuid);
}
