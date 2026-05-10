/**
 * Deposit UI Manager
 * Manages the deposit modal and user interface for crypto deposits
 */

class DepositUIManager {
    constructor(options = {}) {
        this.containerSelector = options.containerSelector || '#app-container';
        this.wallet = null;
        this.swapService = null;
        this.balanceManager = null;
        this.isProcessing = false;
    }

    /**
     * Initialize with services
     */
    init(wallet, swapService, balanceManager) {
        this.wallet = wallet;
        this.swapService = swapService;
        this.balanceManager = balanceManager;
        this.createDepositModal();
        this.attachEventListeners();
    }

    /**
     * Create deposit modal HTML
     */
    createDepositModal() {
        const modalHTML = `
            <div class="deposit-modal" id="deposit-modal">
                <div class="deposit-modal-content">
                    <div class="deposit-modal-header">
                        <h2>💰 DEPOSIT CRYPTO</h2>
                        <button class="deposit-close-btn" onclick="depositUIManager.closeDepositModal()">×</button>
                    </div>
                    
                    <div class="deposit-modal-body">
                        <!-- Currency Selection -->
                        <div class="deposit-section">
                            <label class="deposit-label">SELECT CURRENCY</label>
                            <div class="currency-buttons">
                                <button class="currency-btn active" data-currency="sol" onclick="depositUIManager.selectCurrency('sol')">
                                    ◎ SOL
                                </button>
                                <button class="currency-btn" data-currency="usdc" onclick="depositUIManager.selectCurrency('usdc')">
                                    💵 USDC
                                </button>
                                <button class="currency-btn" data-currency="usdt" onclick="depositUIManager.selectCurrency('usdt')">
                                    💳 USDT
                                </button>
                            </div>
                        </div>

                        <!-- Amount Input -->
                        <div class="deposit-section">
                            <label class="deposit-label">AMOUNT</label>
                            <div class="amount-input-group">
                                <input 
                                    type="number" 
                                    id="deposit-amount" 
                                    class="deposit-input" 
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    onchange="depositUIManager.updateQuote()"
                                >
                                <span class="amount-currency" id="amount-currency">SOL</span>
                            </div>
                            <div class="balance-info">
                                Available: <span id="available-balance">0</span> <span id="balance-currency">SOL</span>
                            </div>
                        </div>

                        <!-- Quote Display -->
                        <div class="deposit-section" id="quote-section" style="display:none;">
                            <label class="deposit-label">YOU WILL RECEIVE</label>
                            <div class="quote-box">
                                <div class="quote-item">
                                    <span class="quote-label">Output Amount:</span>
                                    <span class="quote-value" id="output-amount">0</span>
                                </div>
                                <div class="quote-item">
                                    <span class="quote-label">Price Impact:</span>
                                    <span class="quote-value" id="price-impact">0%</span>
                                </div>
                                <div class="quote-item">
                                    <span class="quote-label">Network Fee:</span>
                                    <span class="quote-value">~0.00005 SOL</span>
                                </div>
                            </div>
                        </div>

                        <!-- Action Button -->
                        <button 
                            class="deposit-action-btn" 
                            id="deposit-btn"
                            onclick="depositUIManager.executeDeposit()"
                            disabled
                        >
                            DEPOSIT & SWAP
                        </button>

                        <!-- Status Message -->
                        <div class="deposit-status" id="deposit-status"></div>
                    </div>
                </div>
            </div>
        `;

        const container = document.querySelector(this.containerSelector);
        container.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Listen to balance updates
        if (this.balanceManager) {
            this.balanceManager.on('balances-updated', (balances) => {
                this.updateAvailableBalance();
            });
        }
    }

    /**
     * Open deposit modal
     */
    openDepositModal() {
        const modal = document.getElementById('deposit-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateAvailableBalance();
        }
    }

