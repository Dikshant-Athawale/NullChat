You are a **Senior Software Architect, Staff Backend Engineer, and Applied Cryptography Engineer** with deep expertise in real-time distributed systems, secure messaging protocols, and production security engineering.

APP NAME = NullChat

Project Concept
Ephemeral E2EE Messenger named NullChat
A privacy-focused messaging application where users exist only temporarily unless they explicitly choose persistence.
________________________________________
1. Authentication
Homepage
Minimal landing page with only two options:
•	Login
•	Create Temporary Account
________________________________________
Register (Anonymous Mode)
Instead of permanent registration:
Required:
•	Temporary Username
•	Password
Automatically Generated:
•	Unique User ID (UUID)
•	Public Encryption Key
•	Private Encryption Key (stored locally and encrypted using the password)
Account Expiry:
•	Account automatically expires after 24 hours
•	All associated:
o	messages
o	group memberships
o	encryption keys
o	metadata
are permanently deleted.
________________________________________
Login
•	Username
•	Password
After expiration:
This account has expired and all associated data has been permanently removed.
________________________________________
2. Chat Interface
Minimal Layout
-----------------------------------
 Search Users
-----------------------------------
 Recent Chats
 Group Chats
 Settings
-----------------------------------
No unnecessary menus.
________________________________________
Search Username
Real-time search:
To avoid spam:
•	only exact usernames appear
•	rate-limited search requests
________________________________________
Start Chat
Click username:
Start Secure Conversation
Keys exchanged via:
•	X25519 key exchange
•	Double Ratchet protocol
Messages encrypted before leaving device.
Server never sees plaintext.
________________________________________
3. Group Chats
Create Group
Fields:
•	Group Name
•	Group Icon (optional)
________________________________________
Add Members
Two methods:
Existing Members Dropdown
Members:
- Alice
- Bob
- Charlie
Real-Time User Search
Search users...
________________________________________
Group Encryption
Use:
•	MLS (Messaging Layer Security)
or
•	Sender Keys approach used by Signal.
This dramatically reduces encryption overhead for large groups.
________________________________________
4. Delete Account
Visible button:
Delete Account
Behavior:
•	Deletes:
o	account
o	messages
o	groups created
o	encryption keys
Immediately and irreversibly.
________________________________________
5. Additional Privacy Features
Self-Destructing Messages
Sender chooses:
•	30 seconds
•	5 minutes
•	1 hour
•	24 hours
Messages disappear on both devices.
________________________________________
Screenshot Detection
Notify participants:
User captured screenshot.
Works reliably only on mobile apps.
________________________________________
Burn After Reading

add an option to:
Message deletes immediately after being opened once.
________________________________________
Hide Metadata
Server stores minimal information:
Store:
•	encrypted payload
•	delivery status
•	expiration timestamp
Do not store:
•	IP addresses
•	device identifiers
•	location
________________________________________
Anonymous Group Invite Links
Example:
securechat.app/invite/9f1ad7
Link expires automatically.
________________________________________
6. Presence Features
Optional because presence leaks metadata.
Available states:
•	Online
Users can disable all presence indicators.
________________________________________
7. Security Features
Device Verification
Compare safety numbers:
6A2B-91F3-88D1
Prevents MITM attacks.
________________________________________
Forward Secrecy
Compromise of today's key does not expose previous messages.
________________________________________
Post-Compromise Security
If a device gets hacked and later recovered, future messages become secure again.
________________________________________
9. User Interface Design
Design Principles
•	Dark mode by default
•	No advertisements
•	No profile pictures required
•	No "stories"
•	No social feed
•	No clutter
Inspired by:
•	Signal
•	Session
•	Telegram Secret Chats
________________________________________
10. Suggested Tech Stack
Frontend
•	React
•	TypeScript
•	TailwindCSS
Backend
•	Node.js
•	Express
•	PostgreSQL
Real-Time Messaging
•	WebSockets
•	Socket.IO
Cryptography
•	libsodium
•	Web Crypto API
File Storage
•	MinIO
•	S3
Authentication
•	Argon2 password hashing
•	JWT access tokens
________________________________________
11. Architecture Flow
Client A
   |
Encrypt Message
   |
WebSocket
   |
Relay Server
   |
WebSocket
   |
Decrypt
   |
Client B
Server acts only as a relay.
________________________________________



