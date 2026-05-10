# Jin-Ling Slots Web3 API Reference

## Frontend JavaScript API

### WalletAdapter

#### `connect(walletName)`
Connect to a Web3 wallet.

```javascript
const walletAdapter = new WEB3.WalletAdapter();
const result = await walletAdapter.connect('phantom');
// Returns: { success: boolean, publicKey: string, walletType: string }
```

#### `disconnect()`
Disconnect from wallet.

```javascript
await walletAdapter.disconnect();
```

#### `signTransaction(transaction)`
Sign a transaction.

```javascript
const signedTx = await walletAdapter.signTransaction(transaction);
```

#### `signMessage(message)`
Sign a message.

```javascript
const signature = await walletAdapter.signMessage('Hello Web3');
```

### CryptoDepositSystem

#### `calculateDACAmount(depositAmount, depositToken)`
Calculate DAC amount from crypto deposit.

```javascript
const calc = await depositSystem.calculateDACAmount(1, 'SOL');
// Returns: { dacAmount, depositValueUSD, dacPrice, exchangeRate }
```

#### `getTokenBalance(owner, mint)`
Get token balance for user.

```javascript
const balance = await depositSystem.getTokenBalance(publicKey, mint);
// Returns: number (UI amount with decimals applied)
```

#### `getSolBalance(publicKey)`
Get SOL balance.

```javascript
const solBalance = await depositSystem.getSolBalance(publicKey);
// Returns: number in SOL
```

#### `validateDepositAmount(amount, token)`
Validate deposit parameters.

```javascript
const validation = depositSystem.validateDepositAmount(1, 'SOL');
// Returns: { valid: boolean, error?: string }
```

### SwapService

#### `getSwapQuote(inputMint, outputMint, amount)`
Get swap quote from Jupiter.

```javascript
const quote = await swapService.getSwapQuote(
  'So11111111111111111111111111111111111111112', // SOL
  '7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK', // DAC
  1000000000 // 1 SOL in lamports
);
```

#### `executeSwap(inputMint, outputMint, amount, userPublicKey)`
Execute a token swap.

```javascript
const result = await swapService.executeSwap(
  inputMint,
  outputMint,
  amount,
  publicKey
);
// Returns: { success: boolean, txId: string, inputAmount, outputAmount }
```

### GameController

#### `connectWallet(walletName)`
Connect wallet and initialize game.

```javascript
const success = await gameController.connectWallet('phantom');
```

#### `processDeposit(depositToken, depositAmount)`
Process crypto deposit and convert to DAC.

```javascript
const success = await gameController.processDeposit('SOL', 1);
```

#### `handleSpin()`
Execute a spin.

```javascript
await gameController.handleSpin();
```

#### `adjustBet(amount)`
Change bet amount.

```javascript
gameController.adjustBet(10); // Increase by 10
gameController.adjustBet(-5); // Decrease by 5
```

#### `fetchBalances()`
Refresh token balances from blockchain.

```javascript
await gameController.fetchBalances();
```

## Backend REST API

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-10T12:00:00Z",
  "network": "https://api.mainnet-beta.solana.com"
}
```

### POST /api/balance
Get token balance.

**Request:**
```json
{
  "publicKey": "wallet_address",
  "mint": "token_mint_address"
}
```

**Response:**
```json
{
  "balance": 1000.5,
  "account": "token_account_address",
  "decimals": 6
}
```

### GET /api/prices
Get current token prices.

**Response:**
```json
{
  "SOL": 125.50,
  "USDC": 1.00,
  "USDT": 1.00,
  "timestamp": "2026-05-10T12:00:00Z"
}
```

### POST /api/swap/quote
Get swap quote from Jupiter.

**Request:**
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK",
  "amount": 1000000000
}
```

**Response:**
```json
{
  "inputMint": "...",
  "outputMint": "...",
  "inAmount": "1000000000",
  "outAmount": "10000000000",
  "priceImpactPct": "0.5",
  "routePlan": [...]
}
```

### POST /api/game/spin
Process spin and verify result.

**Request:**
```json
{
  "publicKey": "wallet_address",
  "bet": 10,
  "result": {
    "winAmount": 0,
    "freeSpins": 0
  }
}
```

**Response:**
```json
{
  "success": true,
  "winAmount": 0,
  "freeSpins": 0,
  "timestamp": "2026-05-10T12:00:00Z"
}
```

### GET /api/token/dac
Get DAC token information.

**Response:**
```json
{
  "mint": "7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK",
  "name": "DocAndroschCoin",
  "symbol": "DAC",
  "decimals": 6,
  "pumpFun": "https://pump.fun/coin/7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK"
}
```

## Configuration Objects

### WEB3_CONFIG
```javascript
{
  NETWORK: {
    name: string,
    url: string,
    devnetUrl: string,
    useDevnet: boolean
  },
  TOKEN: {
    name: string,
    symbol: string,
    mint: string,
    decimals: number,
    pumpFunUrl: string
  },
  DEPOSIT_TOKENS: {
    SOL: { symbol, name, mint, decimals },
    USDC: { symbol, name, mint, decimals },
    USDT: { symbol, name, mint, decimals }
  },
  SWAP: {
    apiUrl: string,
    slippageBps: number,
    platformFeeBps: number
  },
  GAME: {
    minBet: number,
    maxBet: number,
    defaultBet: number,
    freeSpinsCount: number,
    minDepositAmount: number
  }
}
```

## Error Handling

All async functions may throw errors. Always wrap in try-catch:

```javascript
try {
  const result = await gameController.processDeposit('SOL', 1);
} catch (error) {
  console.error('Deposit failed:', error.message);
  gameController.logStatus(`❌ ${error.message}`);
}
```

Common errors:
- `No wallet connected`
- `Insufficient balance`
- `Could not fetch price for [token]`
- `Unknown token: [mint]`
- `Invalid amount`
- `Swap execution failed`
