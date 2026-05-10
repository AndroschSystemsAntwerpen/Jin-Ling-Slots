/**
 * Crypto Deposit System
 * Handles conversion of SOL, USDC, USDT to DocAndroschCoin (DAC)
 */

class CryptoDepositSystem {
  constructor(walletAdapter) {
    this.walletAdapter = walletAdapter;
    this.connection = null;
    this.priceCache = {};
    this.priceUpdateInterval = 60000; // 1 minute
  }

  /**
   * Initialize Solana connection
   */
  initializeConnection() {
    const rpcUrl = WEB3_CONFIG.NETWORK.useDevnet 
      ? WEB3_CONFIG.NETWORK.devnetUrl 
      : WEB3_CONFIG.NETWORK.url;
    
    this.connection = new solanaWeb3.Connection(rpcUrl, 'confirmed');
  }

  /**
   * Fetch token prices from CoinGecko API
   */
  async fetchPrices() {
    try {
      const ids = 'solana,usd-coin,tether';
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );
      const data = await response.json();

      this.priceCache = {
        SOL: data.solana.usd,
        USDC: data['usd-coin'].usd,
        USDT: data.tether.usd,
        timestamp: Date.now()
      };

      return this.priceCache;
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      return this.priceCache; // Return cached prices if available
    }
  }

  /**
   * Get current price of a token
   */
  async getPrice(symbol) {
    // Update prices if cache is older than update interval
    if (!this.priceCache.timestamp || 
        Date.now() - this.priceCache.timestamp > this.priceUpdateInterval) {
      await this.fetchPrices();
    }

    return this.priceCache[symbol] || 0;
  }

  /**
   * Calculate DAC amount from deposit amount
   * Formula: depositAmount (USD) / DAC_price (USD) = DAC amount
   */
  async calculateDACAmount(depositAmount, depositToken) {
    try {
      const tokenPrice = await this.getPrice(depositToken);
      if (!tokenPrice) {
        throw new Error(`Could not fetch price for ${depositToken}`);
      }

      // Get DAC price from pump.fun API
      const dacPrice = await this.getDACPrice();
      
      const depositValueUSD = depositAmount * tokenPrice;
      const dacAmount = depositValueUSD / dacPrice;

      return {
        dacAmount: Math.floor(dacAmount * 1000000) / 1000000, // 6 decimals
        depositValueUSD: depositValueUSD,
        dacPrice: dacPrice,
        exchangeRate: `1 ${depositToken} = ${(dacAmount / depositAmount).toFixed(2)} DAC`
      };
    } catch (error) {
      console.error('DAC calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get DAC price from pump.fun or fallback to estimate
   */
  async getDACPrice() {
    try {
      // Try to fetch from DexScreener API
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/tokens/7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK'
      );
      const data = await response.json();
      
      if (data.pair && data.pair.priceUsd) {
        return parseFloat(data.pair.priceUsd);
      }
    } catch (error) {
      console.warn('DexScreener API failed, using fallback price');
    }

    // Fallback: estimate based on market data
    return 0.001; // Adjust based on actual market price
  }

  /**
   * Get token account for a user
   */
  async getTokenAccount(owner, mint) {
    try {
      const ownerKey = new solanaWeb3.PublicKey(owner);
      const mintKey = new solanaWeb3.PublicKey(mint);

      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        ownerKey,
        { mint: mintKey }
      );

      return tokenAccounts.value.length > 0 ? tokenAccounts.value[0] : null;
    } catch (error) {
      console.error('Failed to get token account:', error);
      return null;
    }
  }

  /**
   * Get balance of a specific token
   */
  async getTokenBalance(owner, mint) {
    try {
      const tokenAccount = await this.getTokenAccount(owner, mint);
      if (!tokenAccount) {
        return 0;
      }

      const balance = tokenAccount.account.data.parsed.info.tokenAmount;
      return balance.uiAmount || 0;
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return 0;
    }
  }

  /**
   * Get SOL balance
   */
  async getSolBalance(publicKey) {
    try {
      const key = new solanaWeb3.PublicKey(publicKey);
      const balance = await this.connection.getBalance(key);
      return balance / solanaWeb3.LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get SOL balance:', error);
      return 0;
    }
  }

  /**
   * Validate deposit amount
   */
  validateDepositAmount(amount, token) {
    const minAmount = WEB3_CONFIG.GAME.minDepositAmount;
    
    if (amount < minAmount) {
      return {
        valid: false,
        error: `Minimum deposit is ${minAmount} ${token}`
      };
    }

    if (!isFinite(amount) || amount <= 0) {
      return {
        valid: false,
        error: 'Invalid deposit amount'
      };
    }

    return { valid: true };
  }
}

// Export for use in game
window.CryptoDepositSystem = CryptoDepositSystem;