export class SseSerializer {
  serialize(event: { name: string; data: unknown }): string {
    return `event: ${event.name}\n` + `data: ${JSON.stringify(event.data)}\n\n`;
  }
}
