# SPEC — Chat (standard) — `POST /chat`

## Cel / problem

Udostępnić jeden endpoint, który zwraca pełną odpowiedź LLM w spójnym formacie niezależnie od providera.

## Warunki wstępne (env)

Gateway musi działać na poprawnie zwalidowanym środowisku: w **`NODE_ENV=production`** obowiązuje **minimum jeden** niepusty klucz API spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (po `trim()`), zgodnie z `src/config/env.validation.ts` i `docs/konfiguracja.md`. Ponadto wymagany jest poprawny `gateway.config.yaml` (fail‑fast przy starcie).

**Stan implementacji:** nagłówek **`X-Gateway-Key`** — **wymagany** (`GatewayKeyGuard`, `openapi.json` security); allowlista z konfiguracji — `docs/konfiguracja.md`. Body **`params`** — zaplanowane (**Faza 5**); DTO i `openapi.json` przyjmują `modelAlias`, `messages` oraz opcjonalne **`conversationId`** (metryki Sentry — `docs/conversation-tracking.md`). **Cache odpowiedzi** dla czatu standardowego — **wdrożony** (`src/cache/`, `konfiguracja.md`).

## Użytkownicy i scenariusze

### Scenariusz A — prosta rozmowa

1. Klient wysyła `modelAlias` i `messages`.
2. Gateway wykonuje request do właściwego providera.
3. Klient dostaje JSON z odpowiedzią i metadanymi (provider, model, usage).

### Scenariusz C — powtórzone zapytanie z cache

1. Operator włącza cache (`CACHE_ENABLED`, ewentualnie Redis — `konfiguracja.md`).
2. Klient wysyła `POST /api/v1/chat` z określonym `modelAlias` i `messages`.
3. Przy drugim identycznym żądaniu (w granicach klucza cache — patrz implementacja `ResponseCacheService`) gateway może zwrócić odpowiedź z **`cached: true`** i **`cachedAt`** bez wywołania providera.

### Scenariusz D — wieloturowa rozmowa z metrykami Sentry

**Wariant zalecany (konwersacja w Sentry od drugiej tury):**

1. **Tura 1:** `POST /api/v1/chat` bez `conversationId` — tylko `messages: [user₁]`. Sentry: span `gen_ai.chat` **bez** `gen_ai.conversation.id` (pojedyncza wiadomość). Odpowiedź: `conversationId: conv_*` — klient zapisuje.
2. **Tura 2+:** ten sam `conversationId` w body + **pełna** `messages[]` (user₁, assistant₁ z odpowiedzi tury 1, user₂, …). Sentry: `gen_ai.conversation.id` + grupowanie w **Explore → Conversations**; w input spana widać historię w tym fragment startowy.
3. Gateway **nie** persistuje historii — klient musi dokładać odpowiedzi assistenta do `messages[]`.

**Wariant alternatywny:** klient generuje `conversationId` (UUID) już w turze 1 — wtedy Sentry grupuje od pierwszego wywołania.

Szczegóły: `docs/conversation-tracking.md`.

## Wymagania funkcjonalne

F-1. Endpoint przyjmuje request zawierający:

- `modelAlias` (string, wymagane),
- `messages[]` (wymagane),
- `conversationId` (string, opcjonalnie — w **request** włącza grupowanie Sentry; w **response** zawsze zwracane echo lub `conv_*`),
- `params` (opcjonalnie, planowane Faza 5).

F-2. `messages[]` wspiera role wyłącznie: `user`, `assistant` (rola `system` w API jest zablokowana).

F-2a. Gateway buduje `system` dla adaptera **wyłącznie z plików** w `src/config/system-prompt/` (warstwy MASTER / MAIN / opcjonalnie `models/<modelAlias>.md`), zgodnie z `ChatService` i `configuration.ts`. Do adaptera trafia `messages[]` zawierające wyłącznie `user` i `assistant`.

F-3. Gateway musi zwrócić odpowiedź w spójnym formacie niezależnym od providera.

F-4. Gateway musi dołączyć `provider` i resolved `model` do odpowiedzi.

F-5. Gateway powinien dołączyć `usage`, jeśli provider/SDK udostępnia te dane.

F-6. Nieznany `modelAlias` → `400` z `code=MODEL_ALIAS_NOT_FOUND` (`ProviderRegistryService.resolveModelAlias`, payload zachowywany przez `GlobalExceptionFilter`).

F-7. Limity DTO: `messages` — **1..50** elementów; `content` — max **3000** znaków na wiadomość (`chat-request.dto.ts`, `chat-message.dto.ts`). Nadwyżkowe pola w body → `400` (`ValidationPipe`: `whitelist` + `forbidNonWhitelisted`).

F-8. *(Opcjonalnie — cache odpowiedzi)* Gateway może zwracać zapisaną odpowiedź dla **`POST /api/v1/chat`** z polami **`cached: true`** i **`cachedAt`**, gdy włączony jest dostępny backend cache i istnieje pasujący wpis (`ResponseCacheService`). Streaming nie podlega cache.

F-9. *(Conversation tracking)* `conversationId` opcjonalne w żądaniu. Do Sentry (`gen_ai.conversation.id`) trafia **tylko** ID z body klienta; bez niego span jest logowany jako pojedyncze wywołanie. Gateway **zawsze** zwraca `conversationId` w odpowiedzi (echo lub `conv_<uuid>`). Klient od tury 2+ z ID musi wysyłać pełną historię w `messages[]` — patrz `conversation-tracking.md`.

## Wymagania niefunkcjonalne

NFR-1. Timeout wywołania providera jest kontrolowany polityką per alias.

NFR-2. Retry jest ograniczony do błędów 429/5xx i do maxAttempts z konfiguracji.

NFR-3. Odpowiedź nie może zawierać surowych sekretów ani surowych stack trace.

## Kryteria akceptacji

- [x] Dla poprawnego requestu gateway zwraca `200` i spójny JSON (`ChatService.executeChat`).
- [x] *(Cache)* Przy włączonym i dostępnym backendzie cache powtórzone identyczne żądanie `POST /api/v1/chat` może zwrócić odpowiedź z `cached: true` (szczegóły klucza: `ResponseCacheService`).
- [x] Dla nieznanego `modelAlias` gateway zwraca `400` z `code: MODEL_ALIAS_NOT_FOUND` (bez wywołania providera).
- [ ] Parametry są walidowane (allowlista + bounds); DTO nie przyjmuje jeszcze `params`.
- [x] `requestId` jest obecny w odpowiedzi sukcesu; propagacja z nagłówka `x-request-id` jest **aktywna** (`RequestIdMiddleware`). Response header `x-request-id` (poza body) nie jest jeszcze ustawiany.
- [x] Opcjonalne `conversationId` jest walidowane; do Sentry trafia tylko z requestu; w odpowiedzi echo lub `conv_*` (`ChatRequestDto`, `ChatService`, `SentryAiMetricsAdapter`).

## Poza zakresem (względem rdzenia MVP)

- Pamięć rozmowy i persistence po stronie gateway (klient nadal dostarcza `messages[]`).
- Narzędzia (MCP tool runner) wykonywane przez gateway.

