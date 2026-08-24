import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:8001/mcp'));
const client = new Client({ name: 'verify-mcp-rag', version: '1.0.0' });
await client.connect(transport);

const result = await client.callTool({
  name: 'rag_search',
  arguments: {
    document_url: 'http://127.0.0.1:8899/mcppro-test-doc.txt',
    questions: ['What is the release codename?'],
    k: 5,
  },
});

const content = result.content?.[0]?.text ?? JSON.stringify(result);
const parsed = JSON.parse(content);
console.log('success:', parsed.success);
console.log('chunks:', parsed.chunks_processed, '| cached:', parsed.cached_used);
console.log('summary contains AURORA:', /aurora/i.test(parsed.summary || ''));

await client.close();
