# Security Specification: SI Literasi SMAN 2 Samarinda

## Data Invariants
1. A user document in `/users/{userId}` must match the authenticated user UID or be managed by a verified Admin (`firdaustommy89@gmail.com`).
2. An entry in `/literacy_entries/{entryId}` cannot be created without a valid student identifier, date, literacyType, bookTitle, and required fields.
3. A student can only edit their own entries and cannot modify teacher validation scores or feedback.
4. Only a verified teacher or admin can perform teacher validation (`teacherValidation`, `totalFinalScore`) on an entry.
5. Once an entry has been validated, student text fields are locked against arbitrary alteration unless requested for revision.
6. Admins (`firdaustommy89@gmail.com` or users in `/admins/{adminId}`) have administrative management rights.

## The "Dirty Dozen" Payloads (Designed to Fail)
1. **Unauthenticated Write**: An unauthenticated user attempts to create or mutate an entry in `/literacy_entries/entry-999`. Expected: PERMISSION_DENIED.
2. **Identity Spoofing**: An authenticated student attempts to set `studentId: "other-user-uid"` on a new entry. Expected: PERMISSION_DENIED.
3. **Privilege Escalation**: A regular student attempts to write or update `role: "admin"` in their user profile document. Expected: PERMISSION_DENIED.
4. **Self-Validation Tampering**: A student attempts to populate `teacherValidation.validationScore: 80` or `totalFinalScore: 100` during entry creation or update. Expected: PERMISSION_DENIED.
5. **Path Variable ID Injection**: An attacker attempts to create a document with an ID containing illegal characters or > 128 characters (e.g., `../../etc/passwd`). Expected: PERMISSION_DENIED.
6. **Shadow Field Attack**: An attacker injects unrecognized fields (`ghostField: true`) during entry creation. Expected: PERMISSION_DENIED.
7. **Type Poisoning**: Sending string for `durationMinutes` or number for `summary`. Expected: PERMISSION_DENIED.
8. **Resource Exhaustion**: Sending a 5MB payload in `summary` exceeding the 5,000 character limit. Expected: PERMISSION_DENIED.
9. **Admin Spoofing without Email Verification**: Claiming email `firdaustommy89@gmail.com` when `token.email_verified == false`. Expected: PERMISSION_DENIED.
10. **Immutable Field Mutation**: An attacker updates an existing entry attempting to change its immutable `createdAt` timestamp or `studentId`. Expected: PERMISSION_DENIED.
11. **Teacher Score Overflow**: A teacher attempts to submit `validationScore: 999` (maximum allowed is 80). Expected: PERMISSION_DENIED.
12. **Unauthorized Deletion**: A standard student attempts to delete other students' literacy journals. Expected: PERMISSION_DENIED.
