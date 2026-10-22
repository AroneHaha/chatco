# Standing Rules

These rules apply to all work in this repository and must be followed without being restated.

1. **Migrations first, new files only as last resort.** When adding new data or an input to an existing module that must be saved in the database, check existing migrations first to see if the necessary changes can be made by modifying existing files. Prioritize this to avoid unnecessary migration files and long-term issues. Only create a new migration file if modifying an existing one is not possible or appropriate.

2. **Optimize data access and system performance**. When adding, modifying, or fixing a feature or module, use an optimized approach for data saving, fetching, processing, and synchronization. Consider indexing, caching, query efficiency, race conditions and concurrency, transactions, batching, pagination, debouncing, validation, API request efficiency, state synchronization, and other relevant performance, reliability, and scalability factors where applicable. Do not introduce unnecessary optimization or complexity when it provides no meaningful benefit.

3. **Preserve existing data-handling approach when modifying.** When modifying an existing module or feature, preserve the current approach for handling data, including how it is fetched and saved. Do not change the existing architecture, structure, API approach, or data-handling strategy unless necessary for the requested change. Strictly modify only what is instructed to maintain the system's integrity and existing structure.

4. **Fix root causes, not symptoms.** Do not apply superficial or easy fixes. Fully understand the issue and identify its root cause first. Ensure the solution addresses the underlying problem and consider its impact on related features or modules so the fix doesn't cause problems elsewhere.

5. **Stay strictly within scope.** Do not change existing structure, architecture, or implementation approach unless the instruction explicitly requires it. Follow given instructions strictly and keep changes within the requested scope. Avoid unrelated changes, unrelated refactoring, modifying other features/modules, or introducing new approaches outside the task's scope. Only make additional changes when necessary to properly implement the requested functionality, fix its root cause, or maintain system integrity.

6. **Do not duplicate existing functionality.**
Before creating a new function, hook, service, utility, API endpoint, query, component, or validation rule, search the codebase for an existing implementation that can be reused or extended appropriately.

7. **Validate error and edge cases.**
Do not test only the normal/success path. Consider relevant failure states, loading states, empty states, duplicate actions, concurrent requests, stale data, network interruptions, authentication/authorization, and other edge cases related to the change.

8. **Do not silently change requirements.**
If an implementation detail conflicts with the existing architecture or the requested behavior, do not silently reinterpret the requirement. Explain the conflict and determine the appropriate approach before making a broader change.

9. **Document important implementation decisions.**
For non-obvious fixes, briefly explain what caused the issue, what was changed, why that change addresses the root cause, and any relevant side effects or limitations.

10. **Verify the diagnosis before implementing the fix.**
If a suspected root cause or solution is provided, treat it as a hypothesis unless the code confirms it. Verify the actual behavior and root cause before modifying anything. Do not force the implementation to match an assumed diagnosis.

11. **Check related flows before finalizing.**
After making a change, inspect related functionality that uses the same API, state, component, service, database data, or shared logic. Make sure the fix does not unintentionally affect other user roles, pages, devices, or workflows.

# UI Rules

These apply to every UI change and override `docs/DESIGN.md` where the two conflict (e.g. its tinted status badges and glow shadows).

1. **No transparent fills.** Buttons, toggles, filter options, cards, panels and badges use solid backgrounds. Don't use low-opacity fills such as `bg-white/5`, `bg-amber-500/20` or `bg-transparent` with a border to make a control look tinted or see-through. A secondary action gets a solid neutral surface with a border; the selected/primary one gets solid CHATCO Blue. Modal scrims (`bg-black/50`) are the only exception.
2. **No neon colours.** No glow shadows (`shadow-[#1A5FB4]/30`, coloured `shadow-*`), saturated neon accents or gradient text. Use the existing navy, CHATCO Blue and neutral greys.
3. **No colour coding.** Don't give items, categories, payment methods, status options or menu entries their own colour. Tell them apart with labels, plain neutral text, and an icon where it adds meaning. CHATCO Blue marks the selected or primary item only. Red is kept for errors and destructive actions. Use any other colour only when the user explicitly asks for it on that element.

# Git

**NEVER add Claude as author or co-author when committing, pushing, opening a PR, or merging.**

Follow `docs/rules/git.md` for authorship, branches, commit messages and PR format:

@docs/rules/git.md

# Project Docs

Project documentation lives in `docs/` (`design/`, `api/`, `rules/`, `test-cases/<MM_DD_YYYY>/`). The files below are imported so they load automatically every session: follow PRODUCT.md for product and user decisions, and DESIGN.md for any UI or visual work. They stay directly in `docs/` because the impeccable design tooling only finds them there.

@docs/PRODUCT.md
@docs/DESIGN.md
