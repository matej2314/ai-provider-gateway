export type AnthropicSseEvent = {
  type: string;
  data: Record<string, unknown>;
};

export function parseAnthropicSseEvents(raw: string): AnthropicSseEvent[] {
  const events: AnthropicSseEvent[] = [];

  for (const block of raw.split('\n\n')) {
    const lines = block.split('\n').filter(Boolean);
    if (lines.length === 0) continue;

    let eventType = '';
    let dataLine = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLine = line.slice('data:'.length).trim();
      }
    }

    if (!eventType || !dataLine) continue;
    events.push({ type: eventType, data: JSON.parse(dataLine) });
  }

  return events;
}
