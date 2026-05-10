/**
 * Balance Manager
 * Handles wallet balance tracking and in-game currency management
 */

class BalanceManager {
    constructor(config = {}) {
        this.rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com';
        this.dacMint = config.dacMint || '7FEUmYaUT1Ed6oFaRvrmpRr7YFg8DLjwxeX86qsx6TTK';
        this.connection = null;
        
        // Balance tracking
        this.balances = {
            sol: 0,
            usdc: 0,
            usdt: 0,
            dac: 0
        };
        
        // Token mints
        this.tokenMints = {
            sol: 'So11111111111111111111111111111111111111112',
            usdc: 'EPjFWdd5Au17x2hCwwjKkk6MV4e2PSkBM7P3D4vOrq3b',
            usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenExa',
            dac: this.dacMint
        };
        
        this.listeners = {};
        this.refreshInterval = null;
    }

    /**
     * Initialize balance manager
     */
    async initialize() {
        try {
            const solanaWeb3 = window.solanaWeb3;
            if (!solanaWeb3) {
                throw new Error('Solana Web3.js not loaded');
            }
            this.connection = new solanaWeb3.Connection(this.rpcUrl);
            console.log('✅ Balance manager initialized');
        } catch (error) {
            console.error('Balance manager init error:', error);
            throw error;
        }
    }

    /**
     * Fetch all token balances for a wallet
     */
    async fetchBalances(publicKey) {
        try {
            const solanaWeb3 = window.solanaWeb3;
            const pubKey = new solanaWeb3.PublicKey(publicKey);

            // Fetch SOL balance
            const solBalance = await this.connection.getBalance(pubKey);
            this.balances.sol = solBalance / 1e9; // Convert lamports to SOL

            // Fetch SPL token balances
            const tokenAccounts = await this.connection.getTokenAccountsByOwner(
                pubKey,
                { programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJsyFbPVwwQQfuMfA2SHn5LSHo') }
            );

            // Parse balances
            tokenAccounts.value.forEach(account => {
                const mint = account.account.data.parsed.info.mint;
                const amount = account.account.data.parsed.info.tokenAmount.uiAmount;

                if (mint === this.tokenMints.usdc) {
                    this.balances.usdc = amount;
                } else if (mint === this.tokenMints.usdt) {
                    this.balances.usdt = amount;
                } else if (mint === this.tokenMints.dac) {
                    this.balances.dac = amount;
                }
            });

            this.emit('balances-updated', this.balances);
            return this.balances;
        } catch (error) {
            console.error('Balance fetch error:', error);
            this.emit('balance-error', error);
            throw error;
        }
    }

    /**
     * Start auto-refresh of balances
     */
    startAutoRefresh(publicKey, intervalMs = 30000) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.fetchBalances(publicKey).catch(err => {
                console.error('Auto-refresh error:', err);
            });
        }, intervalMs);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Get current balances
     */
    getBalances() {
        return { ...this.balances };
    }

    /**
     * Get single token balance
     */
    getBalance(token) {
        return this.balances[token] || 0;
    }

    /**
     * Deduct from in-game DAC balance (for bets)
     */
    deductDACBalance(amount) {
        if (this.balances.dac < amount) {
            throw new Error('Insufficient DAC balance');
        }
        this.balances.dac -= amount;
        this.emit('dac-deducted', amount);
        return this.balances.dac;
    }

    /**
     * Add to in-game DAC balance (for winnings)
     */
    addDACBalance(amount) {
        this.balances.dac += amount;
        this.emit('dac-added', amount);
        return this.balances.dac;
    }

    /**
     * Event emitter methods
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoRefresh();
        this.listeners = {};
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.BalanceManager = BalanceManager;
}
