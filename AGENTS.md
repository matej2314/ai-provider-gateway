# Agent Instructions

## Context Priority Hierarchy

**MANDATORY**: Every agent working in this repository MUST follow this context priority hierarchy when gathering information about the codebase:

### 1. Source Code (`@src`)
**Priority: HIGHEST**
- The source of truth for actual implementation
- Always check `@src` first for current code, logic, structure, and implementation details
- Use when you need to understand how something is actually implemented

### 2. Knowledge Graph (`@graphify-out`)
**Priority: HIGH**
- Architecture overview and cross-file dependencies
- Use `graphify query "<question>"` for architecture questions
- Use `graphify path "<A>" "<B>"` for dependency paths between symbols
- Use `graphify explain "<concept>"` for concept-related nodes
- Provides INFERRED edges that grep/read cannot find
- Use when you need to understand relationships, architecture, or find symbols

### 3. API Specification (`@openapi.json`)
**Priority: MEDIUM**
- Formal API contract and endpoint definitions
- Use for understanding API routes, request/response schemas, and external interfaces
- The contract that must be honored by implementations

### 4. Documentation (`@docs/`)
**Priority: LOW (supplementary)
- Additional context, design decisions, and developer notes
- Use for understanding rationale, patterns, and conventions
- May not always be up-to-date with implementation

## Workflow

When starting any task:

1. **Start with `@graphify-out`** to orient yourself in the codebase structure
2. **Drill into `@src`** for specific implementation details
3. **Cross-reference `@openapi.json`** when working with API endpoints
4. **Consult `@docs/`** for additional context or design decisions

## Examples

### Example 1: Implementing a new feature
```
1. graphify query "authentication flow" → understand current auth architecture
2. Read @src files identified by graphify → see actual implementation
3. Check @openapi.json → ensure API contract compliance
4. Review @docs/ → understand design patterns and conventions
```

### Example 2: Debugging an issue
```
1. graphify path "errorHandler" "logging" → find dependency chain
2. Read @src error handling code → analyze implementation
3. Check @openapi.json → verify expected API behavior
4. Review @docs/ → check if behavior is documented
```

### Example 3: Understanding API endpoints
```
1. Read @openapi.json → see endpoint definitions
2. graphify query "POST /api/endpoint" → find related code
3. Read @src route handlers → understand implementation
4. Check @docs/ → see usage examples or notes
```

## Notes

- **Never skip `graphify-out`** when exploring unfamiliar parts of the codebase
- **Always verify against `@src`** as the ultimate source of truth
- **Keep `@openapi.json` in sync** when modifying API endpoints
- **Update `@docs/`** when implementation deviates from documentation
- After modifying files in `@src`, run `graphify update .` to keep the graph current
