import { describe, it, expect } from 'vitest';
import { parseSimpleAnswers } from '@/lib/mcppro-agent-utils';

describe('parseSimpleAnswers', () => {
  it('parses plain lines', () => {
    expect(parseSimpleAnswers('42\nhello world', 2)).toEqual(['42', 'hello world']);
  });

  it('strips Answer N: prefixes', () => {
    expect(parseSimpleAnswers('Answer 1: red\nAnswer 2: blue', 2)).toEqual([
      'red',
      'blue',
    ]);
  });

  it('strips numbered and bullet prefixes', () => {
    expect(parseSimpleAnswers('1. first\n- second\n* third', 3)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('unwraps quotes', () => {
    expect(parseSimpleAnswers('"quoted"\n\'single\'', 2)).toEqual([
      'quoted',
      'single',
    ]);
  });

  it('pads missing answers with NOT_FOUND', () => {
    expect(parseSimpleAnswers('only one', 3)).toEqual([
      'only one',
      'NOT_FOUND',
      'NOT_FOUND',
    ]);
  });

  it('ignores blank lines', () => {
    expect(parseSimpleAnswers('\n\na\n\n\nb\n\n', 2)).toEqual(['a', 'b']);
  });
});
