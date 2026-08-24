function cleanAnswerText(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^(Answer\s*\d+\s*:?\s*)/i, '');
  cleaned = cleaned.replace(/^(\d+\.\s+)/i, '');
  cleaned = cleaned.replace(/^[-*]\s*/, '');
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
}

export function parseSimpleAnswers(responseText: string, expectedAnswerCount: number): string[] {
  const trimmed = responseText.trim();
  if (!trimmed) {
    return Array(expectedAnswerCount).fill("NOT_FOUND");
  }

  // First try splitting by explicit answer/item markers (Answer N:, 1., - item, * item)
  const itemDelimiterRegex = /(?:^|\n)(?=(?:Answer\s*\d+\s*:?|\d+\.|[-*])\s+)/i;
  let parsedChunks = trimmed
    .split(itemDelimiterRegex)
    .map(p => cleanAnswerText(p))
    .filter(p => p.length > 0);

  // If marker splitting produced fewer items than plain line splitting, use lines
  const lines = trimmed
    .split('\n')
    .map(line => cleanAnswerText(line))
    .filter(line => line.length > 0);

  if (parsedChunks.length < expectedAnswerCount && lines.length >= parsedChunks.length) {
    parsedChunks = lines;
  }

  const answers: string[] = [];
  for (let i = 0; i < expectedAnswerCount; i++) {
    if (i < parsedChunks.length && parsedChunks[i]) {
      answers.push(parsedChunks[i]);
    } else {
      answers.push("NOT_FOUND");
    }
  }

  return answers;
}
