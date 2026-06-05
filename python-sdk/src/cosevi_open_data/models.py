"""This file defines shared literal types and allowed values for the Python SDK."""

from typing import Literal

DatastreamFormat = Literal["json", "pjson", "ajson", "jsonp", "csv", "xml", "xls"]
ResourceType = Literal["dt", "ds", "vz", "db"]

ALLOWED_FORMATS: set[str] = {"json", "pjson", "ajson", "jsonp", "csv", "xml", "xls"}
ALLOWED_RESOURCE_TYPES: set[str] = {"dt", "ds", "vz", "db"}
