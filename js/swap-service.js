/**
 * Swap Service - Token Exchange Integration
 * Uses Jupiter API for Solana token swaps
 */

class SwapService {
  constructor(walletAdapter) {
    this.walletAdapter = walletAdapter;
    this.jupiterAPI = WEB3_CONFIG.SWAP.apiUrl;
  }

  /**
   * Get swap quote from Jupiter
   */
  async getSwapQuote(inputMint, outputMint, amount) {
    try {
      // Convert amount to raw format (considering decimals)
      const inputToken = this.getTokenConfig(inputMint);
      const rawAmount = Math.floor(amount * Math.pow(10, inputToken.decimals));

      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: rawAmount.toString(),
        slippageBps: WEB3_CONFIG.SWAP.slippageBps.toString(),
        platformFeeBps: WEB3_CONFIG.SWAP.platformFeeBps.toString()
      });

      const response = await fetch(`${this.jupiterAPI}/quote?${params}`);
      const quote = await response.json();

      if (quote.error) {
        throw new Error(quote.error);
      }

      return quote;
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      throw error;
    }
  }

  /**
   * Execute swap transaction
   */
  async executeSwap(inputMint, outputMint, amount, userPublicKey) {
    try {
      // Get swap quote
      const quote = await this.getSwapQuote(inputMint, outputMint, amount);

      // Get swap instructions from Jupiter
      const swapResponse = await fetch(`${this.jupiterAPI}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: userPublicKey,
          wrapAndUnwrapSol: true,
          platformFeeBps: WEB3_CONFIG.SWAP.platformFeeBps
        })
      });

      const swapData = await swapResponse.json();
      
      if (swapData.error) {
        throw new Error(swapData.error);
      }

      // Build and sign transaction
      const { swapTransaction } = swapData;
      const transaction = solanaWeb3.Transaction.from(
        Buffer.from(swapTransaction, 'base64')
      );

      // Sign transaction
      const signedTx = await this.walletAdapter.signTransaction(transaction);

      // Send transaction
      const connection = new solanaWeb3.Connection(
        WEB3_CONFIG.NETWORK.useDevnet 
          ? WEB3_CONFIG.NETWORK.devnetUrl 
          : WEB3_CONFIG.NETWORK.url,
        'confirmed'
      );

      const txId = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txId);
      
      return {
        success: true,
        txId: txId,
        inputAmount: amount,
        outputAmount: this.formatAmount(
          quote.outAmount,
          this.getTokenConfig(outputMint).decimals
        )
      };
    } catch (error) {
      console.error('Swap execution failed:', error);
      throw error;
    }
  }

  /**
   * Get token configuration from deposit tokens or DAC
   */
  getTokenConfig(mint) {
    // Check deposit tokens
    for (const [symbol, config] of Object.entries(WEB3_CONFIG.DEPOSIT_TOKENS)) {
      if (config.mint === mint) {
        return config;
      }
    }

    // Check DAC token
    if (mint === WEB3_CONFIG.TOKEN.mint) {
      return WEB3_CONFIG.TOKEN;
    }

    throw new Error(`Unknown token: ${mint}`);
  }

  /**
   * Format amount with proper decimals
   */
  formatAmount(rawAmount, decimals) {
    return rawAmount / Math.pow(10, decimals);
  }

  /**
   * Validate swap parameters
   */
  validateSwap(inputMint, outputMint, amount) {
    if (!inputMint || !outputMint) {
      return { valid: false, error: 'Invalid token selection' };
    }

    if (inputMint === outputMint) {
      return { valid: false, error: 'Cannot swap token for itself' };
    }

    if (amount <= 0 || !isFinite(amount)) {
      return { valid: false, error: 'Invalid amount' };
    }

    return { valid: true };
  }
}

// Export for use in game
window.SwapService = SwapService;