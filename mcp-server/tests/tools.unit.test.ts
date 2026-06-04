import { describe, expect, it } from "vitest";
import { DOMAIN_TOOL_GUIDS, registerCoseviTools } from "../src/tools.js";
import { createMockClient, createServerRecorder } from "./helpers.js";

describe("mcp tool delegation", () => {
  it("registers all expected tools", () => {
    const server = createServerRecorder();
    registerCoseviTools(server, createMockClient() as any);
    expect(server.tools.size).toBe(30);
  });

  it("health check does not call network by default and reports sanitized metadata", async () => {
    const server = createServerRecorder();
    const client = createMockClient();
    registerCoseviTools(server, client as any);
    const result = await server.tools.get("cosevi_health_check")!.handler({ checkReachability: false });
    expect(client.searchResources).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain("apiKeySource");
    expect(result.content[0].text).not.toContain("DUMMY_SECRET");
  });

  it("health check calls exactly one tiny method when reachability is enabled", async () => {
    const server = createServerRecorder();
    const client = createMockClient();
    registerCoseviTools(server, client as any);
    await server.tools.get("cosevi_health_check")!.handler({ checkReachability: true });
    expect(client.searchResources).toHaveBeenCalledTimes(1);
    expect(client.searchResources).toHaveBeenCalledWith({ query: "fallecidos", resources: ["ds"], limit: 1, offset: 0 });
  });

  it("delegates list/get/query tools to the matching sdk methods", async () => {
    const server = createServerRecorder();
    const client = createMockClient();
    registerCoseviTools(server, client as any);

    await server.tools.get("cosevi_search_resources")!.handler({ query: "fallecidos", limit: 5, offset: 0 });
    await server.tools.get("cosevi_list_datasets")!.handler({ limit: 5, offset: 0 });
    await server.tools.get("cosevi_get_dataset")!.handler({ guid: "D1" });
    await server.tools.get("cosevi_list_datastreams")!.handler({ limit: 5, offset: 0 });
    await server.tools.get("cosevi_get_datastream")!.handler({ guid: "DS1" });
    await server.tools.get("cosevi_get_datastream_data")!.handler({ guid: "DS1", format: "pjson" });
    await server.tools.get("cosevi_query_datastream")!.handler({ guid: "DS1", format: "pjson", where: "filter0" });
    await server.tools.get("cosevi_get_datastream_raw")!.handler({ guid: "DS1", format: "csv" });
    await server.tools.get("cosevi_get_datastream_tableau")!.handler({ guid: "DS1", parameters: ["2024"] });
    await server.tools.get("cosevi_list_visualizations")!.handler({ limit: 5, offset: 0 });
    await server.tools.get("cosevi_get_visualization")!.handler({ guid: "V1" });
    await server.tools.get("cosevi_list_dashboards")!.handler({ limit: 5, offset: 0 });
    await server.tools.get("cosevi_get_dashboard")!.handler({ guid: "DB1" });
    await server.tools.get("cosevi_get_dashboard_resources")!.handler({ guid: "DB1", resourceTypes: ["ds"] });
    await server.tools.get("cosevi_get_portal_stats")!.handler({ days: 7, limit: 5 });
    await server.tools.get("cosevi_list_known_dashboards")!.handler({ category: "fallecidos" });
    await server.tools.get("cosevi_get_known_dashboard")!.handler({ keyOrGuid: "fallecidos_en_sitio" });
    await server.tools.get("cosevi_get_known_dashboard_data")!.handler({ keyOrGuid: "fallecidos_en_sitio" });
    await server.tools.get("cosevi_discover_resources_by_topic")!.handler({ topic: "fallecidos", limit: 5, offset: 0 });
    await server.tools.get("cosevi_get_resource_pages")!.handler({ query: "fallecidos", pageSize: 10, maxPages: 2 });
    await server.tools.get("cosevi_get_datastream_pages")!.handler({ guid: "DS1", format: "pjson", pageSize: 10, maxPages: 2 });

    expect(client.searchResources).toHaveBeenCalled();
    expect(client.listDatasets).toHaveBeenCalled();
    expect(client.getDataset).toHaveBeenCalledWith("D1");
    expect(client.listDatastreams).toHaveBeenCalled();
    expect(client.getDatastream).toHaveBeenCalledWith("DS1");
    expect(client.getDatastreamData).toHaveBeenCalled();
    expect(client.getDatastreamRawText).toHaveBeenCalled();
    expect(client.getDatastreamTableau).toHaveBeenCalledWith("DS1", { parameters: ["2024"] });
    expect(client.listVisualizations).toHaveBeenCalled();
    expect(client.getVisualization).toHaveBeenCalledWith("V1");
    expect(client.listDashboards).toHaveBeenCalled();
    expect(client.getDashboard).toHaveBeenCalledWith("DB1");
    expect(client.extractDashboardResources).toHaveBeenCalled();
    expect(client.getPortalStats).toHaveBeenCalled();
    expect(client.listKnownDashboards).toHaveBeenCalled();
    expect(client.getKnownDashboard).toHaveBeenCalledWith("fallecidos_en_sitio");
    expect(client.getKnownDashboardData).toHaveBeenCalledWith("fallecidos_en_sitio");
    expect(client.discoverResourcesByTopic).toHaveBeenCalled();
    expect(client.iterateResources).toHaveBeenCalled();
    expect(client.iterateDatastreamData).toHaveBeenCalled();
  });

  it("maps domain shortcut tools to the expected dashboard guids", async () => {
    const server = createServerRecorder();
    const client = createMockClient();
    registerCoseviTools(server, client as any);

    for (const [toolName, guid] of Object.entries(DOMAIN_TOOL_GUIDS)) {
      await server.tools.get(toolName)!.handler({ includeResources: false });
      expect(client.getDashboard).toHaveBeenCalledWith(guid);
    }
  });
});
