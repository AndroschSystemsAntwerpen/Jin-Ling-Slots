/**
 * Multi-Wallet Adapter for Phantom & MetaMask Solana Snap
 * Handles wallet connection, detection, and provider selection
 */

class WalletAdapter {
    constructor() {
        this.provider = null;
        this.publicKey = null;
        this.connected = false;
        this.walletType = null; // 'phantom' or 'metamask'
        this.listeners = {};
    }

    /**
     * Detect available wallets and initialize
     */
    async initialize() {
        try {
            // Check for Phantom
            if (this.isPhantomInstalled()) {
                this.provider = window.solana;
                this.walletType = 'phantom';
                console.log('✅ Phantom Wallet detected');
                
                // Auto-connect if previously connected
                if (this.provider.isConnected) {
                    await this.connect();
                }
                return;
            }
            
            // Check for MetaMask Solana Snap
            if (await this.isMetaMaskSnapAvailable()) {
                this.provider = window.ethereum;
                this.walletType = 'metamask-snap';
                console.log('✅ MetaMask Solana Snap detected');
                return;
            }
            
            console.warn('⚠️ No Web3 wallet detected');
            this.emit('wallet-not-found');
        } catch (error) {
            console.error('Wallet initialization error:', error);
            this.emit('initialization-error', error);
        }
    }

    /**
     * Check if Phantom is installed
     */
    isPhantomInstalled() {
        return !!window.solana?.isPhantom;
    }

    /**
     * Check if MetaMask Solana Snap is available
     */
    async isMetaMaskSnapAvailable() {
        if (!window.ethereum) return false;
        try {
            const snaps = await window.ethereum.request({
                method: 'wallet_getSnaps'
            });
            return snaps.some(snap => snap.id.includes('solana'));
        } catch (error) {
            return false;
        }
    }

    /**
     * Connect wallet
     */
    async connect() {
        try {
            if (!this.provider) {
                throw new Error('No Web3 provider available');
            }

            if (this.walletType === 'phantom') {
                await this.connectPhantom();
            } else if (this.walletType === 'metamask-snap') {
                await this.connectMetaMaskSnap();
            }

            this.connected = true;
            this.emit('connected', {
                publicKey: this.publicKey,
                walletType: this.walletType
            });
        } catch (error) {
            console.error('Connection error:', error);
            this.emit('connection-error', error);
            throw error;
        }
    }

    /**
     * Connect Phantom Wallet
     */
    async connectPhantom() {
        try {
            const response = await this.provider.connect();
            this.publicKey = response.publicKey.toString();
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('User rejected connection');
            }
            throw error;
        }
    }

    /**
     * Connect MetaMask Solana Snap
     */
    async connectMetaMaskSnap() {
        try {
            const result = await window.ethereum.request({
                method: 'wallet_invokeSnap',
                params: {
                    snapId: 'npm:@solana-labs/metamask-snap',
                    request: {
                        method: 'getPublicKey'
                    }
                }
            });
            this.publicKey = result.publicKey;
        } catch (error) {
            throw new Error('MetaMask Snap connection failed: ' + error.message);
        }
    }

    /**
     * Disconnect wallet
     */
    async disconnect() {
        try {
            if (this.walletType === 'phantom' && this.provider.disconnect) {
                await this.provider.disconnect();
            }
            this.publicKey = null;
            this.connected = false;
            this.emit('disconnected');
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    }

    /**
     * Sign transaction (Phantom only)
     */
    async signTransaction(transaction) {
        if (this.walletType === 'phantom') {
            return await this.provider.signTransaction(transaction);
        } else {
            throw new Error('MetaMask Snap signing not yet implemented');
        }
    }

    /**
     * Sign message
     */
    async signMessage(message) {
        if (typeof message === 'string') {
            message = new TextEncoder().encode(message);
        }

        if (this.walletType === 'phantom') {
            const response = await this.provider.signMessage(message, 'utf8');
            return response.signature;
        } else {
            throw new Error('MetaMask Snap signing not yet implemented');
        }
    }

    /**
     * Request account change listener
     */
    onAccountChange(callback) {
        if (this.provider && this.provider.on) {
            this.provider.on('accountChanged', (publicKey) => {
                this.publicKey = publicKey?.toString() || null;
                callback(this.publicKey);
            });
        }
    }

    /**
     * Get wallet info
     */
    getWalletInfo() {
        return {
            connected: this.connected,
            publicKey: this.publicKey,
            walletType: this.walletType,
            provider: this.provider ? 'available' : 'unavailable'
        };
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
}

// Export for browser
if (typeof window !== 'undefined') {
    window.WalletAdapter = WalletAdapter;
}
