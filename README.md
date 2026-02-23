# PROJECT_X_ULTIMATE

A Highly Secure, Local-First Desktop Workspace and Tactical Telemetry Engine.

🔬 Abstract

Project X Ultimate is a specialized, offline-first Electron application engineered for high-fidelity personal productivity, study, and data visualization. Built on a strict React/TailwindCSS grid architecture, the system operates entirely independently of external cloud infrastructure, prioritizing data sovereignty and low-latency hardware interaction.

🧬 Core Architectures

1. The Security Matrix (Biometric & Cryptographic)

The application utilizes a multi-tiered security protocol.

Hardware Tokenization: Integrates directly with the OS Secure Enclave (Windows Hello / Apple Touch ID) via Electron's safeStorage.

Cryptographic Hashing: User payloads and PINs are secured utilizing the Argon2id hashing algorithm, defending against brute-force and side-channel attacks.

Role-Based Access Control: Internal SQLite database enforces clearance levels (Lvl 1 - Lvl 4 Director).

2. The Study Hub (Vector Engine)

A hardware-accelerated infinite canvas engineered for organic chemistry and physics derivations.

Hardware Integration: Utilizes the native Pointer Events API to read stylus pressure (e.pressure) from Huion drawing tablets, dynamically scaling line width.

Spatial Mathematics: Features origin-anchored zooming and middle-mouse panning, with a Catmull-Rom spline algorithm applied on pointer-up for stroke smoothing.

Coordinate Accuracy: Uses strict bounding box client rects to eliminate CSS scaling offsets.

3. Tactical Cartography

An interactive map engine utilizing CartoDB Dark Matter tiles.

Spatial Telemetry: Live cursor Latitude/Longitude tracking and coordinate-jump navigation.

Haversine Distance: Calculates total geometric distance (in kilometers and miles) between user-dropped tactical waypoints across the Earth's curvature.

UI Isolation: Engineered with strict z-index containment and ResizeObserver hooks to prevent React-Leaflet render chunking within CSS Grids.

🛠 Technology Stack

Runtime: Electron / Node.js

Frontend: React 18, Vite, Tailwind CSS

Database: SQLite (better-sqlite3)

Cryptography: @node-rs/argon2, Node Crypto

Cartography: Leaflet, React-Leaflet
