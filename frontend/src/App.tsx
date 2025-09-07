/**
 * Main App Component for DeSciChain
 * Handles routing and global state management
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider, useWallet, WalletConnectButton } from './components/WalletConnect';
import ModelMarketplace from './components/ModelMarketplace';
import ModelPublisher from './components/ModelPublisher';
import ModelDownloader from './components/ModelDownloader';
import PurchaseFlow from './components/PurchaseFlow';
import './App.css';

// Global state interface
interface DeSciState {
  wallet: {
    connected: boolean;
    address: string | null;
    balance: number;
  };
  models: {
    published: any[];
    purchased: any[];
  };
  transactions: {
    pending: any[];
    completed: any[];
  };
  selectedModel: any | null;
}

// Main App Component
const App: React.FC = () => {
  const [state, setState] = useState<DeSciState>({
    wallet: {
      connected: false,
      address: null,
      balance: 0
    },
    models: {
      published: [],
      purchased: []
    },
    transactions: {
      pending: [],
      completed: []
    },
    selectedModel: null
  });

  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false);

  // Update state when wallet connects/disconnects
  const updateWalletState = (walletState: any) => {
    setState(prev => ({
      ...prev,
      wallet: walletState
    }));
  };

  const handleModelSelect = (model: any) => {
    setState(prev => ({
      ...prev,
      selectedModel: model
    }));
  };

  const handlePurchase = (model: any) => {
    setState(prev => ({
      ...prev,
      selectedModel: model
    }));
    setShowPurchaseFlow(true);
  };

  const handlePurchaseComplete = (result: any) => {
    setState(prev => ({
      ...prev,
      transactions: {
        ...prev.transactions,
        completed: [...prev.transactions.completed, result]
      }
    }));
    setShowPurchaseFlow(false);
  };

  const handlePublishSuccess = (result: any) => {
    setState(prev => ({
      ...prev,
      models: {
        ...prev.models,
        published: [...prev.models.published, result]
      }
    }));
  };

  return (
    <WalletProvider>
      <Router>
        <div className="app">
          <AppHeader />
          
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/marketplace" replace />} />
              <Route 
                path="/marketplace" 
                element={
                  <ModelMarketplace 
                    onModelSelect={handleModelSelect}
                    onPurchase={handlePurchase}
                  />
                } 
              />
              <Route 
                path="/publish" 
                element={
                  <ModelPublisher 
                    onPublishSuccess={handlePublishSuccess}
                  />
                } 
              />
              <Route 
                path="/my-models" 
                element={<MyModelsPage />} 
              />
              <Route 
                path="/my-purchases" 
                element={<ModelDownloader />} 
              />
              <Route 
                path="/model/:id" 
                element={<ModelDetailsPage />} 
              />
              <Route 
                path="/checkout/:id" 
                element={<CheckoutPage />} 
              />
            </Routes>
          </main>

          <AppFooter />

          {/* Purchase Flow Modal */}
          {showPurchaseFlow && state.selectedModel && (
            <div className="modal-overlay">
              <div className="modal">
                <PurchaseFlow
                  model={state.selectedModel}
                  onPurchaseComplete={handlePurchaseComplete}
                  onCancel={() => setShowPurchaseFlow(false)}
                />
              </div>
            </div>
          )}
        </div>
      </Router>
    </WalletProvider>
  );
};

// App Header Component
const AppHeader: React.FC = () => {
  const { connected, address, balance } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo">
          <h1>DeSciChain</h1>
          <span className="tagline">ML Models Marketplace</span>
        </div>

        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <a href="/marketplace" className="nav-link">Marketplace</a>
          <a href="/publish" className="nav-link">Publish</a>
          <a href="/my-models" className="nav-link">My Models</a>
          <a href="/my-purchases" className="nav-link">My Purchases</a>
        </nav>

        <div className="header-actions">
          <WalletConnectButton />
          <button
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
};

// App Footer Component
const AppFooter: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>DeSciChain</h3>
          <p>Decentralized marketplace for machine learning models powered by blockchain technology</p>
          <div className="social-links">
            <a href="https://github.com/gajarajVish/DeSciChain" target="_blank" rel="noopener noreferrer" className="social-link">
              🐈 GitHub
            </a>
          </div>
        </div>
        
        <div className="footer-section">
          <h4>Platform</h4>
          <ul>
            <li><a href="/marketplace">Marketplace</a></li>
            <li><a href="/publish">Publish Model</a></li>
            <li><a href="/my-models">My Models</a></li>
            <li><a href="/my-purchases">My Purchases</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Resources</h4>
          <ul>
            <li><a href="https://github.com/gajarajVish/DeSciChain/blob/main/README.md" target="_blank" rel="noopener noreferrer">Documentation</a></li>
            <li><a href="mailto:vgajaraj@seas.upenn.edu">Contact Us</a></li>
            <li><a href="tel:+17323075202">Call: (732) 307-5202</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Developer</h4>
          <ul>
            <li><a href="mailto:vgajaraj@seas.upenn.edu">vgajaraj@seas.upenn.edu</a></li>
            <li><a href="tel:+17323075202">(732) 307-5202</a></li>
            <li><a href="https://github.com/gajarajVish" target="_blank" rel="noopener noreferrer">GitHub Profile</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2024 DeSciChain. Built with ❤️ for decentralized science.</p>
        <p>Powered by Algorand Blockchain & IPFS</p>
      </div>
    </footer>
  );
};

