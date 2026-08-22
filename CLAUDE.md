# Claude Code — project instructions

This repository uses a **tool-agnostic** agent layout. Do not treat `.claude/` as the source of truth for skills or general agent rules.

## Mandatory: read `AGENTS.md`

At the start of work in this repo (and whenever orientation is needed), **read and follow** [`AGENTS.md`](AGENTS.md).

It defines the context priority hierarchy (`src` → `graphify-out` → `openapi.json` → `docs/`), exploration workflow, and graphify requirements. Those rules apply fully in Claude Code sessions.

## Mandatory: agent skills from `.agents/skills/`

Project skills live **only** under [`.agents/skills/`](.agents/skills/). Each skill is a directory with `SKILL.md`.

1. When a task matches a skill (setup, config, `/skill-name`, or an equivalent user request), **read that skill’s `SKILL.md` and follow it exactly**.
2. Discover available skills by listing `.agents/skills/*/SKILL.md` (read frontmatter `name` / `description` to choose).
3. Do **not** maintain or prefer duplicate skill bodies under `.claude/skills/` or `.claude/<skill-name>/`. If such paths exist, ignore them as copies; execute the version under `.agents/skills/`.
4. Do **not** invent parallel workflows that bypass an existing skill when one applies.

Known skills (non-exhaustive — always verify on disk):

| Skill | Path | Rola |
|-------|------|------|
| `gateway-setup` | `.agents/skills/gateway-setup/SKILL.md` | Bootstrap od zera (`config:init --agent`) |
| `gateway-config` | `.agents/skills/gateway-config/SKILL.md` | Jedna mutacja CRUD (provider/model/client) |

## Scope

- `CLAUDE.md` = Claude Code entrypoint pointing at shared project agent docs and skills.
- `AGENTS.md` = shared agent rules for all tools.
- `.agents/skills/` = shared, canonical skill definitions.
