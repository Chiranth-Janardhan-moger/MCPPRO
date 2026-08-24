import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:8001/mcp'));
const client = new Client({ name: 'verify-mcp', version: '1.0.0' });
await client.connect(transport);
const tools = await client.listTools();
console.log('MCP connected. tools:', tools.tools.map((t) => t.name).join(', '));
await client.close();
