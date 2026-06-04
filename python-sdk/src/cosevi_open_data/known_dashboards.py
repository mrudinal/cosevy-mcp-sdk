from __future__ import annotations

from dataclasses import dataclass

# -----------------------------------------------------------------------------
# Dashboard dataclass
# -----------------------------------------------------------------------------


@dataclass
class KnownCoseviDashboard:
    """A known COSEVI dashboard entry with stable key and Junar GUID."""

    key: str
    """Stable snake_case key for use in code."""

    guid: str
    """Junar GUID used as the URL path segment when calling the API."""

    title: str
    """Human-readable title in Spanish."""

    category: str
    """Category for filtering (e.g., 'fallecidos', 'accidentes')."""

    description: str | None = None
    """Optional description of the dashboard content."""


# -----------------------------------------------------------------------------
# Dashboard registry
# -----------------------------------------------------------------------------

KNOWN_COSEVI_DASHBOARDS: list[KnownCoseviDashboard] = [
    KnownCoseviDashboard("datos_pais", "DATOS-PAIS", "Información general de Costa Rica", "general"),
    KnownCoseviDashboard("infracciones", "INFRA-43614", "Infracciones", "infracciones"),
    KnownCoseviDashboard("fallecidos_en_sitio", "FALLE-EN-SITIO", "Fallecidos en sitio", "fallecidos"),
    KnownCoseviDashboard("accidentes_transito", "ACCID-17064", "Accidentes de tránsito", "accidentes"),
    KnownCoseviDashboard("conductores_licencias", "ACRED-DE-CONDU-2", "Conductores y licencias", "licencias"),
    KnownCoseviDashboard("pruebas_teoricas_practicas", "PRUEB-TEORI-Y-PRACT", "Pruebas teóricas y prácticas", "pruebas"),
    KnownCoseviDashboard("tabla_interactiva_fallecidos", "DATOS-PARA-TABLA-INTER-94312", "Datos para tabla interactiva de fallecidos", "fallecidos"),
    KnownCoseviDashboard("tabla_interactiva_accidentes", "DATOS-PARA-TABLA-INTER-DE", "Datos para tabla interactiva de accidentes", "accidentes"),
    KnownCoseviDashboard("accidentes_con_victimas", "ACCID", "Accidentes con víctimas", "accidentes"),
    KnownCoseviDashboard("caracteristicas_infracciones", "CARAC-DE-INFRA", "Características de infracciones", "infracciones"),
    KnownCoseviDashboard("consulta_infracciones_articulo", "CONSU-DE-INFRA-POR-ARTIC", "Consulta de infracciones por artículo", "infracciones"),
    KnownCoseviDashboard("infracciones_detalle", "INFRA-46061", "Infracciones detalle", "infracciones"),
]
"""Complete list of known COSEVI dashboards with stable keys and GUIDs."""

# -----------------------------------------------------------------------------
# Lookup helpers
# -----------------------------------------------------------------------------


def list_known_dashboards(category: str | None = None) -> list[KnownCoseviDashboard]:
    """Return all known dashboards, optionally filtered by category (exact match)."""
    if not category:
        return list(KNOWN_COSEVI_DASHBOARDS)
    return [d for d in KNOWN_COSEVI_DASHBOARDS if d.category == category]


def get_known_dashboard(key_or_guid: str) -> KnownCoseviDashboard | None:
    """Look up a known dashboard by its stable key or Junar GUID. Returns None if not found."""
    for d in KNOWN_COSEVI_DASHBOARDS:
        if d.key == key_or_guid or d.guid == key_or_guid:
            return d
    return None
