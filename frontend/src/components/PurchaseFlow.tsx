/**
 * PurchaseFlow Component for DeSciChain
 * Handles model purchase and payment flow
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect';

interface Model {
  id: string;
  name: string;
  description: string;
  price: number;
  publisher: string;
  framework: string;
  modelType: string;
}

interface PurchaseFlowProps {
  model: Model;
  onPurchaseComplete?: (result: any) => void;
  onPurchaseError?: (error: string) => void;
  onCancel?: () => void;
}

export const PurchaseFlow: React.FC<PurchaseFlowProps> = ({
  model,
  onPurchaseComplete,
  onPurchaseError,
  onCancel
}) => {
  const { connected, address, balance, signTransaction } = useWallet();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'payment' | 'processing' | 'complete'>('confirm');
  const [purchaseResult, setPurchaseResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [txnStatus, setTxnStatus] = useState<string>('pending');

  useEffect(() => {
    if (step === 'processing' && purchaseResult) {
      checkTransactionStatus();
    }
  }, [step, purchaseResult]);

  const checkTransactionStatus = async () => {
    if (!purchaseResult?.txnId) return;

    try {
      const response = await fetch(`/api/blockchain/transaction/${purchaseResult.txnId}`);
      const data = await response.json();

      if (data.success) {
        if (data.transaction.confirmed) {
          setTxnStatus('confirmed');
          setStep('complete');
        } else if (data.transaction.error) {
          setError(data.transaction.error);
          setTxnStatus('failed');
        }
      }
    } catch (err) {
      console.error('Failed to check transaction status:', err);
    }
  };

  const handlePurchase = async () => {
    if (!connected || !address) {
      setError('Please connect your wallet to purchase models');
      return;
    }

    if (balance < model.price / 1000000) {
      setError('Insufficient balance. Please add more ALGO to your wallet.');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('payment');

    try {
      // Create purchase transaction
      const response = await fetch('/api/models/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modelId: model.id,
          buyerAddress: address,
          price: model.price
        })
      });

      const data = await response.json();

      if (data.success) {
        setPurchaseResult(data);
        setStep('processing');
        
        // Start monitoring transaction
        const interval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/blockchain/transaction/${data.txnId}`);
            const statusData = await statusResponse.json();

            if (statusData.success && statusData.transaction.confirmed) {
              clearInterval(interval);
              setTxnStatus('confirmed');
              setStep('complete');
              onPurchaseComplete?.(data);
            } else if (statusData.success && statusData.transaction.error) {
              clearInterval(interval);
              setError(statusData.transaction.error);
              setTxnStatus('failed');
            }
          } catch (err) {
            console.error('Error checking transaction status:', err);
          }
        }, 2000); // Check every 2 seconds

        // Clear interval after 5 minutes
        setTimeout(() => clearInterval(interval), 300000);
      } else {
        throw new Error(data.error || 'Purchase failed');
      }
    } catch (err: any) {
      setError(err.message);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return (price / 1000000).toFixed(2);
  };

  const renderConfirmStep = () => (
    <div className="purchase-confirm">
      <h3>Confirm Purchase</h3>
      
      <div className="model-summary">
        <h4>{model.name}</h4>
        <p className="model-description">{model.description}</p>
        
        <div className="model-details">
          <div className="detail-item">
            <span className="label">Framework:</span>
            <span className="value">{model.framework}</span>
          </div>
          <div className="detail-item">
            <span className="label">Type:</span>
            <span className="value">{model.modelType}</span>
          </div>
          <div className="detail-item">
            <span className="label">Publisher:</span>
            <span className="value">{model.publisher}</span>
          </div>
        </div>
      </div>

      <div className="purchase-summary">
        <div className="price-breakdown">
          <div className="price-item">
            <span>Model Price</span>
            <span>{formatPrice(model.price)} ALGO</span>
          </div>
          <div className="price-item">
            <span>Platform Fee (2%)</span>
            <span>{formatPrice(model.price * 0.02)} ALGO</span>
          </div>
          <div className="price-item total">
            <span>Total</span>
            <span>{formatPrice(model.price * 1.02)} ALGO</span>
          </div>
        </div>

        <div className="wallet-info">
          <div className="wallet-balance">
            <span>Your Balance:</span>
            <span>{balance.toFixed(2)} ALGO</span>
          </div>
          {balance < model.price * 1.02 / 1000000 && (
            <div className="insufficient-balance">
              <p>⚠️ Insufficient balance. Please add more ALGO to your wallet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="purchase-terms">
        <h4>Purchase Terms</h4>
        <ul>
          <li>You will receive the decryption key after payment confirmation</li>
          <li>The model will be watermarked with your wallet address</li>
          <li>You can download the model for 30 days after purchase</li>
          <li>Refunds are available within 24 hours if the model doesn't work as described</li>
        </ul>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="purchase-payment">
      <h3>Processing Payment</h3>
      <div className="payment-info">
        <p>Please confirm the transaction in your wallet</p>
        <div className="spinner"></div>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="purchase-processing">
      <h3>Processing Purchase</h3>
      <div className="processing-info">
        <div className="status-indicator">
          <div className={`status-dot ${txnStatus}`}></div>
          <span>Transaction Status: {txnStatus}</span>
        </div>
        {purchaseResult?.txnId && (
          <div className="transaction-info">
            <p>Transaction ID: {purchaseResult.txnId}</p>
            <p>This may take a few minutes to confirm...</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="purchase-complete">
      <h3>Purchase Complete! 🎉</h3>
      <div className="success-info">
        <p>Your model has been purchased successfully.</p>
        <p>You can now download the model using the decryption key.</p>
        
        {purchaseResult?.encryptionKey && (
          <div className="encryption-key">
            <h4>Your Decryption Key:</h4>
            <div className="key-display">
              <code>{purchaseResult.encryptionKey}</code>
              <button
                className="btn btn-sm"
                onClick={() => navigator.clipboard.writeText(purchaseResult.encryptionKey)}
              >
                Copy
              </button>
            </div>
            <p className="key-warning">
              ⚠️ Save this key securely. You'll need it to decrypt the model.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (!connected) {
    return (
      <div className="purchase-flow">
        <div className="wallet-required">
          <h3>Wallet Required</h3>
          <p>Please connect your wallet to purchase this model.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-flow">
      <div className="purchase-header">
        <h2>Purchase Model</h2>
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <h4>Error</h4>
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setError(null);
              setStep('confirm');
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {step === 'confirm' && renderConfirmStep()}
      {step === 'payment' && renderPaymentStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'complete' && renderCompleteStep()}

      <div className="purchase-actions">
        {step === 'confirm' && (
          <div className="action-buttons">
            {onCancel && (
              <button className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handlePurchase}
              disabled={loading || balance < model.price * 1.02 / 1000000}
            >
              {loading ? 'Processing...' : `Pay ${formatPrice(model.price * 1.02)} ALGO`}
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/my-purchases'}
            >
              View My Purchases
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.location.href = '/marketplace'}
            >
              Browse More Models
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseFlow;
