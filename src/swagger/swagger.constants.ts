export const OPENAPI_VERSION = '0.12.0';
// Semver kontraktu HTTP → openapi.json info.version
// MAJOR - breaking change w JSON (usunięte/zmienione pola wymagane)
// MINOR - additive (nowe pola opcjonalne, nowe kody błędów)
// PATCH - dokumentacja, opisy, bez zmian kontraktu

export const OPENAPI_SPEC_VERSION = '3.1.0';
// Wersja formatu specyfikacji OpenAPI → openapi.json klucz root "openapi" (nie semver API)
export const SWAGGER_UI_PATH = 'api-docs';
export const OPENAPI_OUTPUT_FILENAME = 'openapi.json';
