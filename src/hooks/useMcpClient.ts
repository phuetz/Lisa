

// lightweight fetch-based MCP client (subset) interface
type ListResponse = { resources: { uri: string; name?: string; type?: string }[] };


// Very small wrapper to memoise a singleton MCP client
const MCP_TOKEN = import.meta.env.VITE_MCP_TOKEN || '';

export function useMcpClient(baseUrl = 'http://localhost:3333') {
  const listResources = async (serverName: string) => {
    const headers: HeadersInit = MCP_TOKEN ? { Authorization: `Bearer ${MCP_TOKEN}` } : {};
    const res = await fetch(`${baseUrl}/servers/${serverName}/resources`, { headers });
    return (await res.json()) as ListResponse;
  };

  const readResource = async (serverName: string, uri: string) => {
    const headers: HeadersInit = MCP_TOKEN ? { Authorization: `Bearer ${MCP_TOKEN}` } : {};
    const res = await fetch(`${baseUrl}/servers/${serverName}/resources/${encodeURIComponent(uri)}`, { headers });
    return res.json();
  };

  return { listResources, readResource } as const;
}
