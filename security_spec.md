# Security Specification - Yad-El Pharmacy Management System

## Data Invariants
1. A sale must have at least one item and the total amount must match the sum of item prices * quantities.
2. Only staff with `admin` or `pharmacist` roles can modify medication stock or pricing.
3. Every document must have a `createdAt` timestamp that matches `request.time`.
4. `stockLevel` cannot be negative.
5. Sales records are immutable (cannot be updated or deleted).

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a medication document with a fake `manufacturer` that is 1MB in size.
2. **Role Escalation**: Attempt to update own user profile in `staff` collection to set `role: 'admin'`.
3. **Ghost Field**: Attempt to create a medication with a field `isVerified: true` which is not in the schema.
4. **Invalid Type**: Attempt to set `price` as a string instead of a number.
5. **Orphaned Write**: Attempt to create a sale for a `medicationId` that doesn't exist.
6. **Negative Stock**: Attempt to set `stockLevel` to -1.
7. **Timestamp Fraud**: Attempt to set `createdAt` to a date in the past.
8. **Unauthorized List**: Attempt to list all `sales` as a non-authenticated user.
9. **PII Leak**: Attempt to read a `customer`'s email as an unauthorized user.
10. **ID Poisoning**: Attempt to create a document with an ID containing emoji or 1KB of junk.
11. **Update Gap**: Attempt to update only the `price` of a medication without passing it through `isValidMedication`.
12. **Self-Assignment**: A user creating their own `staff` record with `isVerified: true`.

## Test Runner (Conceptual)
All the above payloads will be tested against the draft rules below to ensure `PERMISSION_DENIED`.
