/**
 * ModelDownloader Component for DeSciChain
 * Handles model download and decryption
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect';

interface PurchasedModel {
  id: string;
  name: string;
  description: string;
  publisher: string;
  purchaseDate: string;
  price: number;
  status: 'completed' | 'pending' | 'failed';
  escrowId: string;
  encryptionKey?: string;
}

interface ModelDownloaderProps {
  onDownloadComplete?: (result: any) => void;
  onDownloadError?: (error: string) => void;
}

export const ModelDownloader: React.FC<ModelDownloaderProps> = ({
  onDownloadComplete,
  onDownloadError
}) => {
  const { connected, address } = useWallet();
  
  const [purchasedModels, setPurchasedModels] = useState<PurchasedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<PurchasedModel | null>(null);

  useEffect(() => {
    if (connected && address) {
      fetchPurchasedModels();
    }
  }, [connected, address]);

  const fetchPurchasedModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/models/purchases?buyer=${address}`);
      const data = await response.json();

      if (data.success) {
        setPurchasedModels(data.models || []);
      } else {
        setError(data.error || 'Failed to fetch purchased models');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch purchased models');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (model: PurchasedModel, key?: string) => {
    if (!key && !encryptionKey) {
      setError('Please enter the decryption key');
      return;
    }

    const decryptionKey = key || encryptionKey;
    setDownloading(model.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/models/download?escrowId=${model.escrowId}&encryptionKey=${encodeURIComponent(decryptionKey)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Get filename from response headers or use model name
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${model.name.replace(/[^a-zA-Z0-9]/g, '_')}.bin`;

      // Check watermark verification
      const watermarkVerified = response.headers.get('x-watermark-verified') === 'true';
      const watermarkConfidence = response.headers.get('x-watermark-confidence');

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onDownloadComplete?.({
        model,
        filename,
        watermarkVerified,
        watermarkConfidence: watermarkConfidence ? parseFloat(watermarkConfidence) : 0
      });

      // Clear encryption key after successful download
      setEncryptionKey('');
      setSelectedModel(null);

    } catch (err: any) {
      setError(err.message);
      onDownloadError?.(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price: number) => {
    return (price / 1000000).toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-unknown';
    }
  };

  if (!connected) {
    return (
      <div className="model-downloader">
        <div className="wallet-required">
          <h3>Wallet Required</h3>
          <p>Please connect your wallet to view your purchased models.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="model-downloader">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your purchased models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="model-downloader">
      <div className="downloader-header">
        <h2>My Purchased Models</h2>
        <button
          className="btn btn-secondary"
          onClick={fetchPurchasedModels}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">
          <h4>Error</h4>
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setError(null);
              fetchPurchasedModels();
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {purchasedModels.length === 0 ? (
        <div className="no-models">
          <h3>No Purchased Models</h3>
          <p>You haven't purchased any models yet.</p>
          <a href="/marketplace" className="btn btn-primary">
            Browse Models
          </a>
        </div>
      ) : (
        <div className="purchased-models">
          {purchasedModels.map((model) => (
            <div key={model.id} className="model-item">
              <div className="model-info">
                <h3 className="model-name">{model.name}</h3>
                <p className="model-description">{model.description}</p>
                
                <div className="model-meta">
                  <div className="meta-item">
                    <span className="label">Publisher:</span>
                    <span className="value">{model.publisher}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Purchase Date:</span>
                    <span className="value">{formatDate(model.purchaseDate)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Price:</span>
                    <span className="value">{formatPrice(model.price)} ALGO</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Status:</span>
                    <span className={`status ${getStatusColor(model.status)}`}>
                      {model.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="model-actions">
                {model.status === 'completed' ? (
                  <div className="download-section">
                    {!model.encryptionKey && (
                      <div className="encryption-key-input">
                        <label>Decryption Key:</label>
                        <input
                          type="password"
                          value={encryptionKey}
                          onChange={(e) => setEncryptionKey(e.target.value)}
                          placeholder="Enter decryption key"
                        />
                      </div>
                    )}
                    
                    <button
                      className="btn btn-primary"
                      onClick={() => handleDownload(model, model.encryptionKey)}
                      disabled={downloading === model.id || (!model.encryptionKey && !encryptionKey)}
                    >
                      {downloading === model.id ? (
                        <>
                          <div className="spinner-small"></div>
                          Downloading...
                        </>
                      ) : (
                        'Download Model'
                      )}
                    </button>
                  </div>
                ) : model.status === 'pending' ? (
                  <div className="pending-status">
                    <p>Payment processing...</p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => fetchPurchasedModels()}
                    >
                      Check Status
                    </button>
                  </div>
                ) : (
                  <div className="failed-status">
                    <p>Purchase failed</p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => fetchPurchasedModels()}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download Instructions Modal */}
      {selectedModel && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Download {selectedModel.name}</h3>
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedModel(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="download-instructions">
                <h4>Download Instructions</h4>
                <ol>
                  <li>Enter your decryption key below</li>
                  <li>Click "Download Model" to start the download</li>
                  <li>Save the file to your desired location</li>
                  <li>Use the decryption key to decrypt the model file</li>
                </ol>
              </div>

              <div className="encryption-key-input">
                <label>Decryption Key:</label>
                <input
                  type="password"
                  value={encryptionKey}
                  onChange={(e) => setEncryptionKey(e.target.value)}
                  placeholder="Enter decryption key"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedModel(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleDownload(selectedModel)}
                disabled={!encryptionKey}
              >
                Download Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelDownloader;
