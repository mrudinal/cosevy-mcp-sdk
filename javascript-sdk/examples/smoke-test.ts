import "dotenv/config";
import { CoseviClient } from "../src/index.js";

const client = CoseviClient.fromEnv();

console.log("Searching resources...");
console.log(await client.searchResources({ query: "fallecidos", limit: 5 }));

console.log("Reading sample datastream...");
console.log(
  await client.getDatastreamData("REGIS-DE-FALLE-EN-SITIO", {
    format: "pjson",
    limit: 5,
    page: 1
  })
);
