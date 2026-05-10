/**
 * Crypto Deposit System
 * Converts SOL, USDC, USDT to DocAndroschCoin (DAC)
 */

class CryptoDepositSystem {
    constructor(config = {}) {
        this.config = {
            dacMint: '7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK',
            rpcUrl: config.rpcUrl || 'https://api.mainnet-beta.solana.com',
            ...config
        };
        
        this.supportedTokens = {
            'SOL': {
                symbol: 'SOL',
                decimals: 9,
                mint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
                icon: '◎',
                name: 'Solana'
            },
            'USDC': {
                symbol: 'USDC',
                decimals: 6,
                mint: 'EPjFWaLb3crJC2z8IVcVWXVrDjgw93ESxZykwMucjip1', // USDC on Solana
                icon: '💵',
                name: 'USD Coin'
            },
            'USDT': {
                symbol: 'USDT',
                decimals: 6,
                mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenEsw', // USDT on Solana
                icon: '💴',
                name: 'Tether USD'
            }
        };
        
        this.exchangeRates = {};
        this.depositHistory = [];
    }

    /**
     * Get supported tokens
     */
    getSupportedTokens() {
        return Object.entries(this.supportedTokens).map(([key, value]) => ({
            ...value,
            key
        }));
    }

    /**
     * Calculate DAC amount from crypto deposit
     * Formula: depositAmount * exchangeRate = DAC amount
     */
    async calculateDACAmount(amount, tokenSymbol, exchangeRate = null) {
        if (!this.supportedTokens[tokenSymbol]) {
            throw new Error(`Unsupported token: ${tokenSymbol}`);
        }

        // If no exchange rate provided, use default conversions
        if (!exchangeRate) {
            exchangeRate = await this.getExchangeRate(tokenSymbol);
        }

        // Convert to base units
        const token = this.supportedTokens[tokenSymbol];
        const baseAmount = amount * Math.pow(10, token.decimals);
        const dacAmount = (amount * exchangeRate);

        return {
            inputAmount: amount,
            inputToken: tokenSymbol,
            dacAmount: Math.floor(dacAmount),
            exchangeRate: exchangeRate,
            baseAmount: baseAmount
        };
    }

    /**
     * Get current exchange rates (simplified - in production use CoinGecko/Jupiter API)
     */
    async getExchangeRate(tokenSymbol) {
        // Simplified rates - in production, fetch from real API
        const rates = {
            'SOL': 150, // 1 SOL = 150 DAC (example)
            'USDC': 10, // 1 USDC = 10 DAC (example)
            'USDT': 10  // 1 USDT = 10 DAC (example)
        };
        
        return rates[tokenSymbol] || 1;
    }

    /**
     * Validate deposit amount
     */
    validateDeposit(amount, tokenSymbol) {
        const validation = {
            isValid: true,
            errors: []
        };

        if (!amount || amount <= 0) {
            validation.isValid = false;
            validation.errors.push('Amount must be greater than 0');
        }

        if (!this.supportedTokens[tokenSymbol]) {
            validation.isValid = false;
            validation.errors.push(`Unsupported token: ${tokenSymbol}`);
        }

        // Minimum deposit: 0.1 of any token
        if (amount < 0.1) {
            validation.isValid = false;
            validation.errors.push('Minimum deposit: 0.1 ' + tokenSymbol);
        }

        // Maximum deposit: 10,000 of any token
        if (amount > 10000) {
            validation.isValid = false;
            validation.errors.push('Maximum deposit: 10,000 ' + tokenSymbol);
        }

        return validation;
    }

    /**
     * Process deposit (mock - backend integration required)
     */
    async processDeposit(walletAddress, amount, tokenSymbol, transactionHash = null) {
        const validation = this.validateDeposit(amount, tokenSymbol);
        
        if (!validation.isValid) {
            return {
                success: false,
                errors: validation.errors
            };
        }

        const calculation = await this.calculateDACAmount(amount, tokenSymbol);
        
        const deposit = {
            id: this.generateDepositId(),
            walletAddress,
            timestamp: new Date().toISOString(),
            inputAmount: amount,
            inputToken: tokenSymbol,
            dacReceived: calculation.dacAmount,
            exchangeRate: calculation.exchangeRate,
            transactionHash: transactionHash || 'pending',
            status: 'completed' // In production: 'pending' -> 'confirmed' -> 'completed'
        };

        this.depositHistory.push(deposit);

        return {
            success: true,
            deposit: deposit
        };
    }

    /**
     * Generate unique deposit ID
     */
    generateDepositId() {
        return 'DEP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get deposit history
     */
    getDepositHistory(walletAddress = null) {
        if (walletAddress) {
            return this.depositHistory.filter(d => d.walletAddress === walletAddress);
        }
        return this.depositHistory;
    }

    /**
     * Calculate fees (example: 2% fee)
     */
    calculateFees(amount, tokenSymbol) {
        const feePercentage = 0.02; // 2%
        const fee = amount * feePercentage;
        const netAmount = amount - fee;

        return {
            grossAmount: amount,
            feePercentage: feePercentage * 100,
            fee: fee,
            netAmount: netAmount
        };
    }
}
