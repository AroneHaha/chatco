Perform a FULL REPOSITORY STRUCTURE, MAINTAINABILITY, AND CODE ORGANIZATION AUDIT for this repository:

[CHATCO Repository](https://github.com/AroneHaha/chatco)

MAIN OBJECTIVE:
Analyze the current file/folder organization, code structure, maintainability, modularity, and scalability of the codebase, then determine how to reorganize it into a cleaner, more professional, scalable, and easier-to-navigate architecture WITHOUT breaking existing functionality.

IMPORTANT RULES:

DO NOT assume architecture intentions.
DO NOT suggest unnecessary enterprise-level complexity.
DO NOT rewrite the entire project from scratch.
DO NOT recommend random folder movement without reasoning.
ALL findings must come from the ACTUAL codebase structure and implementation.
Preserve current functionality and current business logic.
If something is unclear from the repository structure, explicitly state that it is unclear instead of assuming.
Focus on practical maintainability and professional development practices.

IMPORTANT CONTEXT:
Current system decisions:

wallet system removed
direct GCash QR payment only
commuters can see all units
hail action restricted by 1KM radius only

The organization audit must respect the CURRENT architecture and latest business rules.

MAIN AUDIT GOALS:

Determine whether the current structure is maintainable long-term.
Detect oversized or overloaded files/components.
Identify poor separation of concerns.
Improve scalability and developer navigation.
Improve readability and maintainability.
Reduce future merge conflicts and duplicated logic.
Create a cleaner professional project structure.

ANALYZE THE FOLLOWING:

A. FILE SIZE & RESPONSIBILITY AUDIT
Find:

files with excessive line counts
components/pages exceeding reasonable responsibility
files doing multiple unrelated jobs
“god components”
bloated controllers/services/hooks
duplicated UI logic
duplicated business logic
repeated API handling
repeated state handling
mixed UI + business logic in same file
mixed socket/API/database logic in same file

IMPORTANT:
Do NOT recommend splitting files ONLY because they are long.
Check whether the file is actually overloaded or violating separation of concerns.

For each oversized/problematic file:
Provide:

exact file path
approximate responsibility overload
what responsibilities should be separated
suggested modular breakdown

Example:

frontend/src/pages/CommuterDashboard.jsx
Problems:

handles map rendering
GPS polling
hail logic
payment modal logic
socket listeners
notification rendering

Suggested separation:

components/maps/
hooks/location/
services/hailing/
modals/payment/
sockets/

B. PROFESSIONAL FOLDER STRUCTURE REVIEW
Analyze whether the current folder structure follows clean and scalable practices.

Check:

feature-based organization
domain separation
reusable/shared modules
route organization
hooks organization
service abstraction
component hierarchy
API layer structure
backend module separation
middleware organization
utility/helper structure
socket/event organization
state management organization
naming consistency
discoverability of files
logical grouping of related functionality

Identify:

confusing folder placement
duplicated folders
unclear naming
deeply nested unnecessary folders
unrelated files grouped together
feature leakage across directories
missing abstraction layers
poor shared/common separation

C. FRONTEND STRUCTURE REVIEW
Analyze:

pages
layouts
reusable components
feature-specific components
hooks
state management
services
utilities
API handling
modals
real-time listeners
map/GPS logic
payment logic
role-specific flows

Determine whether:

reusable logic is properly abstracted
components are reusable enough
business logic improperly exists inside UI files
role-specific logic is scattered
large pages should become feature modules

D. BACKEND STRUCTURE REVIEW
Analyze:

controllers
routes
services
middleware
models
validation
database access
sockets/events
helpers/utilities
transaction handling
role handling

Identify:

controllers doing too much
missing service layers
duplicated validation
inconsistent API organization
poor modular separation
mixed responsibilities
fragile architecture

E. MODULARIZATION OPPORTUNITIES
Identify opportunities to create:

reusable hooks
reusable services
reusable UI components
shared utilities
shared validation
feature modules
shared socket handlers
shared API clients
centralized constants/configurations

IMPORTANT:
Recommendations must match the ACTUAL scale of the project.
Avoid overengineering.

F. PROFESSIONAL STRUCTURE RECOMMENDATIONS
Suggest a cleaner and more scalable organization structure.

Examples:

feature-based structure
domain-based modules
shared/common abstractions
role-based separation
service abstraction
route grouping
component categorization
modular socket architecture

Provide:

suggested folder structures
suggested file placement
grouping improvements
naming improvements
modularization strategy

IMPORTANT:

recommendations must be realistic
preserve maintainability
preserve readability
avoid unnecessary complexity
avoid deeply nested architecture unless justified

G. PRIORITY ASSESSMENT
Separate findings into:

Critical maintainability problems
Recommended refactors
Optional cleanup improvements

OUTPUT FORMAT:

Current Structure Assessment
Oversized/Overloaded Files
Separation of Concerns Problems
Frontend Organization Issues
Backend Organization Issues
Modularization Opportunities
Suggested Professional Structure
Refactor Priorities
Exact File Paths Involved
Risk Level of Current Maintainability

IMPORTANT FINAL RULES:

DO NOT rewrite files immediately.
DO NOT suggest unnecessary rewrites.
DO NOT assume intended architecture.
DO NOT prioritize aesthetics over maintainability.
Recommendations must be based on ACTUAL codebase structure and implementation.
If workflow ownership or responsibility boundaries are unclear:
ASK BRIEF QUESTIONS FIRST before suggesting major structural changes.