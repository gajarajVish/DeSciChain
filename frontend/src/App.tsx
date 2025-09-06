/**
 * Main App Component for DeSciChain
 * Handles routing and global state management
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider, useWallet } from './components/WalletConnect';
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
          <p>Decentralized marketplace for machine learning models</p>
        </div>
        
        <div className="footer-section">
          <h4>Platform</h4>
          <ul>
            <li><a href="/marketplace">Marketplace</a></li>
            <li><a href="/publish">Publish Model</a></li>
            <li><a href="/about">About</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="/help">Help Center</a></li>
            <li><a href="/docs">Documentation</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Legal</h4>
          <ul>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/license">License</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2024 DeSciChain. All rights reserved.</p>
        <p>Powered by Algorand & IPFS</p>
      </div>
    </footer>
  );
};

// My Models Page Component
const MyModelsPage: React.FC = () => {
  const { connected } = useWallet();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected) {
      fetchMyModels();
    }
  }, [connected]);

  const fetchMyModels = async () => {
    try {
      setLoading(true);
      // This would fetch models published by the current user
      // For now, return empty array
      setModels([]);
    } catch (error) {
      console.error('Failed to fetch my models:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="page">
        <div className="wallet-required">
          <h2>My Published Models</h2>
          <p>Please connect your wallet to view your published models.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Published Models</h2>
        <a href="/publish" className="btn btn-primary">
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
          <h3>No Published Models</h3>
          <p>You haven't published any models yet.</p>
          <a href="/publish" className="btn btn-primary">
            Publish Your First Model
          </a>
        </div>
      ) : (
        <div className="my-models">
          {models.map((model) => (
            <div key={model.id} className="model-card">
              <h3>{model.name}</h3>
              <p>{model.description}</p>
              <div className="model-stats">
                <span>Price: {model.price} ALGO</span>
                <span>Purchases: {model.purchaseCount}</span>
                <span>Rating: {model.rating}/5</span>
              </div>
            </div>
          ))}
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
