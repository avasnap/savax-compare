# sAVAX Arbitrage Finder

Real-time comparison tool to find the best way to acquire sAVAX (Staked AVAX) on Avalanche C-Chain.

**Live App:** https://avasnap.github.io/savax-compare/

## What It Does

Compares two methods of acquiring sAVAX:
- **Buy on DEX**: Swap AVAX for sAVAX on decentralized exchanges
- **Mint via Protocol**: Stake AVAX directly through BENQI to receive sAVAX

The app shows you which method gives you more sAVAX for your AVAX, identifying arbitrage opportunities in real-time.

## Features

- ✅ Real-time DEX prices from DexScreener API
- ✅ On-chain protocol rates from BENQI sAVAX contract
- ✅ Percentage-based arbitrage analysis
- ✅ No API keys or external dependencies required
- ✅ Fully client-side, works entirely in your browser

## Data Sources

- **DEX Prices**: Fetched from [DexScreener API](https://dexscreener.com) (highest liquidity pool on Avalanche)
- **Protocol Rate**: Direct RPC call to BENQI sAVAX contract at `0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE`

## Tech Stack

- React 19 + TypeScript
- Vite for build tooling
- TailwindCSS for styling
- GitHub Actions for CI/CD
- Deployed on GitHub Pages

## Development

### Prerequisites
- Node.js 20+

### Local Setup

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
├── App.tsx                 # Main app component
├── components/
│   ├── AIInsights.tsx      # Market intelligence display
│   └── InputCard.tsx       # Reusable input component
├── services/
│   ├── gemini.ts          # DexScreener API integration
│   └── chainlink.ts       # BENQI contract RPC calls
├── types.ts               # TypeScript type definitions
└── vite.config.ts         # Vite configuration
```

## How It Works

1. **Fetches DEX Price**: Queries DexScreener for sAVAX/AVAX pairs on Avalanche, selects the pool with highest liquidity
2. **Fetches Protocol Rate**: Calls `getPooledAvaxByShares(1e18)` on BENQI sAVAX contract via Avalanche RPC
3. **Calculates Arbitrage**: Compares how much sAVAX you'd receive from each method
4. **Recommends Best Option**: Shows which method gives you more sAVAX and by what percentage

### Example Calculation

For 1000 AVAX:
- DEX: 1000 / 1.2317 AVAX = **811.89 sAVAX**
- Protocol: 1000 / 1.2368 AVAX = **808.56 sAVAX**
- **Result**: Buy on DEX, receive 3.33 sAVAX (0.41%) more

## Deployment

Automatically deployed to GitHub Pages on every push to `main`:

1. GitHub Actions runs `npm run build`
2. Deploys `dist/` folder to `gh-pages` branch
3. GitHub Pages serves from `gh-pages` branch
4. Changes go live in ~2-3 minutes

## Contract Details

**BENQI sAVAX Contract:**
- Address: `0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE`
- Function: `getPooledAvaxByShares(uint256 shareAmount)`
- Selector: `0x4a36d6c1`
- Returns: Amount of AVAX backing the given shares

## Contributing

This is a simple arbitrage finder. If you find bugs or have suggestions, open an issue.

## License

MIT
