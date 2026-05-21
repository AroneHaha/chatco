---
Task ID: 1
Agent: Main Agent
Task: Verify ERD alignment with frontend flows

Work Log:
- Explored full project structure — current project is a blank Next.js scaffold
- Read generate-erd-doc.js (1504 lines) containing complete ERD specification
- Mapped all 34 tables against 33+ frontend pages/forms
- Identified 6 critical gaps in ERD vs frontend requirements
- Verified all FK relationships and polymorphic references
- Replaced all 5 JSONB fields with proper scalar types
- Added 3 missing fields (vehicles.lat/lng, share_ride_tokens.vehicle_id, hail_records.commuter_name)
- Generated updated DBML-format ERD with all fixes

Stage Summary:
- ERD mostly works but had 6 issues (3 critical, 3 moderate)
- Critical: vehicles missing lat/lng, share_ride_tokens missing vehicle_id, JSONB types
- Moderate: hail_records missing commuter_name, polymorphic FKs, notification_templates explanation
- Final ERD: 34 tables, all JSONB replaced with VARCHAR, 3 fields added
