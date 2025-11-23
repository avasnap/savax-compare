# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**sAVAX Optimizer** is a DeFi decision tool that compares the cost-effectiveness of acquiring sAVAX (Staked AVAX) through two methods:
1. **Swapping on DEX** - Buying sAVAX directly on decentralized exchanges
2. **Minting via Protocol** - Staking AVAX through BENQI to receive sAVAX

The app uses real-time market data to recommend the optimal strategy, calculating which method yields more sAVAX for a given AVAX investment.

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS (via CDN)
- **Market Data**: DexScreener API for DEX prices
- **On-Chain Data**: Direct RPC calls to Avalanche C-Chain for protocol exchange rates
- **Icons**: Lucide React

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

No environment variables required. The app fetches all data from public APIs.

## Architecture

### Core Data Flow

1. **App.tsx** orchestrates the comparison logic:
   - `loadData()`: Fetches both protocol rate (via RPC) and DEX price (via DexScreener)
   - `calculateComparison()`: Compares sAVAX yield from both methods
   - Protocol rate is treated as "source of truth" when available

2. **services/chainlink.ts**: Direct blockchain interaction
   - Calls `getPooledAvaxByShares(1e18)` on BENQI sAVAX contract (0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE)
   - Uses public Avalanche C-Chain RPC endpoint
   - Returns the official exchange rate (AVAX per sAVAX)
   - Implements retry logic and 10s timeout

3. **services/gemini.ts**: Market data aggregation
   - Fetches DEX price from DexScreener API for sAVAX/AVAX pairs
   - Handles token pair orientation (base vs quote token) to ensure correct pricing
   - Generates simple percentage-based analysis comparing DEX vs Protocol rates
   - Returns structured data with sources for transparency

### Key Business Logic

**Arbitrage Calculation** (App.tsx:57-86):
- DEX receives: `inputAVAX / dexPrice` sAVAX
- Protocol receives: `inputAVAX / stakingRate` sAVAX
- Winner is the method that yields more sAVAX
- Critical distinction: Both `dexPrice` and `stakingRate` represent "AVAX per sAVAX", so division (not multiplication) is correct

**Pricing Semantics**:
- `dexPrice`: Market price of 1 sAVAX in AVAX (typically > 1.0 due to accrued staking rewards)
- `stakingRate`: Official protocol exchange rate (the "index" from BENQI contract)
- Lower price/rate = better value (more sAVAX received per AVAX)

### Component Structure

- **InputCard.tsx**: Reusable input component with optional read-only mode and highlighting
- **AIInsights.tsx**: Displays Gemini analysis and verified sources with loading/error states
- **App.tsx**: Main comparison UI with side-by-side DEX vs Protocol cards

## Important Notes

### Contract Addresses
- **sAVAX Token**: `0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE`
- **WAVAX Token**: `0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7`

### RPC Call Details
The app calls `getPooledAvaxByShares(uint256)` with 1e18 (1 sAVAX in wei) to get the current exchange rate. This is the canonical on-chain data source and should always be preferred over any cached or third-party rates.

### Analysis Logic
- Simple percentage-based comparison of DEX price vs Protocol rate
- Calculates savings/premium percentages to help users make informed decisions
- No external AI dependencies - all logic is deterministic

### DexScreener API
- Endpoint: `https://api.dexscreener.com/latest/dex/tokens/{SAVAX_ADDRESS}`
- Filters for Avalanche chain pairs
- Sorts by liquidity to find most reliable price
- Handles both base/quote token orientations

## Troubleshooting

### RPC Failures
If the Avalanche RPC call fails (execution reverted), the protocol rate will show as 0 or unavailable. This can happen if:
- The contract method signature is incorrect
- The BENQI sAVAX contract has been upgraded
- Network connectivity issues

The app will still show DEX prices from DexScreener.

### Price Inversions
DexScreener returns different formats depending on whether sAVAX is the base or quote token. The code handles inversion at services/gemini.ts:52-58.

### Build Issues
The project uses Vite's `importmap` feature for browser module resolution. Check index.html for CDN-based import maps if modules fail to load in development.