## Project Title
Real-Time Chat Application with End-to-End Encryption

## Project Goal
Build a secure, scalable, production-ready real-time messaging platform demonstrating expertise in distributed systems, WebSockets, applied cryptography and modern full-stack development.

## Problem Statement
Develop a real-time chat application providing genuine end-to-end encryption (server never has access to plaintext or long-term key material) while supporting modern messaging features: delivery acknowledgements, media sharing, presence tracking, multi-device support, and group messaging.

---

## Tech Stack

**Frontend**
- React
- Socket.IO Client
- Web Crypto API (for AES-GCM, ECDH key agreement primitives) **+ libsodium.js** (for X25519/Ed25519 and Double-Ratchet-style operations not well supported natively)
- Redux Toolkit or Zustand
- Tailwind CSS

**Backend**
- Node.js + Express.js
- Socket.IO
- JWT authentication (short-lived access tokens + rotating refresh tokens)

**Database**
- MongoDB — message metadata/ciphertext storage, chat metadata
- Redis — presence, typing indicators, socket session mapping, pub/sub, rate limiting, caching

---

## Core Features
- 1-to-1 private messaging
- Group chat functionality
- Genuine End-to-End Encryption (server is cryptographically excluded from plaintext)
- Multi-device support with per-device key management
- Message delivery status: Sent / Delivered
- Presence indicators: Online / Offline
- User authentication and authorization
- Push notifications (optional, metadata-minimized)
- Chat search (client-side, over decrypted content — **not** server-side full-text search on ciphertext)
- Message pagination and infinite scrolling
- Safety-number / key-fingerprint verification (out-of-band identity verification)

---

## Deliverable Requirements

Generate a detailed implementation roadmap containing all of the following sections. Do not compress or skip sections — depth is the point.

### 1. System Architecture
- High-level architecture diagram description
- Frontend architecture
- Backend architecture
- Database architecture
- WebSocket communication flow
- Encryption flow (registration → key exchange → send → receive → rotation)
- Media upload flow (encrypt-then-upload; server stores ciphertext blobs only)
- Presence tracking flow
- Horizontal scaling strategy

### 2. Feature Breakdown
For every feature, provide:
- Functional requirements
- Non-functional requirements (latency, throughput, availability targets)
- REST API endpoints involved
- Socket.IO events involved
- MongoDB collections involved
- Security considerations specific to that feature

### 3. Database Design
Design MongoDB collections for: Users, Devices, Conversations, Participants, Messages, Attachments, DeviceKeys (identity/signed-prekey/one-time-prekey bundles), KeyRotationLog, Notifications.

For each collection include:
- Schema design (fields, types)
- Relationships (referenced vs. embedded, and why)
- Indexing strategy (compound indexes, TTL indexes where relevant)
- Example documents
- **Explicit note on which fields are plaintext/metadata vs. opaque ciphertext**, since this boundary is the crux of the security model

### 4. Redis Usage
Explain exactly how Redis is used for:
- Online status tracki
- Socket-to-server / socket-to-user session mapping (for multi-node routing)
- Pub/Sub fan-out across Socket.IO instances
- Rate limiting (token bucket / sliding window)
- Caching recent messages (ciphertext only — never plaintext, never keys)

Include example Redis key structures and TTLs for each use case.

### 5. End-to-End Encryption Design (Core Section — High Security Rigor Required)

This is the most important section. Be explicit and specific — name algorithms, key sizes, and protocol steps. Do not describe encryption in the abstract.

**5.1 Protocol choice**
- Justify using a **Signal-Protocol-style design** (X3DH for initial key agreement + Double Ratchet for ongoing session encryption) rather than ad hoc use of Web Crypto or a single static shared key.
- Explicitly reject "hybrid encryption with a server-held master key," "server-side envelope encryption," or any scheme where the server can derive or reconstruct message plaintext or session keys under any operational condition (including "for moderation" or "for account recovery").
- State the reasoning for library choice: **libsodium.js** for X25519 (ECDH), Ed25519 (signing), XSalsa20-Poly1305/XChaCha20-Poly1305 (AEAD) — since these primitives and constant-time implementations are not uniformly available via Web Crypto API across browsers, and hand-rolling Double Ratchet on top of raw Web Crypto is error-prone.

