/**
 * WalletConnect Component for DeSciChain
 * Handles multiple wallet connections (Pera, Defly, Exodus)
 */

const WalletConnect = () => {
    const { wallet, connectWallet, disconnectWallet, loading } = useApp();
    const [showWalletSelector, setShowWalletSelector] = useState(false);

    const availableWallets = [
        {
            id: 'pera',
            name: 'Pera Wallet',
            icon: '🔐',
            description: 'Popular Algorand wallet',
            available: typeof window.PeraWalletConnect !== 'undefined'
        },
        {
            id: 'defly',
            name: 'Defly Wallet',
            icon: '🦊',
            description: 'Secure multi-chain wallet',
            available: typeof window.DeflyWalletConnect !== 'undefined'
        },
        {
            id: 'exodus',
            name: 'Exodus',
            icon: '🌟',
            description: 'Beautiful wallet for everyone',
            available: false // Placeholder for future implementation
        }
    ];

    const handleWalletConnect = async (walletType) => {
        try {
            await connectWallet(walletType);
            setShowWalletSelector(false);
        } catch (error) {
            console.error('Wallet connection failed:', error);
        }
    };

    const handleDisconnect = async () => {
        await disconnectWallet();
    };

    if (wallet.connected) {
        return (
            <div className="wallet-connected">
                <div className="wallet-info">
                    <div className="wallet-header">
                        <span className="wallet-icon">
                            {availableWallets.find(w => w.id === wallet.walletType)?.icon || '🔐'}
                        </span>
                        <span className="wallet-name">
                            {availableWallets.find(w => w.id === wallet.walletType)?.name || 'Wallet'}
                        </span>
                    </div>
                    <div className="wallet-address">
                        {wallet.address ? Helpers.truncateAddress(wallet.address) : 'Unknown'}
                    </div>
                    <div className="wallet-balance">
                        {wallet.balance ? `${wallet.balance.toFixed(2)} ALGO` : 'Loading...'}
                    </div>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={handleDisconnect}
                    disabled={loading}
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="wallet-connect">
            <div className="wallet-selector-container">
                <button
                    className="btn btn-primary wallet-connect-btn"
                    onClick={() => setShowWalletSelector(!showWalletSelector)}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="spinner-small"></div>
                            Connecting...
                        </>
                    ) : (
                        'Connect Wallet'
                    )}
                </button>

                {showWalletSelector && (
                    <div className="wallet-selector">
                        <div className="wallet-selector-header">
                            <h4>Choose Wallet</h4>
                            <button
                                className="close-btn"
                                onClick={() => setShowWalletSelector(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="wallet-options">
                            {availableWallets.map(wallet => (
                                <div
                                    key={wallet.id}
                                    className={`wallet-option ${!wallet.available ? 'disabled' : ''}`}
                                    onClick={() => wallet.available && handleWalletConnect(wallet.id)}
                                >
                                    <div className="wallet-option-icon">
                                        {wallet.icon}
                                    </div>
                                    <div className="wallet-option-info">
                                        <div className="wallet-option-name">
                                            {wallet.name}
                                        </div>
                                        <div className="wallet-option-description">
                                            {wallet.description}
                                        </div>
                                    </div>
                                    {!wallet.available && (
                                        <div className="wallet-status">
                                            Not Installed
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="wallet-selector-footer">
                            <p>New to Algorand wallets?</p>
                            <a
                                href="https://perawallet.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="wallet-link"
                            >
                                Get Pera Wallet →
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
