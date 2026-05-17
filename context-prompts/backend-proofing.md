COMPLETE PROMPT — REPOSITORY BACKEND-PROOFING, FLOW VALIDATION, AND SYSTEM ALIGNMENT AUDIT

Perform a FULL SYSTEM ARCHITECTURE AUDIT and BACKEND-PROOFING VALIDATION for this repository:

[CHATCO Repository](https://github.com/AroneHaha/chatco)

MAIN OBJECTIVE

Determine whether the current system is already backend-proof, scalable, logically aligned, maintainable, and safe for future implementations and expansion.

The audit must focus on:

architecture stability
backend-proofing
flow validation
scalability
maintainability
role/process correctness
frontend ↔ backend alignment

IMPORTANT:
This task is NOT a UI redesign task.
DO NOT modify, redesign, modernize, beautify, or restructure the UI unless a UI element directly causes backend-proofing, logic, security, synchronization, or architectural issues.

Focus on:

logic correctness
architecture integrity
validation
scalability
separation of concerns
system flow alignment
backend reliability

UI styling, visual cleanup, animations, spacing, colors, typography, and aesthetic refactors are OUT OF SCOPE unless they directly affect functionality or architectural integrity.

IMPORTANT RULES
DO NOT assume missing functionality exists.
DO NOT invent workflows, APIs, database structures, business rules, or hidden logic.
ALL findings must come directly from the ACTUAL codebase.
If something is unclear or incomplete, explicitly state that it is unclear from the current implementation.
Before suggesting major structural changes, ask brief clarification questions if role/process logic is uncertain.
Focus ONLY on truth from the repository.
Validate actual implementation behavior, not intended behavior.
If frontend behavior contradicts backend enforcement, explicitly identify the contradiction.
DO NOT silently ignore dead code, stale logic, or partially removed systems.
DO NOT prioritize folder cleanup or code beautification over backend-proofing concerns.
DO NOT rewrite files immediately.
DO NOT generate replacement code unless explicitly requested later.
CURRENT SYSTEM DECISIONS (MUST OVERRIDE OLD LOGIC)

These decisions are FINAL and must override any older repository logic:

Wallet system is REMOVED.
No internal wallet, stored balance, top-up, or in-app funds system should exist.
GCash QR payment still exists ONLY as direct external payment processing.
QR payment must NOT behave like an internal wallet.
Commuters can SEE ALL jeepney units at all times.
ONLY the hail interaction/button should depend on the 1KM radius rule.
Hail action must only be enabled when commuter is within 1KM radius of the conductor/unit.

If old wallet logic still exists:

identify it
trace affected files
determine whether it still affects active flows
determine whether it creates architectural risk
AUDIT SCOPE
A. BACKEND-PROOFING VALIDATION

Analyze whether the current architecture is stable, modular, maintainable, scalable, and safe for future development.

Check:
backend structure
frontend/backend separation
API structure consistency
business logic placement
controller responsibilities
service abstraction
middleware usage
authentication/authorization handling
role isolation
database relationships
real-time architecture
socket/event structure
state management
transaction handling
scalability
maintainability
modularity
separation of concerns
feature boundaries
reusable logic structure
validation placement
API security
concurrency handling
async event handling
caching/state synchronization risks
Identify:
tightly coupled modules
duplicated logic
frontend-only critical validation
fragile architecture
unsafe assumptions
hidden dependencies
circular dependencies
stale/outdated architecture remnants
dead wallet-system code
improper real-time synchronization
race conditions
inconsistent API patterns
backend logic leaking into frontend
poor scalability decisions
future maintenance risks
improper responsibility distribution
direct database access from frontend logic
weak abstraction layers
hardcoded role logic
duplicated role validation
unsafe trust in frontend state
B. UI ↔ BACKEND ALIGNMENT VALIDATION

Verify whether the ACTUAL frontend behavior matches backend logic and intended operational flow.

Check:
commuter flow
conductor flow
admin flow
login/authentication flow
route protection
role restrictions
GPS/map rendering
hail process
GCash QR payment flow
SOS flow
fleet monitoring flow
notifications
conditional rendering
loading/error states
disabled/enabled states
displayed labels/messages
live updates
transaction states
real-time state synchronization
Validate whether:
frontend displays correct backend data
frontend behavior matches actual backend restrictions
role permissions are enforced properly
UI allows invalid actions
backend rejects invalid operations
frontend state can desync from backend
stale GPS data breaks logic
hail restrictions can be bypassed
payment success can be spoofed
disabled UI actions are still callable through APIs
backend independently validates all sensitive operations
IMPORTANT VALIDATION RULE

Commuters MUST still see ALL jeepney units.

ONLY the hail interaction should depend on the 1KM rule.

Audit whether:

frontend incorrectly hides units
backend incorrectly filters units
API responses incorrectly restrict visibility
frontend-only radius checks can be bypassed
radius validation also exists securely on backend
C. GCASH QR PAYMENT VALIDATION

Audit the QR payment architecture and determine whether it is properly separated from the removed wallet system.

Verify:
QR generation flow
transaction-specific QR handling
payment confirmation flow
synchronization between commuter and conductor devices
backend validation of payment
persistence of transaction states
duplicate payment protection
transaction lifecycle handling
separation from removed wallet system
payment verification authority
spoofing protection
transaction ownership validation
Identify:
wallet remnants still attached to QR logic
unsafe frontend-only confirmations
incomplete transaction validation
misleading “wallet/balance/top-up” terminology
fake payment confirmation risks
reusable/stale QR vulnerabilities
incomplete payment state cleanup
missing transaction expiration handling
D. ROLE & PROCESS CONNECTION VALIDATION

Validate actual interaction and operational flow between:

commuter
conductor
admin
Check:
data visibility
role permissions
live event flow
conductor assignment logic
commuter-to-conductor interaction
admin monitoring capabilities
middleware enforcement
route/API protection
real-time updates between roles
cross-role state synchronization
Identify:
role leaks
unauthorized access risks
inconsistent permissions
disconnected flows
unclear operational logic
backend routes missing protection
frontend role-only restrictions without backend enforcement
admin privilege escalation risks
conductor data exposure issues
E. FINAL VERDICT

Determine whether:

BACKEND-PROOFING IS STABLE

OR

BACKEND-PROOFING STILL HAS MAJOR CONCERNS

If major concerns exist:

prioritize backend-proofing concerns FIRST
prioritize architectural stability FIRST
prioritize logic validation FIRST
prioritize flow correctness FIRST
DO NOT focus on folder cleanup yet
DO NOT prioritize UI cleanup/refactoring yet

If stable:

confirm whether the project is ready for:
professional organization improvements
scaling
optimization
future modularization
feature expansion
REQUIRED OUTPUT FORMAT
Current Architecture Assessment
Confirmed Backend-Proofing Issues
UI ↔ Backend Misalignments
Role/Flow Problems
Payment Architecture Issues
Scalability & Maintainability Risks
Dead/Stale Wallet-System Remnants
Exact File Paths Involved
Stability Verdict
Recommended Next Priority
FINAL IMPORTANT INSTRUCTIONS
DO NOT rewrite files immediately.
DO NOT generate replacement implementations yet.
DO NOT redesign the UI.
DO NOT focus on visual refactoring.
DO NOT assume intended behavior equals actual behavior.
DO NOT silently ignore contradictions.
Ask brief clarification questions FIRST if operational flow or role logic is unclear.
All conclusions must be directly traceable to the actual repository implementation.