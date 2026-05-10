/**
 * Web3 Configuration & Multi-Wallet Support
 * Supports: Phantom, MetaMask Solana Snap, Magic Eden
 * Network: Solana Mainnet
 */

const WEB3_CONFIG = {
  // Blockchain Network
  NETWORK: {
    name: 'Solana Mainnet',
    url: 'https://api.mainnet-beta.solana.com',
    devnetUrl: 'https://api.devnet.solana.com',
    useDevnet: false // Set to true for testing
  },

  // DocAndroschCoin (DAC) Token Details
  TOKEN: {
    name: 'DocAndroschCoin',
    symbol: 'DAC',
    mint: '7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK',
    decimals: 6,
    pumpFunUrl: 'https://pump.fun/coin/7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK'
  },

  // Supported Cryptocurrencies for Deposits
  DEPOSIT_TOKENS: {
    SOL: {
      symbol: 'SOL',
      name: 'Solana',
      mint: 'So11111111111111111111111111111111111111112',
      decimals: 9
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      mint: 'EPjFWaLb3hyccqaJ3D2cUAQeUjn5zJvMG9PvKahRjuTs',
      decimals: 6
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      decimals: 6
    }
  },

  // Swap Exchange Configuration (Jupiter API)
  SWAP: {
    apiUrl: 'https://quote-api.jup.ag/v6',
    slippageBps: 300, // 3% slippage
    platformFeeBps: 50 // 0.5% platform fee
  },

  // Game Economics
  GAME: {
    minBet: 10, // DAC
    maxBet: 10000, // DAC
    defaultBet: 10, // DAC
    freeSpinsCount: 10,
    minDepositAmount: 1 // SOL
  }
};

/**
 * Wallet Adapter - Abstraction layer for multiple wallets
 */
class WalletAdapter {
  constructor() {
    this.wallet = null;
    this.publicKey = null;
    this.walletType = null;
  }

  /**
   * Detect and initialize available wallets
   */
  async detectWallets() {
    const wallets = {
      phantom: window.solana?.isPhantom ? window.solana : null,
      metamask: window.ethereum?.isMeta ? window.ethereum : null,
      magiceden: window.magicEden?.solana ? window.magicEden.solana : null
    };

    return Object.entries(wallets)
      .filter(([_, wallet]) => wallet !== null)
      .map(([name, _]) => name);
  }

  /**
   * Connect to specified wallet
   */
  async connect(walletName = 'phantom') {
    try {
      let wallet;
      
      switch (walletName.toLowerCase()) {
        case 'phantom':
          wallet = window.solana;
          break;
        case 'metamask':
          wallet = window.ethereum;
          break;
        case 'magiceden':
          wallet = window.magicEden?.solana;
          break;
        default:
          throw new Error(`Unsupported wallet: ${walletName}`);
      }

      if (!wallet) {
        throw new Error(`${walletName} wallet not found. Please install it.`);
      }

      // Request connection
      const response = await wallet.connect();
      this.publicKey = response.publicKey.toString();
      this.wallet = wallet;
      this.walletType = walletName;

      return {
        success: true,
        publicKey: this.publicKey,
        walletType: this.walletType
      };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect() {
    if (this.wallet && this.wallet.disconnect) {
      await this.wallet.disconnect();
    }
    this.wallet = null;
    this.publicKey = null;
    this.walletType = null;
  }

  /**
   * Sign and send transaction
   */
  async signTransaction(transaction) {
    if (!this.wallet) {
      throw new Error('No wallet connected');
    }

    try {
      const signedTx = await this.wallet.signTransaction(transaction);
      return signedTx;
    } catch (error) {
      console.error('Transaction signing failed:', error);
      throw error;
    }
  }

  /**
   * Request to sign message
   */
  async signMessage(message) {
    if (!this.wallet || !this.wallet.signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await this.wallet.signMessage(encodedMessage);
      return signedMessage;
    } catch (error) {
      console.error('Message signing failed:', error);
      throw error;
    }
  }

  isConnected() {
    return this.publicKey !== null && this.wallet !== null;
  }
}

// Export for use in game
window.WEB3 = { WEB3_CONFIG, WalletAdapter };