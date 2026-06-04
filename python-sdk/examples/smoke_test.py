from dotenv import load_dotenv

from cosevi_open_data import CoseviClient

load_dotenv()

client = CoseviClient.from_env()

print("Searching resources...")
resources = client.search_resources(query="fallecidos", limit=5)
print(resources)

print("Reading sample datastream...")
rows = client.get_datastream_data("REGIS-DE-FALLE-EN-SITIO", format="pjson", limit=5, page=1)
print(rows)
