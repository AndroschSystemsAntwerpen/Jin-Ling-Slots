/**
 * Crypto Swap Service
 * Integrates with Jupiter API for SOL, USDC, USDT → DAC swaps
 */

class CryptoSwapService {
    constructor(config = {}) {
        this.jupiterApiUrl = 'https://quote-api.jup.ag/v6';
        this.rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com';
        this.dacMint = config.dacMint || '7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK';
        this.connection = null;
        this.swapHistory = [];
    }

    /**
     * Initialize Solana connection
     */
    async initialize() {
        try {
            const solanaWeb3 = window.solanaWeb3;
            if (!solanaWeb3) {
                throw new Error('Solana Web3.js not loaded');
            }
            this.connection = new solanaWeb3.Connection(this.rpcUrl);
            console.log('✅ Swap service initialized');
        } catch (error) {
            console.error('Swap service init error:', error);
            throw error;
        }
    }

    /**
     * Get quote for swapping crypto to DAC
     * @param {string} inputMint - Input token mint address (SOL, USDC, USDT)
     * @param {number} inputAmount - Amount in smallest units
     * @returns {object} Quote with exact output amount
     */
    async getQuote(inputMint, inputAmount) {
        try {
            const params = new URLSearchParams({
                inputMint: inputMint,
                outputMint: this.dacMint,
                amount: inputAmount.toString(),
                slippageBps: '100' // 1% slippage
            });

            const response = await fetch(`${this.jupiterApiUrl}/quote?${params}`);
            if (!response.ok) {
                throw new Error(`Jupiter API error: ${response.statusText}`);
            }

            const quote = await response.json();
            return {
                inputAmount: quote.inputAmount,
                outputAmount: quote.outAmount,
                priceImpact: quote.priceImpact,
                routePlan: quote.routePlan,
                platformFee: quote.platformFee
            };
        } catch (error) {
            console.error('Quote error:', error);
            throw error;
        }
    }

    /**
     * Get swap transaction
     * @param {object} quoteResponse - Quote from getQuote()
     * @param {string} userPublicKey - User's public key
     */
    async getSwapTransaction(quoteResponse, userPublicKey) {
        try {
            const response = await fetch(`${this.jupiterApiUrl}/swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quoteResponse: quoteResponse,
                    userPublicKey: userPublicKey,
                    wrapAndUnwrapSol: true,
                    dynamicComputeUnitLimit: true,
                    dynamicSlippageTolerance: true
                })
            });

            if (!response.ok) {
                throw new Error(`Swap transaction error: ${response.statusText}`);
            }

            const swapData = await response.json();
            return swapData.swapTransaction;
        } catch (error) {
            console.error('Swap transaction error:', error);
            throw error;
        }
    }

    /**
     * Execute swap via wallet
     * @param {WalletAdapter} wallet - Connected wallet adapter
     * @param {string} inputMint - Input token mint
     * @param {number} inputAmount - Amount to swap
     */
    async executeSwap(wallet, inputMint, inputAmount) {
        try {
            if (!wallet.connected) {
                throw new Error('Wallet not connected');
            }

            // Get quote
            console.log('Getting swap quote...');
            const quote = await this.getQuote(inputMint, inputAmount);
            console.log(`Quote: ${quote.inputAmount} input → ${quote.outputAmount} DAC`);

            // Get swap transaction
            console.log('Preparing swap transaction...');
            const swapTx = await this.getSwapTransaction(quote, wallet.publicKey);

            // Sign and send transaction
            console.log('Signing transaction...');
            const signed = await wallet.signTransaction(
                Buffer.from(swapTx, 'base64')
            );

            console.log('Sending transaction...');
            const txid = await this.connection.sendRawTransaction(
                signed.serialize(),
                { skipPreflight: false }
            );

            // Wait for confirmation
            console.log('Waiting for confirmation...');
            await this.connection.confirmTransaction(txid);

            const swapResult = {
                txid: txid,
                inputMint: inputMint,
                inputAmount: quote.inputAmount,
                outputAmount: quote.outputAmount,
                timestamp: new Date().toISOString(),
                status: 'confirmed'
            };

            this.swapHistory.push(swapResult);
            return swapResult;
        } catch (error) {
            console.error('Swap execution error:', error);
            throw error;
        }
    }

    /**
     * Estimate DAC received for different input amounts
     */
    async estimateDACOutput(inputMint, inputAmount) {
        try {
            const quote = await this.getQuote(inputMint, inputAmount);
            return {
                inputAmount: quote.inputAmount,
                outputAmount: quote.outputAmount,
                priceImpact: quote.priceImpact
            };
        } catch (error) {
            console.error('Estimation error:', error);
            return null;
        }
    }

    /**
     * Get swap history
     */
    getSwapHistory() {
        return this.swapHistory;
    }

    /**
     * Clear swap history
     */
    clearSwapHistory() {
        this.swapHistory = [];
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.CryptoSwapService = CryptoSwapService;
}
