/**
 * Web3 Wallet Adapter
 * Supports: Phantom Wallet + MetaMask Solana Snap
 * Chain: Solana Mainnet-Beta
 */

class Web3WalletAdapter {
    constructor(config = {}) {
        this.config = {
            rpcUrl: config.rpcUrl || 'https://api.mainnet-beta.solana.com',
            devnetRpc: config.devnetRpc || 'https://api.devnet.solana.com',
            useDevnet: config.useDevnet || false,
            ...config
        };
        
        this.wallet = null;
        this.publicKey = null;
        this.isConnected = false;
        this.walletType = null; // 'phantom' or 'metamask'
    }

    /**
     * Initialize wallet connection
     */
    async init() {
        // Check for Phantom first
        if (window.solana?.isPhantom) {
            this.walletType = 'phantom';
            this.wallet = window.solana;
            
            // Auto-connect if previously connected
            if (this.wallet.isConnected) {
                try {
                    const response = await this.wallet.connect();
                    this.publicKey = response.publicKey.toString();
                    this.isConnected = true;
                    console.log('✅ Phantom auto-connected:', this.publicKey);
                    return { success: true, wallet: 'phantom', publicKey: this.publicKey };
                } catch (err) {
                    console.error('Phantom auto-connect failed:', err);
                }
            }
        }
        
        // Check for MetaMask with Solana Snap
        if (window.ethereum?.isMetaMask) {
            console.log('🦊 MetaMask detected, Solana Snap support available');
        }
        
        return { success: false, wallet: null };
    }

    /**
     * Connect to wallet manually
     */
    async connect() {
        try {
            if (this.walletType === 'phantom' && this.wallet) {
                const response = await this.wallet.connect();
                this.publicKey = response.publicKey.toString();
                this.isConnected = true;
                
                // Subscribe to account changes
                this.wallet.on('connect', () => {
                    console.log('👛 Phantom wallet connected');
                });
                
                this.wallet.on('disconnect', () => {
                    console.log('👛 Phantom wallet disconnected');
                    this.isConnected = false;
                    this.publicKey = null;
                });
                
                return { success: true, wallet: 'phantom', publicKey: this.publicKey };
            }
        } catch (err) {
            console.error('Connection error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Disconnect wallet
     */
    async disconnect() {
        if (this.wallet && this.wallet.disconnect) {
            await this.wallet.disconnect();
            this.isConnected = false;
            this.publicKey = null;
            return { success: true };
        }
        return { success: false };
    }

    /**
     * Sign transaction
     */
    async signTransaction(transaction) {
        try {
            if (this.walletType === 'phantom' && this.wallet) {
                const signedTx = await this.wallet.signTransaction(transaction);
                return { success: true, transaction: signedTx };
            }
        } catch (err) {
            console.error('Sign transaction error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Sign multiple transactions
     */
    async signAllTransactions(transactions) {
        try {
            if (this.walletType === 'phantom' && this.wallet) {
                const signedTxs = await this.wallet.signAllTransactions(transactions);
                return { success: true, transactions: signedTxs };
            }
        } catch (err) {
            console.error('Sign all transactions error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Sign message
     */
    async signMessage(message) {
        try {
            if (this.walletType === 'phantom' && this.wallet) {
                const encodedMessage = new TextEncoder().encode(message);
                const signedMessage = await this.wallet.signMessage(encodedMessage);
                return { success: true, signature: signedMessage };
            }
        } catch (err) {
            console.error('Sign message error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Get wallet info
     */
    getWalletInfo() {
        return {
            isConnected: this.isConnected,
            publicKey: this.publicKey,
            walletType: this.walletType,
            rpcUrl: this.config.useDevnet ? this.config.devnetRpc : this.config.rpcUrl
        };
    }

    /**
     * Check if wallet is available
     */
    static isWalletAvailable() {
        return !!(window.solana?.isPhantom || window.ethereum?.isMetaMask);
    }

    /**
     * Get available wallets
     */
    static getAvailableWallets() {
        const wallets = [];
        if (window.solana?.isPhantom) wallets.push('phantom');
        if (window.ethereum?.isMetaMask) wallets.push('metamask');
        return wallets;
    }
}
