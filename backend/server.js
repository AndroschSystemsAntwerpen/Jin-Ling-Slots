/**
 * Backend Server - Game Logic & Transaction Handler
 * Node.js/Express server for secure game operations
 * 
 * Install dependencies:
 * npm install express cors dotenv @solana/web3.js @solana/spl-token axios
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Constants
const DAC_MINT = '7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK';
const RPC_URL = process.env.BACKEND_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    network: RPC_URL
  });
});

/**
 * Get token balance
 */
app.post('/api/balance', async (req, res) => {
  try {
    const { publicKey, mint } = req.body;

    if (!publicKey || !mint) {
      return res.status(400).json({ error: 'Missing publicKey or mint' });
    }

    const pubKey = new PublicKey(publicKey);
    const mintKey = new PublicKey(mint);

    const tokenAccounts = await connection.getTokenAccountsByOwner(pubKey, {
      mint: mintKey
    });

    if (tokenAccounts.value.length === 0) {
      return res.json({ balance: 0, account: null });
    }

    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;

    res.json({
      balance: balance.uiAmount,
      account: tokenAccounts.value[0].pubkey.toString(),
      decimals: balance.decimals
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify spin result and process winnings
 */
app.post('/api/game/spin', async (req, res) => {
  try {
    const { publicKey, bet, result } = req.body;

    if (!publicKey || !bet || !result) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Server-side validation of spin result
    // TODO: Implement RNG verification
    const winAmount = result.winAmount || 0;
    const freeSpins = result.freeSpins || 0;

    // Log game action (important for compliance)
    console.log(`[GAME] Player: ${publicKey}, Bet: ${bet}, Win: ${winAmount}`);

    res.json({
      success: true,
      winAmount,
      freeSpins,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Spin processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process token swap quote
 */
app.post('/api/swap/quote', async (req, res) => {
  try {
    const { inputMint, outputMint, amount } = req.body;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: 'Missing swap parameters' });
    }

    // Fetch quote from Jupiter API
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`
    );

    const quote = await response.json();

    if (quote.error) {
      return res.status(400).json({ error: quote.error });
    }

    res.json(quote);
  } catch (error) {
    console.error('Swap quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get token prices
 */
app.get('/api/prices', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?' +
      'ids=solana,usd-coin,tether&vs_currencies=usd'
    );

    const prices = await response.json();

    res.json({
      SOL: prices.solana.usd,
      USDC: prices['usd-coin'].usd,
      USDT: prices.tether.usd,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Price fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get DAC token info
 */
app.get('/api/token/dac', async (req, res) => {
  try {
    res.json({
      mint: DAC_MINT,
      name: 'DocAndroschCoin',
      symbol: 'DAC',
      decimals: 6,
      pumpFun: 'https://pump.fun/coin/7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK'
    });
  } catch (error) {
    console.error('Token info error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🎰 Jin-Ling Slots Backend running on port ${PORT}`);
  console.log(`📡 RPC URL: ${RPC_URL}`);
  console.log(`💰 DAC Token: ${DAC_MINT}`);
});

module.exports = app;
