# Plinko Game - Provably Fair Implementation

An interactive Plinko game with provably-fair commit-reveal RNG protocol, deterministic outcome engine, polished UI/UX, and a verifier page.

## Features

### Game Features
- **12-row Plinko board** with triangular peg layout and 13 bins
- **Smooth animations** with ball movement, peg collisions, bin pulse, and confetti
- **Sound effects** with peg tick sounds and celebratory landing SFX (mute toggle available)
- **Accessibility**: Keyboard controls (← → arrows for column, Space to drop), reduced motion support
- **Responsive design** for mobile and desktop

### Provably Fair Protocol
- **Commit-reveal RNG** with client contribution
- **Deterministic engine** using xorshift32 PRNG seeded by combined seed
- **Public verifier page** to recompute and verify any round's outcome

### Easter Eggs
- **TILT mode** (press `T`): Board rotates ±5° with vintage arcade filter
- **Golden Ball** (automatic): Activates when last 3 landings are center bin (bin 6)
- **Secret theme** (type "opensesame"): Toggles torchlight/dungeon theme
- **Debug grid** (press `G`): Overlays peg positions and shows RNG values

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite + Prisma
- **RNG**: xorshift32 PRNG
- **Hashing**: SHA-256

## Installation

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Set up environment variables
# 1. Backend: Copy .env.example to .env and configure
cd server
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# 2. Frontend: Copy .env.example to .env and configure
cd ../client
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# Generate Prisma client and run migrations
cd ../server
npx prisma generate
npx prisma migrate deploy
```

### Environment Variables

**Backend (.env in server/ directory):**
- `DATABASE_URL` - SQLite database file path (default: `file:./dev.db`)
- `PORT` - Server port (default: `3000`)
- `NODE_ENV` - Environment (development/production)

**Frontend (.env in client/ directory):**
- `VITE_API_URL` - Backend API URL (default: `http://localhost:3000`)
  - For production, set to your deployed backend URL
  - Example: `VITE_API_URL=https://your-backend.herokuapp.com`

## Development

```bash
# Run both server and client in development mode
npm run dev

# Or run separately:
# Server (port 3000)
cd server && npm run dev

# Client (port 5173)
cd client && npm run dev
```

## Building

```bash
# Build both server and client
npm run build

# Or build separately:
cd server && npm run build
cd client && npm run build
```

## Testing

```bash
# Run unit tests
npm test

# Run test vectors
cd server && npm run test:vectors

# Watch mode
cd server && npm run test:watch
```

## Usage

1. **Start a round**: Click "Start Round" to get a commit hash
2. **Configure drop**: Select drop column (0-12) and bet amount
3. **Drop ball**: Click "Drop Ball" or press Space
4. **Verify**: After the round, use the Verifier page to verify fairness

## Verifier

The verifier page allows you to:
- Load a round by ID (if revealed)
- Manually enter serverSeed, clientSeed, nonce, and dropColumn
- Recompute the outcome and verify it matches the logged round

## API Endpoints

- `POST /api/rounds/commit` - Create a new round, get commit hash
- `POST /api/rounds/:id/start` - Start a round with client seed and drop column
- `POST /api/rounds/:id/reveal` - Reveal server seed after round completes
- `GET /api/rounds/:id` - Get round details
- `GET /api/verify` - Verify a round's outcome

## Test Vectors

The engine has been tested against the following reference vectors:

```
rows = 12
serverSeed = "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc"
nonce = "42"
clientSeed = "candidate-hello"

commitHex = bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34
combinedSeed = e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0

PRNG = xorshift32 seeded from first 4 bytes of combinedSeed (big-endian)
First 5 rand() in [0,1): 0.1106166649, 0.7625129214, 0.0439292176, 0.4578678815, 0.3438999297

Peg map (first rows, leftBias rounded to 6dp):
Row 0: [0.422123]
Row 1: [0.552503, 0.408786]
Row 2: [0.491574, 0.468780, 0.436540]

Path outcome (center drop):
dropColumn = 6 (center), adj = 0 → binIndex = 6
```

All tests pass ✅

## Deterministic Engine Specification

The game uses a discrete Plinko model:

1. **Rows**: 12 rows, ball makes Left/Right decision at each row
2. **Position tracking**: Maintains `pos` (number of Right moves), `pos ∈ [0..12]`
3. **Final bin**: `binIndex = pos`
4. **Peg map generation**: Each peg has `leftBias ∈ [0.4, 0.6]` calculated as:
   ```
   leftBias = 0.5 + (rand() - 0.5) * 0.2
   ```
   Rounded to 6 decimal places for stable hashing
5. **Drop column influence**: 
   ```
   adj = (dropColumn - floor(12/2)) * 0.01
   bias' = clamp(leftBias + adj, 0, 1)
   ```
6. **Decision per row**: Uses peg at index `min(pos, row)`, draws `rand()`, if `rand() < bias'` choose Left, else Right (pos += 1)

## Paytable

Symmetric paytable for bins 0-12:
- Bins 0, 12: 10x
- Bins 1, 11: 5x
- Bins 2, 10: 2x
- Bins 3, 9: 1x
- Bins 4, 8: 0.5x
- Bins 5, 7, 6: 0.2x

## Keyboard Controls

- `←` `→` - Select drop column
- `Space` - Drop ball
- `T` - Toggle TILT mode
- `G` - Toggle debug grid
- Type "opensesame" - Toggle secret theme

## License

This is an engineering exercise. No real money is involved.

## Notes

- All randomness is deterministic and replayable
- Server seed is hidden until after the round completes
- Client seed can be provided by the user or auto-generated
- The verifier can recompute any round's outcome exactly