**5.2 Identity & key hierarchy**
- Identity Key Pair (long-term, Ed25519/X25519, generated once per device, private key **never leaves the device**, never transmitted, never logged, never stored server-side)
- Signed Pre-Key (medium-term, rotated periodically, signed by identity key)
- One-Time Pre-Keys (batch-generated, consumed once, replenished by client)
- Per-conversation Root Key, Chain Keys, and Message Keys derived via the Double Ratchet (HKDF-based KDF chains)
- Explicit statement: the server's `DeviceKeys` collection stores **only public keys and signatures** — it is a public-key bulletin board, not a key escrow.

**5.3 Key exchange (X3DH)**
- Step-by-step description of the initial handshake: fetching a recipient's identity key + signed prekey + one-time prekey bundle, computing the shared secret via multiple ECDH operations (DH1–DH4), deriving the initial root key via HKDF.
- Sequence description for: user registration, device registration, initial key exchange (first message to a new contact).

**5.4 Double Ratchet (ongoing messages)**
- Symmetric-key ratchet (chain key → message key per message) for forward secrecy within a session.
- DH ratchet (new ephemeral key pair per ratchet step) for post-compromise security / self-healing after a key compromise.
- Out-of-order and lost message handling (skipped message key cache, bounded and expiring).

**5.5 Group chat encryption**
- Explain the **sender-key** approach (each group member generates a sender key, distributes it 1:1-encrypted via pairwise Double Ratchet sessions to each other member, then uses symmetric ratcheting of that sender key for group broadcast) — this is the standard, scalable answer to "N² pairwise encryption doesn't scale."
- Cover membership-change key rotation: removing a member requires all remaining members to rotate their sender keys; adding a member requires distributing current sender keys to them (with a clear statement of the "add-then-see-history" vs. "no-history-for-new-members" trade-off).

**5.6 Forward secrecy & post-compromise security**
- Define both terms precisely and state which properties this design provides and which it doesn't (e.g., metadata such as who-talked-to-whom-when is **not** protected by message encryption and must be addressed separately if required).

**5.7 Key rotation strategy**
- Signed prekey rotation cadence (e.g., weekly), one-time prekey replenishment thresholds, identity key rotation only on device compromise (with re-verification of safety numbers required afterward).

**5.8 Authentication of keys / MITM mitigation**
- Safety-number (key fingerprint) generation from both parties' identity keys, out-of-band comparison (QR code or manual digit comparison), and UI treatment of "safety number changed" events (must be surfaced, never silently suppressed).
- Explicit note: without this out-of-band verification step, a malicious or compromised server **can** perform a key-substitution MITM attack — the plan must describe this limitation honestly rather than claim it away.

**5.9 What the server can and cannot do — threat model statement**
- Enumerate concretely: the server can see participant lists, timestamps, message sizes, and delivery status (metadata); the server cannot see plaintext content, cannot see media content, and does not possess any private key material.
- State explicitly what an attacker who fully compromises the server can and cannot obtain.

**5.10 Sequence diagrams (described, not just named)**
Provide step-by-step sequence descriptions for:
- User + device registration and initial key bundle upload
- Initial key exchange between two new contacts (X3DH)
- Sending a message (ratchet step, encryption, envelope construction, upload)
- Receiving a message (fetching, ratchet step, decryption, ack)
- Adding a new device to an existing account (device linking + re-establishing sessions)
- Group member removal (sender key rotation)

### 6. API Design
- REST API endpoints, request/response examples, authentication flow (access + refresh token lifecycle), error handling strategy (standardized error envelope, no leakage of internals in error messages).

### 7. Socket.IO Event Design
- Event names, payload structures, client-emitted vs. server-emitted events, acknowledgement events, and how ciphertext envelopes are shaped on the wire (envelope format: sender device ID, ratchet header, ciphertext, MAC/tag — never plaintext fields).

### 8. Folder Structure
Professional folder structure for frontend, backend, shared types, socket handlers, encryption modules (clearly isolated from the rest of the codebase, with a documented "no plaintext crosses this boundary" convention), and Redis services.

### 9. Security Design (System-Level, Beyond Message Encryption)
- JWT authentication, refresh token rotation and revocation, CSRF protection, XSS prevention (CSP, sanitization), rate limiting, input validation, secure headers (HSTS, X-Frame-Options, etc.), private key protection at rest on-device (e.g., wrapping with a passphrase-derived key or platform keystore/secure enclave where available), replay attack prevention (ratchet header + message counters, per-session nonce tracking), MITM mitigation (see 5.8), and secure deletion/account-closure handling.

