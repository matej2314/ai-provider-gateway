import {
  brand,
  unbrand,
  asRequestId,
  asConversationId,
  type RequestId,
  type ConversationId,
} from './branded.types';
import {
  createConversationId,
  isConversationId,
  createRequestId,
  isRequestId,
} from './branded.guards';

const VALID_CONV = 'conv_123e4567-e89b-12d3-a456-426614174000';
const VALID_REQ = 'req_123e4567-e89b-12d3-a456-426614174000';

describe('brand / unbrand', () => {
  it('brand is runtime no-op', () => {
    const raw = VALID_REQ;
    const id: RequestId = brand(raw as RequestId);
    expect(id).toBe(raw);
  });

  it('unbrand extracts primitive from RequestId', () => {
    const id = asRequestId(VALID_REQ);
    expect(unbrand(id)).toBe(VALID_REQ);
  });

  it('unbrand extracts primitive from ConversationId', () => {
    const id = asConversationId(VALID_CONV);
    expect(unbrand(id)).toBe(VALID_CONV);
  });
});

describe('asRequestId / asConversationId', () => {
  it('casts without runtime validation', () => {
    expect(asRequestId('req_custom_client_id')).toBe('req_custom_client_id');
    expect(asConversationId(VALID_CONV)).toBe(VALID_CONV);
  });
});

describe('createConversationId', () => {
  it('accepts valid conv_<uuid>', () => {
    expect(createConversationId(VALID_CONV)).toBe(VALID_CONV);
  });

  it('throws on invalid format', () => {
    expect(() => createConversationId('conv_abc')).toThrow(
      /Invalid ConversationId format/,
    );
    expect(() => createConversationId('req_' + VALID_CONV.slice(5))).toThrow();
  });
});

describe('isConversationId', () => {
  it('returns true for valid id', () => {
    expect(isConversationId(VALID_CONV)).toBe(true);
  });

  it('returns false for invalid id', () => {
    expect(isConversationId('conv_bad')).toBe(false);
    expect(isConversationId('')).toBe(false);
  });
});

describe('createRequestId', () => {
  it('accepts valid req_<uuid>', () => {
    expect(createRequestId(VALID_REQ)).toBe(VALID_REQ);
  });

  it('throws on invalid format', () => {
    expect(() => createRequestId('req_1')).toThrow(/Invalid RequestId format/);
  });
});

describe('isRequestId', () => {
  it('returns true for valid id', () => {
    expect(isRequestId(VALID_REQ)).toBe(true);
  });

  it('returns false for invalid id', () => {
    expect(isRequestId('req-123')).toBe(false);
  });
});
