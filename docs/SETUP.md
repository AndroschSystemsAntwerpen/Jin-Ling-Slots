# Jin-Ling Slots - Web3 Setup Guide

## Overview
This document guides you through setting up the complete Web3 integration for Jin-Ling Slots with DocAndroschCoin (DAC) payments.

## Prerequisites
- Node.js v16+ (for backend)
- Git
- Web3 wallet (Phantom, MetaMask with Solana Snap, or Magic Eden)
- Solana on Mainnet or Devnet

## Frontend Setup

### 1. Load Web3 Libraries
The following libraries are automatically loaded in `index.html`:
- `@solana/web3.js` via CDN
- Telegram WebApp SDK

### 2. Include Web3 Modules
Add these script tags to your `index.html` before the main script:

```html
<!-- Web3 Configuration -->
<script src="js/web3-config.js"></script>
<script src="js/crypto-deposit-system.js"></script>
<script src="js/swap-service.js"></script>
<script src="js/game-controller.js"></script>
```

### 3. Initialize Game

```javascript
// In your main script
let gameController;

window.addEventListener('DOMContentLoaded', async () => {
  gameController = new GameController();
  await gameController.init();
});

// Connect wallet button handler
document.getElementById('connect-btn').addEventListener('click', () => {
  gameController.connectWallet('phantom');
});
```

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
PORT=3001
BACKEND_RPC_URL=https://api.mainnet-beta.solana.com
NODE_ENV=production
```

### 3. Start Backend Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3001`

## Configuration

### Network Selection

**For Mainnet (Real Money):**
```javascript
WEB3_CONFIG.NETWORK.useDevnet = false;
WEB3_CONFIG.NETWORK.url = 'https://api.mainnet-beta.solana.com';
```

**For Devnet (Testing):**
```javascript
WEB3_CONFIG.NETWORK.useDevnet = true;
WEB3_CONFIG.NETWORK.url = 'https://api.devnet.solana.com';
```

### DAC Token
Token Address: `7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK`
Pump.fun: https://pump.fun/coin/7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK

## Supported Wallets

### Phantom (Recommended)
- Install: https://phantom.app
- Best UX for Solana
- Full Web3 support

### MetaMask with Solana Snap
- Install MetaMask + Solana Snap
- Cross-chain support
- More flexibility

### Magic Eden
- Built-in wallet
- NFT integration ready

## Supported Deposit Tokens

1. **SOL** (Solana Native)
   - Symbol: SOL
   - Mint: `So11111111111111111111111111111111111111112`

2. **USDC** (USD Coin)
   - Symbol: USDC
   - Mint: `EPjFWaLb3hyccqaJ3D2cUAQeUjn5zJvMG9PvKahRjuTs`

3. **USDT** (Tether)
   - Symbol: USDT
   - Mint: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

All deposits are automatically converted to DAC via Jupiter DEX swap.

## Game Settings

```javascript
// In WEB3_CONFIG.GAME
minBet: 10,        // Minimum 10 DAC per spin
maxBet: 10000,     // Maximum 10,000 DAC per spin
defaultBet: 10,    // Default bet
freeSpinsCount: 10, // Free spins per trigger
minDepositAmount: 1 // Minimum 1 SOL deposit
```

## API Endpoints (Backend)

### Health Check
```
GET /api/health
```

### Get Token Balance
```
POST /api/balance
Body: { "publicKey": "...", "mint": "..." }
```

### Get Prices
```
GET /api/prices
Returns: { SOL, USDC, USDT, timestamp }
```

### Get Swap Quote
```
POST /api/swap/quote
Body: { "inputMint": "...", "outputMint": "...", "amount": 1000000 }
```

### Process Spin
```
POST /api/game/spin
Body: { "publicKey": "...", "bet": 10, "result": {...} }
```

## Deployment

### Frontend (Vercel)
1. Connect GitHub repo
2. Set build command: `npm run build` (if using bundler)
3. Deploy

### Backend (Heroku/Railway)
1. Create `.env` with proper RPC URL
2. Deploy backend
3. Update frontend API URL in config

## Security Considerations

1. **Never expose private keys in frontend**
2. **Always validate transactions on backend**
3. **Use HTTPS in production**
4. **Implement rate limiting for API calls**
5. **Audit smart contracts before mainnet**
6. **Keep dependencies updated**

## Troubleshooting

### Wallet Not Detected
- Install Phantom or MetaMask
- Check wallet is not locked
- Refresh page

### Swap Failed
- Check balance is sufficient
- Verify liquidity on Jupiter
- Check gas fees
- Try with smaller amount

### Balance Not Updating
- Check RPC endpoint is working
- Verify wallet has token account
- Wait for transaction confirmation
- Check block explorer

## Support

For issues or questions:
- GitHub Issues: Create issue in repo
- Telegram: Contact team
- Discord: Community support

## License
MIT License - See LICENSE file
