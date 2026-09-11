# Standing Rules

These rules apply to all work in this repository and must be followed without being restated.

1. **Migrations first, new files only as last resort.** When adding new data or an input to an existing module that must be saved in the database, check existing migrations first to see if the necessary changes can be made by modifying existing files. Prioritize this to avoid unnecessary migration files and long-term issues. Only create a new migration file if modifying an existing one is not possible or appropriate.

2. **Optimize data access.** When adding anything related to a feature or module, use an optimized approach for saving and fetching data. Consider indexing, caching, query efficiency, race conditions and concurrency, transactions, batching, pagination, debouncing, validation, and other relevant performance, reliability, and scalability factors where applicable.

3. **Preserve existing data-handling approach when modifying.** When modifying an existing module or feature, preserve the current approach for handling data, including how it is fetched and saved. Do not change the existing architecture, structure, API approach, or data-handling strategy unless necessary for the requested change. Strictly modify only what is instructed to maintain the system's integrity and existing structure.

4. **Fix root causes, not symptoms.** Do not apply superficial or easy fixes. Fully understand the issue and identify its root cause first. Ensure the solution addresses the underlying problem and consider its impact on related features or modules so the fix doesn't cause problems elsewhere.

5. **Stay strictly within scope.** Do not change existing structure, architecture, or implementation approach unless the instruction explicitly requires it. Follow given instructions strictly and keep changes within the requested scope. Avoid unrelated changes, unrelated refactoring, modifying other features/modules, or introducing new approaches outside the task's scope. Only make additional changes when necessary to properly implement the requested functionality, fix its root cause, or maintain system integrity.
