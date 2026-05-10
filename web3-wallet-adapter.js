/**
 * Web3 Wallet Adapter
 * Supports: Phantom Wallet + MetaMask Solana Snap
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
        this.walletType = null;
    }

    async init() {
        if (window.solana?.isPhantom) {
            this.walletType = 'phantom';
            this.wallet = window.solana;
            if (this.wallet.isConnected) {
                try {
                    const response = await this.wallet.connect();
                    this.publicKey = response.publicKey.toString();
                    this.isConnected = true;
                    return { success: true, wallet: 'phantom', publicKey: this.publicKey };
                } catch (err) {
                    console.error('Phantom auto-connect failed:', err);
                }
            }
        }
        return { success: false, wallet: null };
    }

    async connect() {
        try {
            if (this.walletType === 'phantom' && this.wallet) {
                const response = await this.wallet.connect();
                this.publicKey = response.publicKey.toString();
                this.isConnected = true;
                return { success: true, wallet: 'phantom', publicKey: this.publicKey };
            }
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async disconnect() {
        if (this.wallet?.disconnect) {
            await this.wallet.disconnect();
            this.isConnected = false;
            this.publicKey = null;
            return { success: true };
        }
        return { success: false };
    }

    async signTransaction(transaction) {
        try {
            if (this.walletType === 'phantom' && this.wallet) {
                const signedTx = await this.wallet.signTransaction(transaction);
                return { success: true, transaction: signedTx };
            }
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    getWalletInfo() {
        return {
            isConnected: this.isConnected,
            publicKey: this.publicKey,
            walletType: this.walletType,
            rpcUrl: this.config.useDevnet ? this.config.devnetRpc : this.config.rpcUrl
        };
    }

    static isWalletAvailable() {
        return !!(window.solana?.isPhantom || window.ethereum?.isMetaMask);
    }
}