// My Models Page Component
const MyModelsPage: React.FC = () => {
  const { connected, address } = useWallet();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [showModelDetails, setShowModelDetails] = useState(false);

  useEffect(() => {
    if (connected) {
      fetchMyModels();
    }
  }, [connected]);

  const fetchMyModels = async () => {
    try {
      setLoading(true);
      
      // Fetch user's published models from API
      const response = await fetch(`http://localhost:3001/api/models/user/${address}`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Transform API data to component format
        const transformedModels = data.map((model) => ({
          id: model.id,
          name: model.name,
          description: model.description || 'No description available',
          framework: model.framework || 'Unknown',
          modelType: model.category || 'Other',
          price: (model.priceAlgo || 0) * 1000000, // Convert ALGO to microALGOs
          publisher: model.authorDisplayName || (model.creator ? `${model.creator.slice(0, 8)}...${model.creator.slice(-4)}` : 'Unknown'),
          rating: model.rating || 0,
          reviewCount: model.reviews || 0,
          purchaseCount: model.downloads || 0,
          tags: model.tags || [],
          performanceMetrics: {
            'Accuracy': model.accuracy || 'N/A',
            'Downloads': String(model.downloads || 0),
            'Size': model.fileSize ? `${Math.round(model.fileSize/1024/1024)}MB` : 'N/A'
          },
          createdAt: model.createdAt,
          status: model.encrypted ? 'published' : 'pending',
          totalEarnings: (model.priceAlgo || 0) * (model.downloads || 0) * 1000000,
          authorDisplayName: model.authorDisplayName,
          originalAuthor: model.originalAuthor || model.creator
        }));
        setModels(transformedModels);
      } else {
        // Fallback to empty array if no user models
        setModels([]);
      }
    } catch (error) {
      console.error('Failed to fetch my models:', error);
      // Fallback to empty array on error
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (model: any) => {
    setSelectedModel(model);
    setShowModelDetails(true);
  };

  const formatPrice = (price: number) => {
    return (price / 1000000).toFixed(0);
  };

  const formatEarnings = (earnings: number) => {
    return (earnings / 1000000).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const getDisplayName = (model: any) => {
    // Use authorDisplayName if available, otherwise truncate the wallet address
    if (model.authorDisplayName && model.authorDisplayName.includes('.desci')) {
      return model.authorDisplayName;
    }
    if (model.originalAuthor || model.creator) {
      const address = model.originalAuthor || model.creator;
      return `${address.slice(0, 8)}...${address.slice(-4)}`;
    }
    return 'Unknown';
  };

  if (!connected) {
    return (
      <div className="page">
        <div className="wallet-required">
          <div className="wallet-required-icon">🔐</div>
          <h2>My Published Models</h2>
          <p>Please connect your wallet to view your published models.</p>
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-section">
          <h2>My Published Models</h2>
          <div className="page-stats">
            <div className="stat-item">
              <span className="stat-value">{models.length}</span>
              <span className="stat-label">Models</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {models.reduce((sum, model) => sum + model.purchaseCount, 0)}
              </span>
              <span className="stat-label">Total Sales</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {formatEarnings(models.reduce((sum, model) => sum + model.totalEarnings, 0))}
              </span>
              <span className="stat-label">ALGO Earned</span>
            </div>
          </div>
        </div>
        <a href="/publish" className="btn btn-primary btn-gradient">
          <span className="btn-icon">+</span>
          Publish New Model
        </a>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your models...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="no-models">
          <div className="no-models-icon">🧠</div>
          <h3>No Published Models</h3>
          <p>You haven't published any models yet. Start monetizing your ML research!</p>
          <a href="/publish" className="btn btn-primary btn-gradient">
            Publish Your First Model
          </a>
        </div>
      ) : (
        <div className="models-grid premium-grid">
          {models.map((model) => (
            <div key={model.id} className="model-card premium-card">
              <div className="model-card-header">
                <div className="model-status-badge">
                  {model.status === 'published' ? '🟢' : '🟡'} 
                  {model.status === 'published' ? 'Live' : 'Pending'}
                </div>
                <div className="model-earnings">
                  <span className="earnings-amount">{formatEarnings(model.totalEarnings)}</span>
                  <span className="earnings-label">ALGO</span>
                </div>
              </div>

              <div className="model-header">
                <h3 className="model-name" title={model.name}>
                  {truncateText(model.name, 28)}
                </h3>
                <div className="model-rating">
                  {renderStars(Math.floor(model.rating))}
                  <span className="rating-text">
                    {model.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="model-meta">
                <span className="model-framework">{truncateText(model.framework, 8)}</span>
                <span className="model-type">{truncateText(model.modelType, 12)}</span>
                <span className="model-publisher">by {truncateText(getDisplayName(model), 15)}</span>
              </div>

              <p className="model-description" title={model.description}>
                {truncateText(model.description, 75)}
              </p>

              <div className="model-tags">
                {model.tags.slice(0, 2).map((tag, index) => (
                  <span key={index} className="tag">
                    {truncateText(tag, 12)}
                  </span>
                ))}
                {model.tags.length > 2 && (
                  <span className="tag tag-more">+{model.tags.length - 2}</span>
                )}
              </div>

              <div className="model-performance">
                <h4>Key Metrics</h4>
                <div className="metrics-grid-compact">
                  {Object.entries(model.performanceMetrics)
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div key={key} className="metric">
                        <span className="metric-label">{truncateText(key, 10)}</span>
                        <span className="metric-value">{truncateText(String(value), 8)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="model-stats-row">
                <div className="stat">
                  <span className="stat-icon">💰</span>
                  <span className="stat-text">{formatPrice(model.price)} ALGO</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">🛒</span>
                  <span className="stat-text">{model.purchaseCount} sales</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">⭐</span>
                  <span className="stat-text">{model.reviewCount} reviews</span>
                </div>
              </div>

              <div className="model-footer">
                <div className="model-date">
                  Published {formatDate(model.createdAt)}
                </div>
                <div className="model-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleViewDetails(model)}
                  >
                    📊 Details
                  </button>
                  <button className="btn btn-secondary btn-sm">
                    📝 Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Model Details Modal */}
      {showModelDetails && selectedModel && (
        <div className="modal-overlay" onClick={() => setShowModelDetails(false)}>
          <div className="modal premium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedModel.name}</h3>
              <button
                className="modal-close"
                onClick={() => setShowModelDetails(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="model-details-content">
                <div className="details-section">
                  <h4>Description</h4>
                  <p>{selectedModel.description}</p>
                </div>
                
                <div className="details-section">
                  <h4>Performance Metrics</h4>
                  <div className="metrics-detailed">
                    {Object.entries(selectedModel.performanceMetrics).map(([key, value]) => (
                      <div key={key} className="metric-detailed">
                        <span className="metric-label">{key}</span>
                        <span className="metric-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="details-section">
                  <h4>Sales Analytics</h4>
                  <div className="analytics-grid">
                    <div className="analytics-item">
                      <span className="analytics-label">Total Purchases</span>
                      <span className="analytics-value">{selectedModel.purchaseCount}</span>
                    </div>
                    <div className="analytics-item">
                      <span className="analytics-label">Total Earnings</span>
                      <span className="analytics-value">{formatEarnings(selectedModel.totalEarnings)} ALGO</span>
                    </div>
                    <div className="analytics-item">
                      <span className="analytics-label">Average Rating</span>
                      <span className="analytics-value">{selectedModel.rating.toFixed(1)}/5.0</span>
                    </div>
                    <div className="analytics-item">
                      <span className="analytics-label">Reviews</span>
                      <span className="analytics-value">{selectedModel.reviewCount}</span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Tags</h4>
                  <div className="tags-detailed">
                    {selectedModel.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModelDetails(false)}>
                Close
              </button>
              <button className="btn btn-primary">
                Edit Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Model Details Page Component
const ModelDetailsPage: React.FC = () => {
  const { id } = useParams();
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchModelDetails(id);
    }
  }, [id]);

  const fetchModelDetails = async (modelId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/models/${modelId}`);
      const data = await response.json();
      
      if (data.success) {
        setModel(data.model);
      }
    } catch (error) {
      console.error('Failed to fetch model details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading model details...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="page">
        <div className="error">
          <h2>Model Not Found</h2>
          <p>The requested model could not be found.</p>
          <a href="/marketplace" className="btn btn-primary">
            Browse Models
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="model-details">
        <h1>{model.name}</h1>
        <p>{model.description}</p>
        {/* Add more model details here */}
      </div>
    </div>
  );
};

// Checkout Page Component
const CheckoutPage: React.FC = () => {
  const { id } = useParams();
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchModelDetails(id);
    }
  }, [id]);

  const fetchModelDetails = async (modelId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/models/${modelId}`);
      const data = await response.json();
      
      if (data.success) {
        setModel(data.model);
      }
    } catch (error) {
      console.error('Failed to fetch model details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="page">
        <div className="error">
          <h2>Model Not Found</h2>
          <p>The requested model could not be found.</p>
          <a href="/marketplace" className="btn btn-primary">
            Browse Models
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PurchaseFlow model={model} />
    </div>
  );
};

// Import useParams from react-router-dom
import { useParams } from 'react-router-dom';

export default App;
