/**
 * WalletConnect Component for DeSciChain
 * Handles Pera Wallet connection and management
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';

interface WalletContextType {
  connected: boolean;
  address: string | null;
  balance: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (txn: any) => Promise<any>;
  loading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);

  useEffect(() => {
    // Initialize Pera Wallet
    const peraWalletConnect = new PeraWalletConnect({
      chainId: 416002, // TestNet
      shouldShowSignTxnToast: true
    });

    setPeraWallet(peraWalletConnect);

    // Check if already connected
    peraWalletConnect.reconnectSession().then((accounts) => {
      if (accounts.length > 0) {
        setConnected(true);
        setAddress(accounts[0]);
        fetchBalance(accounts[0]);
      }
    }).catch((err) => {
      console.log('No existing session:', err);
    });

    // Listen for account changes
    peraWalletConnect.connector?.on('disconnect', () => {
      setConnected(false);
      setAddress(null);
      setBalance(0);
    });

    return () => {
      peraWalletConnect.connector?.off('disconnect');
    };
  }, []);

  const fetchBalance = async (walletAddress: string) => {
    try {
      const response = await fetch(`/api/blockchain/account/${walletAddress}`);
      const data = await response.json();
      
      if (data.success) {
        setBalance(data.account.balanceAlgo);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const connect = async () => {
    if (!peraWallet) return;

    setLoading(true);
    setError(null);

    try {
      const accounts = await peraWallet.connect();
      
      if (accounts.length > 0) {
        setConnected(true);
        setAddress(accounts[0]);
        await fetchBalance(accounts[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    if (peraWallet) {
      peraWallet.disconnect();
      setConnected(false);
      setAddress(null);
      setBalance(0);
    }
  };

  const signTransaction = async (txn: any) => {
    if (!peraWallet || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTxn = await peraWallet.signTransaction([txn]);
      return signedTxn[0];
    } catch (err: any) {
      throw new Error(`Failed to sign transaction: ${err.message}`);
    }
  };

  const value: WalletContextType = {
    connected,
    address,
    balance,
    connect,
    disconnect,
    signTransaction,
    loading,
    error
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

interface WalletConnectButtonProps {
  className?: string;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ className = '' }) => {
  const { connected, address, balance, connect, disconnect, loading, error } = useWallet();

  if (connected && address) {
    return (
      <div className={`wallet-connected ${className}`}>
        <div className="wallet-info">
          <span className="wallet-address">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="wallet-balance">
            {balance.toFixed(2)} ALGO
          </span>
        </div>
        <button 
          onClick={disconnect}
          className="btn btn-secondary"
          disabled={loading}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`wallet-connect ${className}`}>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <button 
        onClick={connect}
        className="btn btn-primary"
        disabled={loading}
      >
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
};

export default WalletConnectButton;
