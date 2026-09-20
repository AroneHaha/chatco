    # Standing Rules

    NEVER ADD CLAUDE AS AUTHOR or CO-AUTHOR WHEN PUSHING/DOING PR/MERGING ON REPO

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