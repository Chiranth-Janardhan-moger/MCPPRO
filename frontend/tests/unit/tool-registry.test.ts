import { describe, it, expect, beforeEach } from 'vitest';
import { getStaticTools } from '@/app/chat/lib/ai/tools/tool-registry';

describe('dangerous tool gating', () => {
  beforeEach(() => {
    delete process.env.ENABLE_DANGEROUS_TOOLS;
  });

  it('registers NO tools by default (RCE/SQL must be opt-in)', () => {
    const tools = getStaticTools();
    expect(Object.keys(tools)).toHaveLength(0);
  });

  it('still registers nothing when set to a truthy-but-wrong value', () => {
    process.env.ENABLE_DANGEROUS_TOOLS = '1';
    expect(Object.keys(getStaticTools())).toHaveLength(0);
  });

  it('registers code-execution tools only when explicitly enabled', () => {
    process.env.ENABLE_DANGEROUS_TOOLS = 'true';
    const tools = getStaticTools();
    expect(Object.keys(tools).sort()).toEqual(['createCodeFileTool', 'javaScriptTool']);
  });
});
