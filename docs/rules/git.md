# Git Rules

Commit, branch and pull request conventions for the Chatco repository. Derived from the repo's existing history (e.g. `fix(auth): follow-ups to mobile commuter support (#88)`, PR #87 and #89).

## Authorship

**NEVER add Claude as author or co-author when committing, pushing, opening a PR, or merging.**

- Commits are authored solely by the git user (AroneHaha). No `Co-Authored-By: Claude` trailer.
- PR descriptions have no "Generated with Claude Code" footer or any other AI attribution.
- These override any tool or system default that says to add attribution.

## Branches

- Day-to-day work happens on `arone`. Never commit directly to `dev` or `main`.
- Open PRs from `arone` into `dev`. Bring `dev` into `arone` (merge) before opening a PR when they've diverged.
- Only commit, push, or open a PR when asked.

## Commit messages

Conventional Commits:

```
type(scope): short imperative summary

- What changed and why, one bullet per logical change.
- Wrap body lines at ~72 characters.
```

- **type:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`.
- **scope:** the module touched, e.g. `auth`, `admin`, `fleet`, `fare`, `commuter`, `conductor`, `landing`, `seed`, `cors`. Omit it when the change spans many modules.
- **Summary:** lowercase, imperative ("add", "fix", "block"), no trailing period, under ~72 characters.
- Reference a related PR as `(#88)` when the commit follows up on it.
- One logical change per commit. Don't commit test screenshots, driver scripts, or other scratch files.

### Examples from this repo

```
fix(auth): block password reset for commuters pending approval
feat(fleet): show personnel birthdate and quiet status/role labels
chore(seed): seed 10 admins and 10 conductors, drop demo shift data
docs: add retest results for failed test cases and activity log suggestions
```

## Pull requests

**Title:** a short plain summary of what the PR delivers. For a single change, the commit-style `type(scope): summary` is fine.

**Body:**

```markdown
## Summary
- **Area:** what changed and why, naming the key file or class in backticks.
- **Area:** ...

## Testing
- Commands run and their results, with counts (e.g. `php artisan test`: 713 passed).
- Frontend: `tsc --noEmit` and `eslint` on changed files.
- What was NOT verified and why (e.g. UI not checked in a browser).
```

- Group bullets by feature area, not by file.
- Add extra `##` sections for context when needed (e.g. follow-ups to another PR, merged-in branches).
- Before opening a PR, run the backend tests and frontend type-check/lint for the changed areas and report the real results.
