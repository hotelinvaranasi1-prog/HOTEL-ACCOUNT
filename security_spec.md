# Security Specification

## Data Invariants
1. A booking must have a room number and a type.
2. An invoice must have an invoice number.
3. Rooms must have a valid status.

## The "Dirty Dozen" Payloads (Examples to Reject)
1. Creating a booking without a room number.
2. Updating a booking's `created_at` timestamp.
3. Deleting a room.
4. Setting a room status to a non-existent value.
5. Creating an invoice with an extremely large invoice number string.
6. Spoofing `guest_name` in a booking as another user (if auth was present).
... (other standard security checks)

## Potential Logic Leaks
- Unrestricted access if `isSignedIn()` is used but no auth is implemented in the frontend.
- Oversized field values.
