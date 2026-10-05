# ⚡ PDL UP — Padel Tournament & Matchmaker Engine

**PDL UP** is a modern, high-performance web application designed for running and organizing Padel tournaments, sessions, and live matchmaker leaderboards with real-time cloud synchronization.

Built for padel clubs, tournament directors, community organizers, and players.

---

## 🌟 Key Features

### 1. 🏆 Multi-Tournament Hub
* Run multiple tournaments and sessions simultaneously.
* Real-time statistics across all sessions (Active Tournaments, Active Courts, Registered Players, Engine Status).
* Filter by **All**, **Public Live**, or **Private** tournaments.

### 2. 🎾 Comprehensive Padel Formats & Engine Rules
* **Formats**:
  * **Americano**: Rotational pairing where each round tests fair partnership balance.
  * **Mexicano**: Dynamic Swiss-style matching pairing players/teams with similar standings.
  * **King of the Court**: Hierarchical court ladder (Court 1 King, Court 2, etc.) with automatic promotion & relegation on each round.
* **Pairing Modes**:
  * **Individual (Rotating)**: Players rotate partners each round.
  * **Fixed Pair (2v2 Team)**: Set teams of two play together across rounds.
* **Scoring Engines**:
  * **Fixed Points**: Target points locked to 16, 21, 24, or 32 points (Team B points auto-calculated).
  * **Tennis Game Mode**: Real tennis games with **Total Games** target (e.g. 6 games) or **Race To** target.
  * **Punto de Oro**: Sudden-death deciding golden point at 40-40 deuce.
* **Fair Rest Balancer**:
  * Automatic sit-out calculation ensures fair bench distribution when player count exceeds court capacity ($Courts \times 4$).

### 3. 🔒 Privacy & Access Control
* **Public Tournaments**: Open for anyone to spectate live scores and standings in real-time.
* **Private Tournaments**: Exclusively restricted to registered players and the host/organizer. Logged-out visitors cannot view private tournament sessions.

### 4. ✉️ Invite Links & Host Approval System
* **Invite Links**: 1-click shareable links (`#invite=TOURNAMENT_ID`) for WhatsApp, Telegram, or social media.
* **Join Requests**: Invited players can review tournament details and submit a join request.
* **Host Approval Queue**: The tournament organizer can review incoming requests with **Approve** (auto-adds player to roster and unlocks private access) or **Reject**.

### 5. 📥 Reclub Roster Import
* 1-click import of player rosters directly from Reclub attendee lists (copy-paste text or CSV).
* Automatic deduplication, clean name normalization, and capacity validation.

### 6. ☁️ Supabase Cloud Sync & Authentication
* Google OAuth & Email/Password authentication.
* Real-time database sync across devices via Supabase PostgreSQL.
* Offline-first local storage fallback ensures zero match interruption.

### 7. 🌐 Live Spectator Mode & Multi-Language
* Real-time spectator view (`#tourney=ID&spectate=true`) with read-only scoreboards and live leaderboards.
* Bilingual interface: English (`EN`) and Bahasa Indonesia (`ID`).

---

## 🛠️ Tech Stack

* **Framework**: React 19 + TypeScript
* **Build Tool**: Vite 8
* **Styling**: Tailwind CSS + Custom Neon Glassmorphism Dark Theme
* **Icons**: Lucide React
* **Backend & Auth**: Supabase (PostgreSQL + Auth + Row Level Security)
* **Packaging & Linter**: Oxlint

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+ and npm / yarn / pnpm

### 1. Clone Repository
```bash
git clone https://github.com/BenedictusCalvin/padel-sync.git
cd padel-sync
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase project credentials in `.env`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## 📄 License
MIT License. Created for the Padel community.
