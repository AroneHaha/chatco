Perform a STRICT CODEBASE AUDIT and FEATURE ALIGNMENT REVIEW for this repository:

[CHATCO Repository](https://github.com/AroneHaha/chatco)

IMPORTANT RULES:

DO NOT assume features exist unless confirmed directly from the actual codebase.
DO NOT invent missing backend logic, frontend behavior, APIs, database structures, workflows, or intended functionality.
DO NOT suggest “possible” implementations unless explicitly marked as a recommendation separate from the audit.
Every finding must come from REAL existing code, actual file structure, imports, routes, components, database usage, API calls, state management, UI rendering, or business logic.
If something is unclear, incomplete, disconnected, contradictory, or partially implemented, clearly state that it is unclear from the current codebase instead of assuming.
Before recommending modifications to unclear role flow or business logic, ask brief clarification questions first.
Focus ONLY on TRUTH FROM THE CODEBASE.

CURRENT SYSTEM DECISIONS (LATEST — MUST OVERRIDE OLD LOGIC):

WALLET SYSTEM IS COMPLETELY REMOVED
The old wallet system no longer exists.

REMOVE or FLAG anything related to:

stored wallet balance
wallet top-up
wallet ledger/history
internal e-wallet
commuter account balance
wallet transfers
QR wallet funding
stored digital funds
wallet transaction accounting
wallet-specific APIs or database tables

There should be NO:

wallet module
wallet page
wallet dashboard
balance display
top-up feature
internal payment transfer system
GCash QR PAYMENT STILL EXISTS (IMPORTANT)
QR functionality is STILL VALID only for DIRECT GCash payment processing.

EXPECTED PAYMENT FLOW:

Conductor selects “GCash Payment” for a commuter fare transaction.
System displays/generates a dynamic QR tied to that specific transaction.
Commuter scans the QR using the GCash app.
After successful payment:
commuter side reflects successful payment
conductor side reflects successful payment
transaction status synchronizes correctly between devices
This is ONLY an external direct GCash transaction.
This MUST NOT behave like an internal wallet system.

IMPORTANT:

DO NOT recommend deleting QR-related files if they are required for GCash payment flow.
ONLY remove QR logic tied to the OLD wallet system.
HAILING LOGIC UPDATE
Commuters must STILL be able to VIEW ALL JEEPNEY UNITS on the route.

HOWEVER:

commuters CANNOT use/click the hail feature unless they are within a 1KM radius of the conductor/unit location.

This restriction must be properly enforced in:

frontend UI
backend validation
API validation
map behavior
button states
displayed messages
role permissions
real-time updates

IMPORTANT:

visibility of units must NOT depend on distance
ONLY hail interaction should depend on the 1KM rule

MAIN OBJECTIVE:
Analyze whether EVERYTHING is properly aligned with:

frontend flow
UI behavior
displayed data
actual backend logic
role interaction
intended user experience
latest business rules
latest system decisions

AUDIT TASKS:

WALLET/OLD PAYMENT SYSTEM REMOVAL AUDIT
Find ALL remaining files, references, logic, APIs, UI elements, database structures, imports, hooks, components, utilities, routes, and backend logic related to the OLD wallet system.

For EVERY unnecessary wallet-related file found:
USE THIS EXACT FORMAT:

DELETE: path/filename

Examples:

DELETE: frontend/src/pages/wallet.jsx
DELETE: backend/controllers/WalletController.php

Also identify:

dead code
broken imports
outdated routes
orphaned components
wallet-related database dependencies
balance references
top-up references
unused APIs
UI still mentioning wallet/balance
hidden dependencies connected to removed wallet logic

IMPORTANT:
Do NOT falsely classify valid GCash QR payment logic as wallet logic.

GCash QR PAYMENT FLOW VALIDATION
Audit the REAL implementation of the QR payment process.

Verify:

whether QR generation is transaction-specific
whether QR logic is properly separated from removed wallet logic
whether commuter and conductor transaction states synchronize correctly
whether payment success is validated properly
whether backend verification exists
whether frontend-only success spoofing is possible
whether refresh/reconnect breaks transaction state
whether duplicate payment problems may occur
whether transaction lifecycle handling is complete
whether payment statuses persist correctly
whether payment-related UI text still incorrectly references wallet/balance terminology

If unclear:

explicitly say the implementation is unclear or incomplete from the current codebase
FRONTEND FLOW & UI ALIGNMENT REVIEW
Analyze whether actual frontend behavior truly matches intended UX.

Check:

commuter flow
conductor flow
admin flow
login/authentication flow
map behavior
GPS/unit rendering
hailing process
GCash QR payment flow
fleet monitoring flow
SOS flow
notification behavior
role restrictions
disabled/enabled buttons
loading states
error states
route guards
conditional rendering
real-time updates
displayed text/labels/messages
navigation flow

Identify:

mismatched UI behavior
outdated labels/messages
actions allowed when they should not be allowed
hidden broken states
inconsistent frontend/backend behavior
misleading displays
duplicated logic
unnecessary rerenders
stale state handling
conflicting feature logic
ROLE CONNECTION & SYSTEM PROCESS VALIDATION
Validate the REAL connection and workflow between:
commuter
conductor
admin

Verify whether each role:

sees only intended data
can only access intended actions
receives correct live updates
follows intended operational flow

Check:

middleware
route protection
API authorization
database relationships
real-time events
conductor assignment logic
commuter-to-conductor interaction flow
admin monitoring capabilities
improper role leaks

If role behavior is unclear:
ASK BRIEF QUESTIONS FIRST before suggesting changes.

1KM HAIL RESTRICTION VALIDATION
Verify whether the 1KM restriction is FULLY enforced correctly.

Check:

where distance is calculated
whether validation exists in frontend only or backend too
whether commuters can bypass disabled buttons
whether APIs reject invalid hail attempts
whether stale GPS data can break restrictions
whether unit visibility incorrectly depends on distance
whether conductor movement updates correctly affect hail availability
whether frontend messages properly explain restrictions

IMPORTANT:

commuters MUST still SEE ALL UNITS
ONLY hail interaction must be restricted by distance
BACKPROOFING / ARCHITECTURE REVIEW
Analyze the system for:
scalability concerns
fragile logic
race conditions
inconsistent state handling
duplicated business logic
missing validation
frontend/backend mismatch
unsafe assumptions
hidden wallet dependencies
improper real-time synchronization
stale GPS handling
poor separation of concerns
API misuse
transaction inconsistencies
excessive polling/rendering
possible concurrency problems
exploitable frontend-only validation
OUTPUT FORMAT REQUIREMENTS
For EVERY issue found:
explain WHAT exists
explain WHY it is problematic
explain WHETHER it conflicts with latest system decisions
provide EXACT FILE PATHS
clearly separate:
confirmed issues
unclear/incomplete implementations
recommendations

IMPORTANT:

DO NOT rewrite or modify files immediately
DO NOT assume intended behavior
DO NOT silently ignore contradictions
DO NOT invent missing backend systems
DO NOT guess architecture intentions

If any workflow, role interaction, payment process, or business logic is unclear from the codebase:
ASK BRIEF QUESTIONS FIRST before suggesting modifications.