# Firestore Security Specification

This document outlines the security invariants, validation rules, and threat vectors for the 노답봇 application databases.

## 1. Data Invariants

1. **User Profiles (`/users/{userId}`)**:
   - A user profile can only be created by the user owning that auth UID.
   - User profile data is immutable after initial registration.
   - The nickname must be between 2 and 20 characters.
   - The creation timestamp must match the server request time.

2. **Global Chats (`/global_chats/{messageId}`)**:
   - Chat messages can be created by any authenticated user.
   - Senders cannot spoof their identity; `senderUid` must equal `request.auth.uid`.
   - Content size is restricted to 1-200 characters to prevent spam or DB denial of service.
   - Messages are completely read-only and immutable after creation; no updates or deletes are permitted.

---

## 2. The "Dirty Dozen" Payloads (Threat Vectors)

1. **Identity Spoofing in user profile**: Try to create user profile `/users/uid123` with auth UID `attacker999`. (Denied: UID mismatch)
2. **Time Spoofing in user profile**: Set `createdAt` to a hand-crafted past or future timestamp instead of `request.time`. (Denied: Timestamp mismatch)
3. **Ghost Fields Injection**: Add a hidden field like `isAdmin: true` during profile creation. (Denied: strict key size matching)
4. **Nickname Underflow**: Set `nickname: "A"`. (Denied: Min length of 2)
5. **Nickname Overflow**: Set `nickname: "ThisIsTooLongAndMaliciousNameForASample"`. (Denied: Max length of 20)
6. **Anonymous Profile Harvesting**: Attempt to query and download the list of all registered nicknames (`list` query on `/users/`). (Denied: listing blocked)
7. **Identity Spoofing in Chat**: Post a message with `senderUid: "victim_id"` while logged in as `attacker_id`. (Denied: senderUid mismatch)
8. **Chat Content Overflow**: Send a 1MB message into `/global_chats/`. (Denied: content length restriction <= 200)
9. **Message Mutation Attempt**: Attempt to update an existing chat message content or edit its sender. (Denied: updates disabled)
10. **Message Deletion Attempt**: Attempt to delete someone else's chat message. (Denied: deletes disabled)
11. **ID Poisoning Attack**: Trying to create a message with a document ID containing malicious symbols `../../hacker` or exceeding 128 characters. (Denied: `isValidId()` regex + size check)
12. **Unauthenticated Read/Write**: Attempting to read or write any document without a valid Firebase auth token. (Denied: `isSignedIn()` check)

---

## 3. Test Cases Spec (The Test Rules Architecture)

These payloads are protected dynamically. Below is the blueprint of the rules that prevent these 12 malicious payloads.