### 10. Scalability Design
- Socket.IO horizontal scaling via the Redis adapter, stateless backend design, database sharding strategy, message partitioning, CDN usage for encrypted media blobs, load balancing, and connection draining during deploys.
- Provide rough capacity estimates and the bottlenecks/mitigations expected at: 1,000 / 10,000 / 100,000 / 1,000,000 concurrent users.

### 11. Development Roadmap
Phase the work (fix the numbering gap — there is no "Phase 4" in a 7-phase plan otherwise):
- **Phase 1:** Auth + basic (unencrypted) chat skeleton
- **Phase 2:** Real-time messaging infrastructure (Socket.IO, Redis adapter, delivery/read receipts)
- **Phase 3:** E2EE implementation (X3DH + Double Ratchet, key management)
- **Phase 4:** Group chat + sender-key encryption
- **Phase 5:** Presence tracking, typing indicators, media sharing
- **Phase 6:** Scaling and optimization
- **Phase 7:** Deployment, monitoring, and security hardening pass

For each phase: estimated timeline, deliverables, dependencies, risks.

### 12. Deployment Architecture
Docker setup, CI/CD pipeline, Nginx reverse proxy, TLS/HTTPS setup (including certificate rotation), environment variable management/secrets handling, monitoring and logging (with explicit note: **logs must never contain plaintext message content, key material, or full tokens**).

### 13. Resume Impact Analysis
Skills demonstrated, system design concepts showcased, interview questions this prepares the candidate for, differentiation from other candidates.

### 14. README Security Write-Up
A user-facing section explaining: the encryption model in plain language, why the server cannot read messages, how keys are managed, threat model assumptions, and **honest security limitations** (e.g., metadata exposure, reliance on client device security, what happens if a device is lost or compromised, what safety-number verification protects against and what it doesn't).

### 15. Interview Preparation
Generate likely interview questions across: system design, security/cryptography, scaling, MongoDB, Redis, and Socket.IO — tied specifically to decisions made in this plan (not generic questions).

---

## Output Bar
The final output must be detailed enough that a developer can implement the entire project without additional architectural guidance. Prefer concrete specifics (field names, algorithm names, key sizes, event names, Redis key patterns) over descriptive generalities.

---

## What Changed & Why

1. **Fixed the phase-numbering bug** — original jumped from Phase 3 to Phase 5, skipping 4 and folding group chat nowhere; now group chat has its own phase.
2. **Replaced vague "hybrid encryption approach" framing with a concrete, named protocol** — Signal-style X3DH + Double Ratchet — since "hybrid encryption" alone doesn't specify forward secrecy or post-compromise security, and a real implementer needs a named, well-analyzed protocol rather than an invented scheme.
3. **Added an explicit threat model subsection (5.9)** — a security write-up is incomplete without stating plainly what the server can/cannot see, and what a full server compromise does/doesn't expose.
4. **Added safety-number/out-of-band verification (5.8)** — without it, any E2EE system is silently vulnerable to server-side key substitution (MITM); this is the single most commonly omitted piece in "E2EE chat app" tutorials and portfolio projects, and its absence is worth calling out explicitly rather than glossing over.
5. **Added multi-device support** — real messaging apps must handle key management per-device, not just per-account; this is a major source of complexity the original prompt didn't ask for and a developer would be blindsided by later.
6. **Clarified group chat's actual hard problem** — pairwise session encryption doesn't scale to groups; added the sender-key pattern explicitly rather than leaving "group chat encryption challenges" as an open question with no expected answer.
7. **Added guidance that server-side full-text search over ciphertext is a contradiction** — search must be client-side over decrypted content, which has UX and architecture implications (e.g., search doesn't work across devices without extra design).
8. **Called out log/metadata hygiene explicitly** — plaintext, keys, and tokens must never appear in logs; a production-oriented plan needs to say this out loud.
9. **Tightened the DB design ask** — added explicit instruction to mark which fields are plaintext/metadata vs. ciphertext per collection, since that boundary *is* the security model and is easy to blur by accident in schema design.
10. **General tightening** — merged redundant bullets, removed ambiguous asks ("include diagrams or sequence descriptions" → specified exactly which six sequences are required), and made the security section proportionally the largest, since it was the stated focus.
