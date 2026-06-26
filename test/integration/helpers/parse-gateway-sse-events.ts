export type GatewaySseEvent = {
  event: string;
  data: Record<string, unknown>;
};

export function parseGatewaySseEvents(raw: string): GatewaySseEvent[] {
  const events: GatewaySseEvent[] = [];

  for (const block of raw.split('\n\n')) {
    const lines = block.split('\n').filter(Boolean);
    if (lines.length === 0) continue;

    let eventName = 'message';
    let dataLine = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLine = line.slice('data:'.length).trim();
      }
    }

    if (!dataLine) continue;
    events.push({ event: eventName, data: JSON.parse(dataLine) });
  }
  return events;
}
