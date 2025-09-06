/**
 * Simple App Component for DeSciChain
 * Minimal working version for demo
 */

import React from 'react';
import './App.css';

function SimpleApp() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🧬 DeSciChain</h1>
        <p>Decentralized ML Model Marketplace</p>
        <div className="status-panel">
          <h3>System Status ✅</h3>
          <div className="status-item">
            <span>Backend API:</span> 
            <span className="status-ok">Running on port 3001</span>
          </div>
          <div className="status-item">
            <span>Frontend:</span> 
            <span className="status-ok">Running on port 3000</span>
          </div>
          <div className="status-item">
            <span>Model Registry Contract:</span> 
            <span className="status-ok">745475657</span>
          </div>
          <div className="status-item">
            <span>Escrow Contract:</span> 
            <span className="status-ok">745475660</span>
          </div>
          <div className="status-item">
            <span>Network:</span> 
            <span className="status-ok">Algorand Testnet</span>
          </div>
        </div>
        
        <div className="action-buttons">
          <button className="btn btn-primary">
            Connect Wallet (Coming Soon)
          </button>
          <button className="btn btn-secondary">
            Browse Models (Coming Soon)
          </button>
          <button className="btn btn-secondary">
            Publish Model (Coming Soon)
          </button>
        </div>

        <div className="links">
          <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer">
            📡 Backend API
          </a>
          <a href="https://testnet.algoexplorer.io/application/745475657" target="_blank" rel="noopener noreferrer">
            🔗 Model Registry Contract
          </a>
          <a href="https://testnet.algoexplorer.io/application/745475660" target="_blank" rel="noopener noreferrer">
            🔗 Escrow Contract
          </a>
        </div>
      </header>
    </div>
  );
}

export default SimpleApp;