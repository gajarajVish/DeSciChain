/**
 * ModelMarketplace Component for DeSciChain
 * Displays available ML models for purchase
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect';

interface Model {
  id: string;
  name: string;
  description: string;
  framework: string;
  modelType: string;
  price: number;
  publisher: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  performanceMetrics: Record<string, any>;
  createdAt: string;
}

interface ModelMarketplaceProps {
  onModelSelect?: (model: Model) => void;
  onPurchase?: (model: Model) => void;
}

export const ModelMarketplace: React.FC<ModelMarketplaceProps> = ({
  onModelSelect,
  onPurchase
}) => {
  const { connected, address } = useWallet();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    framework: '',
    modelType: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'rating'>('newest');

  useEffect(() => {
    fetchModels();
  }, [filters, sortBy]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters.framework) queryParams.append('framework', filters.framework);
      if (filters.modelType) queryParams.append('modelType', filters.modelType);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
      if (filters.minRating) queryParams.append('minRating', filters.minRating);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('sortBy', sortBy);

      const response = await fetch(`/api/models?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setModels(data.models || []);
      } else {
        setError(data.error || 'Failed to fetch models');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (model: Model) => {
    if (!connected) {
      alert('Please connect your wallet to purchase models');
      return;
    }

    if (onPurchase) {
      onPurchase(model);
    } else {
      // Default purchase flow
      const confirmed = window.confirm(
        `Purchase "${model.name}" for ${model.price / 1000000} ALGO?`
      );
      
      if (confirmed) {
        try {
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
            alert('Purchase initiated! Check your wallet to complete the transaction.');
          } else {
            alert(`Purchase failed: ${data.error}`);
          }
        } catch (err: any) {
          alert(`Purchase failed: ${err.message}`);
        }
      }
    }
  };

  const formatPrice = (price: number) => {
    return (price / 1000000).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`star ${i <= rating ? 'filled' : ''}`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="marketplace-loading">
        <div className="spinner"></div>
        <p>Loading models...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marketplace-error">
        <h3>Error Loading Models</h3>
        <p>{error}</p>
        <button onClick={fetchModels} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="model-marketplace">
      <div className="marketplace-header">
        <h2>ML Model Marketplace</h2>
        <p>Discover and purchase machine learning models from leading research labs</p>
      </div>

      {/* Filters */}
      <div className="marketplace-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search models..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          
          <div className="filter-group">
            <label>Framework</label>
            <select
              value={filters.framework}
              onChange={(e) => setFilters({ ...filters, framework: e.target.value })}
            >
              <option value="">All Frameworks</option>
              <option value="tensorflow">TensorFlow</option>
              <option value="pytorch">PyTorch</option>
              <option value="scikit-learn">Scikit-learn</option>
              <option value="keras">Keras</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Model Type</label>
            <select
              value={filters.modelType}
              onChange={(e) => setFilters({ ...filters, modelType: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="classification">Classification</option>
              <option value="regression">Regression</option>
              <option value="nlp">Natural Language Processing</option>
              <option value="computer-vision">Computer Vision</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Min Price (ALGO)</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Max Price (ALGO)</label>
            <input
              type="number"
              placeholder="1000"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Min Rating</label>
            <select
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
            >
              <option value="">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
              <option value="1">1+ Stars</option>
            </select>
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="models-grid">
        {models.length === 0 ? (
          <div className="no-models">
            <h3>No models found</h3>
            <p>Try adjusting your filters or check back later for new models.</p>
          </div>
        ) : (
          models.map((model) => (
            <div key={model.id} className="model-card">
              <div className="model-header">
                <h3 className="model-name">{model.name}</h3>
                <div className="model-rating">
                  {renderStars(model.rating)}
                  <span className="rating-text">
                    {model.rating.toFixed(1)} ({model.reviewCount} reviews)
                  </span>
                </div>
              </div>

              <div className="model-meta">
                <span className="model-framework">{model.framework}</span>
                <span className="model-type">{model.modelType}</span>
                <span className="model-publisher">by {model.publisher}</span>
              </div>

              <p className="model-description">{model.description}</p>

              <div className="model-tags">
                {model.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="model-performance">
                <h4>Performance Metrics</h4>
                <div className="metrics-grid">
                  {Object.entries(model.performanceMetrics).map(([key, value]) => (
                    <div key={key} className="metric">
                      <span className="metric-label">{key}</span>
                      <span className="metric-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="model-footer">
                <div className="model-price">
                  <span className="price-amount">{formatPrice(model.price)} ALGO</span>
                  <span className="price-label">Price</span>
                </div>
                <div className="model-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => onModelSelect?.(model)}
                  >
                    View Details
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePurchase(model)}
                    disabled={!connected}
                  >
                    {connected ? 'Purchase' : 'Connect Wallet'}
                  </button>
                </div>
              </div>

              <div className="model-date">
                Published {formatDate(model.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ModelMarketplace;
