// api/mcp-tools.ts
import { spawn } from 'node:child_process';
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let cached: any[] | null = null;
export default async function handler(_req: any, res: any) {
  try {
    if (cached) return res.status(200).json({ tools: cached });
    const proc = spawn('node', ['dist/src/index.js'], { stdio: ['pipe', 'pipe', 'inherit'], env: process.env });
    const transport = new StdioClientTransport({ stdin: proc.stdin!, stdout: proc.stdout! } as any);
    const client = new MCPClient({ name: 'gateway-check', version: '0.1.0' });
    await client.connect(transport);
    const listed = await client.listTools();
    cached = listed?.tools ?? [];
    return res.status(200).json({ tools: cached });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}