import { normalizeOpenAiContent } from './normalize-openai-content';

describe('normalizeOpenAiContent', () => {
  it('should return string content as-is', () => {
    expect(normalizeOpenAiContent('Hello world')).toBe('Hello world');
    expect(normalizeOpenAiContent('')).toBe('');
  });

  it('should extract and join text blocks from array content', () => {
    const content = [
      { type: 'text', text: 'First line' },
      { type: 'image', url: 'https://example.com/x' },
      { type: 'text', text: 'Second line' },
    ];

    expect(normalizeOpenAiContent(content)).toBe('First line\nSecond line');
  });

  it('should skip invalid array items', () => {
    const content = [
      { type: 'text', text: 'Valid' },
      null,
      { type: 'text' },
      { type: 'text', text: 123 },
      { text: 'no type' },
      { type: 'text', text: 'Also valid' },
    ];

    expect(normalizeOpenAiContent(content)).toBe('Valid\nAlso valid');
  });

  it('should preserve empty text blocks as blank lines', () => {
    expect(
      normalizeOpenAiContent([
        { type: 'text', text: 'First' },
        { type: 'text', text: '' },
        { type: 'text', text: 'Third' },
      ]),
    ).toBe('First\n\nThird');
  });

  it('should return empty string for non-string non-array input', () => {
    expect(normalizeOpenAiContent(null)).toBe('');
    expect(normalizeOpenAiContent(undefined)).toBe('');
    expect(normalizeOpenAiContent(123)).toBe('');
    expect(normalizeOpenAiContent([])).toBe('');
  });
});
