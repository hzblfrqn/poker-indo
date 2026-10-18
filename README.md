# ♠️ Indonesian Poker (Capsa Banting) - Multiplayer Web Game ♦️

A fully functional, browser-based 4-player multiplayer card game inspired by Indonesian Poker (Capsa Banting), built with modern web technologies and real-time WebSocket communication.

Casual multiplayer card game with no gambling, chips, or monetary betting.

---

## 🃏 Game Rules & Features

- **4 Players, 52 Cards**: Each player is dealt exactly 13 cards from a standard deck without jokers.
- **Card Rankings**: `3` (lowest) to `2` (highest):  
  `3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2`
- **Suit Rankings** (for tiebreakers):  
  `♣ Clubs (lowest) < ♦ Diamonds < ♥ Hearts < ♠ Spades (highest)`
- **Starting Player Rule**: The player holding the **3 of Spades (3♠)** must lead the opening trick of the first game, and their opening play **must include the 3♠** (as a single or part of any valid combination).
- **Valid Combinations**:
  - **Single (1 card)**: Higher rank beats lower, tie broken by suit.
  - **Pair (2 cards)**: Two cards of identical rank.
  - **Three of a Kind (3 cards)**: Three cards of identical rank.
  - **Double Pair (4 cards)**: Two pairs of **consecutive** ranks (e.g. `5-5` & `6-6`, `K-K` & `A-A`, `A-A` & `2-2`). Non-consecutive pairs (e.g. `5-5` & `7-7`) are rejected!
  - **Full House / Polo (5 cards)**: 3 of one rank + 2 of another rank. Triple rank determines strength.
  - **Polo Seri (5 cards)**: 3 consecutive cards of identical suit + 1 pair of another rank (e.g. `4♠-5♠-6♠` + `10♣-10♦`).
  - **Three-Card Straight Flush (3 cards)**: 3 consecutive cards of identical suit (e.g. `6♠-7♠-8♠`).
  - **Bombs (Special counterplay against Single 2)**:
    - **Four of a Kind** (4 cards of same rank)
    - **Five-Card Straight Flush** (5 cards of same suit)
    - Counters any Single 2, ending the trick immediately and giving the lead to the bomber.
- **Passing Rules**: Once a player passes in a trick, they cannot re-enter until the next trick. When all other active players pass, the trick ends and the last player to play leads the next trick.
- **Victory Condition**: The first player to empty all 13 cards wins the game!

---

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Canvas-Confetti
- **Audio**: Web Audio API Sound Synthesizer (instant tactile sound effects without external audio assets)
- **Backend**: Node.js + Express + Socket.IO + TypeScript
- **Testing**: Vitest automated test suite (33 tests covering rules, combinations, bombs, trick mechanics, and 4-client WebSocket multiplayer)

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+ or v24+ recommended)
- npm (v9+)

### Installation
From the root directory:

```bash
# Install root, server, and client dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

---

## ⚙️ Environment Variables

No mandatory `.env` file is required for local play. Defaults:
- Backend port: `4000` (configurable via `PORT=4000`)
- Frontend port: `5173` (Vite dev server)

---

## 🎮 Running the Application

### Option A: Run Both Together (Recommended)
From the root directory:
```bash
npm run dev
```
This starts both the backend server (on `http://localhost:4000`) and the Vite client (on `http://localhost:5173`) concurrently.

### Option B: Run Separately
In terminal 1 (Backend):
```bash
npm run dev:server
# or: cd server && npm run dev
```

In terminal 2 (Frontend):
```bash
npm run dev:client
# or: cd client && npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 🧪 Testing with 4 Players

You can easily simulate a 4-player game on a single computer using separate browser tabs or private/incognito windows:

1. **Tab 1 (Host)**:
   - Navigate to `http://localhost:5173/`.
   - Enter name `Alice` and click **"Host New Game"**.
   - Note the 6-character room code (e.g. `QSCVRF`) or click the **"Copy"** button.
   - Click **"I'M READY!"**.

2. **Tab 2 (Player 2)**:
   - Open a new tab (or incognito window) at `http://localhost:5173/`.
   - Enter name `Bob`, enter the room code, and click **"Join Table"**.
   - Click **"I'M READY!"**.

3. **Tab 3 (Player 3)**:
   - Open a 3rd tab at `http://localhost:5173/`.
   - Enter name `Charlie`, enter the room code, and click **"Join Table"**.
   - Click **"I'M READY!"**.

4. **Tab 4 (Player 4)**:
   - Open a 4th tab at `http://localhost:5173/`.
   - Enter name `Diana`, enter the room code, and click **"Join Table"**.
   - Click **"I'M READY!"**.

5. **Start Game**:
   - Return to **Tab 1 (Alice)**. The **"START GAME"** button is now enabled.
   - Click **"START GAME"**!
   - All 4 tabs will immediately transition to the poker table felt.
   - The player holding `3♠` will have an active **"YOUR TURN TO ACT"** badge and can lead.
   - Enjoy real-time card plays, pass tracking, bomb explosions, and victory celebration!

---

## 🧪 Automated Unit & Integration Tests

Run the Vitest test suite covering 33 test cases:

```bash
npm test
# or: cd server && npm test
```

### Verified Test Categories:
- Standard 52-card deck generation and Fisher-Yates random shuffle
- 13-card dealing to 4 seats without duplicate cards
- Card rank hierarchy (`3` lowest, `2` highest)
- Suit hierarchy (`♣ < ♦ < ♥ < ♠`)
- Detection of the player seat holding `3♠`
- First trick `3♠` lead constraint
- Combination recognition:
  - Single
  - Pair
  - Three of a Kind
  - Double Pair (consecutive ranks only)
  - Full House / Polo
  - Polo Seri (3 suited consecutive + 1 pair)
  - Three-Card Straight Flush
  - Bomb (Four of a Kind & Five-Card Straight Flush)
- Combination comparisons (`canBeat`)
- Bomb countering Single 2 mechanics & immediate trick termination
- Clockwise turn progression & passing rules (passed player cannot re-enter current trick)
- Trick resolution when all other players pass
- Hand privacy verification (opponents never receive other players' hidden cards)
- Seamless session token reconnection after disconnect
- Real WebSocket multiplayer integration across 4 active sockets