    /**
     * Close deposit modal
     */
    closeDepositModal() {
        const modal = document.getElementById('deposit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Select currency
     */
    selectCurrency(currency) {
        // Update button states
        document.querySelectorAll('.currency-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-currency="${currency}"]`).classList.add('active');

        // Update labels
        const currencySymbols = {
            sol: 'SOL',
            usdc: 'USDC',
            usdt: 'USDT'
        };
        
        document.getElementById('amount-currency').textContent = currencySymbols[currency];
        document.getElementById('balance-currency').textContent = currencySymbols[currency];
        
        this.updateAvailableBalance();
        this.updateQuote();
    }

    /**
     * Update available balance display
     */
    updateAvailableBalance() {
        const currency = document.querySelector('.currency-btn.active')?.getAttribute('data-currency') || 'sol';
        const balance = this.balanceManager ? this.balanceManager.getBalance(currency) : 0;
        document.getElementById('available-balance').textContent = balance.toFixed(4);
    }

    /**
     * Update quote from Jupiter API
     */
    async updateQuote() {
        const currency = document.querySelector('.currency-btn.active')?.getAttribute('data-currency') || 'sol';
        const amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
        const depositBtn = document.getElementById('deposit-btn');
        const quoteSection = document.getElementById('quote-section');

        if (amount <= 0 || !this.swapService) {
            depositBtn.disabled = true;
            quoteSection.style.display = 'none';
            return;
        }

        try {
            this.setStatus('Fetching quote...', 'loading');
            
            // Convert to smallest units (decimals vary by token)
            const decimals = { sol: 9, usdc: 6, usdt: 6 };
            const inputAmount = Math.floor(amount * (10 ** decimals[currency]));
            const tokenMints = {
                sol: 'So11111111111111111111111111111111111111112',
                usdc: 'EPjFWdd5Au17x2hCwwjKkk6MV4e2PSkBM7P3D4vOrq3b',
                usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenExa'
            };

            const quote = await this.swapService.estimateDACOutput(
                tokenMints[currency],
                inputAmount
            );

            if (quote) {
                const outputDAC = quote.outputAmount / 1e9; // DAC has 9 decimals
                document.getElementById('output-amount').textContent = outputDAC.toFixed(2);
                document.getElementById('price-impact').textContent = quote.priceImpact.toFixed(2) + '%';
                quoteSection.style.display = 'block';
                depositBtn.disabled = false;
                this.setStatus('', '');
            } else {
                this.setStatus('Unable to fetch quote', 'error');
                depositBtn.disabled = true;
            }
        } catch (error) {
            console.error('Quote error:', error);
            this.setStatus('Error: ' + error.message, 'error');
            depositBtn.disabled = true;
        }
    }

    /**
     * Execute deposit/swap
     */
    async executeDeposit() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const currency = document.querySelector('.currency-btn.active')?.getAttribute('data-currency') || 'sol';
            const amount = parseFloat(document.getElementById('deposit-amount').value);

            if (amount <= 0) {
                throw new Error('Please enter a valid amount');
            }

            if (!this.wallet.connected) {
                throw new Error('Wallet not connected');
            }

            this.setStatus('Processing swap...', 'loading');

            // Convert to smallest units
            const decimals = { sol: 9, usdc: 6, usdt: 6 };
            const inputAmount = Math.floor(amount * (10 ** decimals[currency]));
            const tokenMints = {
                sol: 'So11111111111111111111111111111111111111112',
                usdc: 'EPjFWdd5Au17x2hCwwjKkk6MV4e2PSkBM7P3D4vOrq3b',
                usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenExa'
            };

            const result = await this.swapService.executeSwap(
                this.wallet,
                tokenMints[currency],
                inputAmount
            );

            const outputDAC = result.outputAmount / 1e9;
            this.setStatus(
                `✅ Success! Deposited ${outputDAC.toFixed(2)} DAC (TX: ${result.txid.slice(0, 8)}...)`,
                'success'
            );

            // Refresh balances
            await this.balanceManager.fetchBalances(this.wallet.publicKey);

            // Clear input
            document.getElementById('deposit-amount').value = '';
            
            // Close modal after 2 seconds
            setTimeout(() => {
                this.closeDepositModal();
            }, 2000);
        } catch (error) {
            console.error('Deposit error:', error);
            this.setStatus('❌ ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Set status message
     */
    setStatus(message, type = '') {
        const statusEl = document.getElementById('deposit-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'deposit-status ' + (type ? `deposit-status-${type}` : '');
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.DepositUIManager = DepositUIManager;
    window.depositUIManager = null; // Will be initialized in main script
}
