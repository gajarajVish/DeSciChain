/**
 * DeSciChain ML Models Marketplace - Main App
 * React application for ML model trading on Algorand
 */

const { useState, useEffect, createContext, useContext } = React;

// Global State Context
const AppContext = createContext();

// App State Provider
const AppProvider = ({ children }) => {
  const [wallet, setWallet] = useState({
    connected: false,
    address: null,
    balance: 0,
    walletType: null,
    availableWallets: []
  });
    
    const [models, setModels] = useState({
        published: [],
        purchased: [],
        all: []
    });
    
    const [transactions, setTransactions] = useState({
        pending: [],
        completed: []
    });
    
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Theme management
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

  // Wallet management
  const connectWallet = async (walletType = 'pera') => {
    try {
      setLoading(true);
      setError(null);

      // Initialize blockchain service if not done
      if (!window.blockchainService) {
        window.blockchainService = new BlockchainService();
        await window.blockchainService.initialize();
      }

      const result = await window.blockchainService.connectWallet(walletType);

      if (result.connected) {
        const balance = await fetchWalletBalance(result.address);

        setWallet({
          connected: true,
          address: result.address,
          balance,
          walletType: result.wallet,
          availableWallets: detectAvailableWallets()
        });

        Helpers.showToast(`Connected to ${result.wallet} wallet`, 'success');
      }
    } catch (err) {
      setError(err.message);
      Helpers.showToast(`Wallet connection failed: ${err.message}`, 'error');
      console.error('Wallet connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const detectAvailableWallets = () => {
    const wallets = [];

    if (typeof window.PeraWalletConnect !== 'undefined') {
      wallets.push({ id: 'pera', name: 'Pera Wallet', available: true });
    }

    if (typeof window.DeflyWalletConnect !== 'undefined') {
      wallets.push({ id: 'defly', name: 'Defly Wallet', available: true });
    }

    return wallets;
  };

  const disconnectWallet = async () => {
    try {
      if (window.blockchainService) {
        await window.blockchainService.disconnectWallet();
      }

      setWallet({
        connected: false,
        address: null,
        balance: 0,
        walletType: null,
        availableWallets: detectAvailableWallets()
      });

      Helpers.showToast('Wallet disconnected', 'info');
    } catch (err) {
      console.error('Wallet disconnection error:', err);
    }
  };

  const signTransaction = async (transaction) => {
    if (!window.blockchainService) {
      throw new Error('Blockchain service not initialized');
    }

    return await window.blockchainService.signTransaction(transaction);
  };

    const fetchWalletBalance = async (address) => {
        try {
            const response = await fetch(`/api/blockchain/account/${address}`);
            const data = await response.json();
            return data.success ? data.account.balanceAlgo : 0;
        } catch (err) {
            console.error('Failed to fetch balance:', err);
            return 0;
        }
    };

    // Model management
    const fetchModels = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/models');
            const data = await response.json();
            
            if (data.success) {
                setModels(prev => ({
                    ...prev,
                    all: data.models || []
                }));
            }
        } catch (err) {
            setError('Failed to fetch models');
            console.error('Error fetching models:', err);
        } finally {
            setLoading(false);
        }
    };

    const publishModel = async (modelData) => {
        try {
            setLoading(true);
            setError(null);
            
            const formData = new FormData();
            formData.append('model', modelData.file);
            formData.append('labId', 'current-lab');
            formData.append('licenseTerms', JSON.stringify(modelData.licenseTerms));
            formData.append('ownerInfo', wallet.address || '');
            formData.append('publisherAddress', wallet.address || '');
            formData.append('publisherPrivateKey', 'your-private-key'); // In production, handle securely

            const response = await fetch('/api/models/publish', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                setModels(prev => ({
                    ...prev,
                    published: [...prev.published, result]
                }));
                return result;
            } else {
                throw new Error(result.error || 'Failed to publish model');
            }
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const purchaseModel = async (modelId, price) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/models/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modelId,
                    buyerAddress: wallet.address,
                    price
                })
            });

            const result = await response.json();
            
            if (result.success) {
                setTransactions(prev => ({
                    ...prev,
                    pending: [...prev.pending, result]
                }));
                return result;
            } else {
                throw new Error(result.error || 'Failed to purchase model');
            }
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const downloadModel = async (escrowId, encryptionKey) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`/api/models/download?escrowId=${escrowId}&encryptionKey=${encodeURIComponent(encryptionKey)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Download failed');
            }

            // Create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `model_${escrowId}.bin`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            return true;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

  const value = {
    wallet,
    models,
    transactions,
    theme,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    signTransaction,
    fetchModels,
    publishModel,
    purchaseModel,
    downloadModel,
    toggleTheme,
    setError
  };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// Custom hook to use app context
const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

// Header Component
const Header = () => {
    const { wallet, theme, toggleTheme, connectWallet, disconnectWallet, loading, error } = useApp();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

    return (
        <header className="header">
            <div className="header-content">
                <a href="#" className="logo">DeSciChain</a>
                
                <nav className={`nav ${mobileMenuOpen ? 'show' : ''}`}>
                    <a href="#marketplace" className="nav-link">Marketplace</a>
                    <a href="#publish" className="nav-link">Publish</a>
                    <a href="#my-models" className="nav-link">My Models</a>
                    <a href="#my-purchases" className="nav-link">My Purchases</a>
                    <button className="mode-toggle" onClick={toggleTheme}>
                        <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`}></i>
                    </button>
                </nav>
                
                <div className="wallet-connect">
                    {wallet.connected ? (
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
                                onClick={disconnectWallet}
                                disabled={loading}
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
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
                    )}
                    
                    <button 
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <i className="fas fa-bars"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

// Hero Section Component
const Hero = () => {
    const { wallet } = useApp();

    return (
        <section className="hero">
            <div className="hero-content">
                <h1>
                    Trade <span className="cryptoText">ML MODELS</span> on the Blockchain
                </h1>
                <p>
                    Discover, purchase, and monetize machine learning models in a decentralized marketplace.
                    Built on Algorand with IPFS storage and advanced watermarking.
                </p>
                <div className="hero-buttons">
                    <a href="#marketplace" className="btn btn-primary">
                        Browse Models
                    </a>
                    {wallet.connected && (
                        <a href="#publish" className="btn btn-outline">
                            Publish Model
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
};

// Main App Component
const App = () => {
    const { fetchModels, loading, error } = useApp();
    const [currentView, setCurrentView] = useState('marketplace');

    useEffect(() => {
        fetchModels();
    }, []);

    const renderView = () => {
        switch (currentView) {
            case 'marketplace':
                return <ModelMarketplace />;
            case 'publish':
                return <ModelPublisher />;
            case 'my-models':
                return <MyModels />;
            case 'my-purchases':
                return <ModelDownloader />;
            default:
                return <ModelMarketplace />;
        }
    };

    return (
        <div className="app">
            <Header />
            <Hero />
            
            {error && (
                <div className="error-message">
                    <div className="error-header">
                        <strong>Error:</strong>
                        <button
                            className="error-close"
                            onClick={() => setError(null)}
                        >
                            ×
                        </button>
                    </div>
                    <p>{typeof error === 'string' ? error : error.message || 'An unknown error occurred'}</p>
                    {error.details && (
                        <details className="error-details">
                            <summary>More Details</summary>
                            <pre>{JSON.stringify(error.details, null, 2)}</pre>
                        </details>
                    )}
                </div>
            )}
            
            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            )}
            
            <main className="models-section">
                <div className="models-container">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

// Render the app
ReactDOM.render(
    <AppProvider>
        <App />
    </AppProvider>,
    document.getElementById('root')
);
