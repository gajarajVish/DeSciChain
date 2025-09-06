/**
 * ModelPublisher Component for DeSciChain
 * Form for publishing new ML models
 */

import React, { useState, useRef } from 'react';
import { useWallet } from './WalletConnect';

interface ModelMetadata {
  name: string;
  description: string;
  version: string;
  framework: string;
  modelType: string;
  tags: string[];
  performanceMetrics: Record<string, any>;
  datasetInfo: Record<string, any>;
  licenseTerms: {
    type: string;
    commercialUse: boolean;
    modification: boolean;
    distribution: boolean;
    attribution: boolean;
  };
}

interface ModelPublisherProps {
  onPublishSuccess?: (result: any) => void;
  onPublishError?: (error: string) => void;
}

export const ModelPublisher: React.FC<ModelPublisherProps> = ({
  onPublishSuccess,
  onPublishError
}) => {
  const { connected, address } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'metadata' | 'license' | 'publish'>('upload');
  
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata>({
    name: '',
    description: '',
    version: '1.0.0',
    framework: '',
    modelType: '',
    tags: [],
    performanceMetrics: {},
    datasetInfo: {},
    licenseTerms: {
      type: 'MIT',
      commercialUse: true,
      modification: true,
      distribution: true,
      attribution: true
    }
  });

  const [customTag, setCustomTag] = useState('');
  const [customMetricKey, setCustomMetricKey] = useState('');
  const [customMetricValue, setCustomMetricValue] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setModelFile(file);
      setStep('metadata');
    }
  };

  const handleMetadataChange = (field: keyof ModelMetadata, value: any) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (customTag.trim() && !metadata.tags.includes(customTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, customTag.trim()]
      }));
      setCustomTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addMetric = () => {
    if (customMetricKey.trim() && customMetricValue.trim()) {
      setMetadata(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          [customMetricKey.trim()]: customMetricValue.trim()
        }
      }));
      setCustomMetricKey('');
      setCustomMetricValue('');
    }
  };

  const removeMetric = (keyToRemove: string) => {
    setMetadata(prev => {
      const newMetrics = { ...prev.performanceMetrics };
      delete newMetrics[keyToRemove];
      return {
        ...prev,
        performanceMetrics: newMetrics
      };
    });
  };

  const handlePublish = async () => {
    if (!connected) {
      alert('Please connect your wallet to publish models');
      return;
    }

    if (!modelFile) {
      alert('Please select a model file');
      return;
    }

    if (!metadata.name || !metadata.description || !metadata.framework || !metadata.modelType) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      // Step 1: Upload file
      setStep('publish');
      setProgress(10);

      const formData = new FormData();
      formData.append('model', modelFile);
      formData.append('labId', 'current-lab'); // This should come from user context
      formData.append('licenseTerms', JSON.stringify(metadata.licenseTerms));
      formData.append('ownerInfo', address || '');
      formData.append('customData', JSON.stringify({
        metadata,
        publisher: address
      }));
      formData.append('publisherAddress', address || '');
      formData.append('publisherPrivateKey', 'your-private-key'); // This should be handled securely

      setProgress(30);

      const response = await fetch('/api/models/publish', {
        method: 'POST',
        body: formData
      });

      setProgress(60);

      const result = await response.json();
      setProgress(90);

      if (result.success) {
        setProgress(100);
        onPublishSuccess?.(result);
        
        // Reset form
        setModelFile(null);
        setMetadata({
          name: '',
          description: '',
          version: '1.0.0',
          framework: '',
          modelType: '',
          tags: [],
          performanceMetrics: {},
          datasetInfo: {},
          licenseTerms: {
            type: 'MIT',
            commercialUse: true,
            modification: true,
            distribution: true,
            attribution: true
          }
        });
        setStep('upload');
      } else {
        throw new Error(result.error || 'Failed to publish model');
      }
    } catch (error: any) {
      onPublishError?.(error.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const renderUploadStep = () => (
    <div className="publish-step">
      <h3>Upload Model File</h3>
      <div className="file-upload-area">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pkl,.joblib,.h5,.pb,.onnx,.pt,.pth,.bin"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div
          className="file-drop-zone"
          onClick={() => fileInputRef.current?.click()}
        >
          {modelFile ? (
            <div className="file-selected">
              <p>Selected: {modelFile.name}</p>
              <p>Size: {(modelFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="file-placeholder">
              <p>Click to select model file</p>
              <p>Supported formats: .pkl, .joblib, .h5, .pb, .onnx, .pt, .pth, .bin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMetadataStep = () => (
    <div className="publish-step">
      <h3>Model Metadata</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Model Name *</label>
          <input
            type="text"
            value={metadata.name}
            onChange={(e) => handleMetadataChange('name', e.target.value)}
            placeholder="Enter model name"
            required
          />
        </div>

        <div className="form-group">
          <label>Version</label>
          <input
            type="text"
            value={metadata.version}
            onChange={(e) => handleMetadataChange('version', e.target.value)}
            placeholder="1.0.0"
          />
        </div>

        <div className="form-group">
          <label>Framework *</label>
          <select
            value={metadata.framework}
            onChange={(e) => handleMetadataChange('framework', e.target.value)}
            required
          >
            <option value="">Select Framework</option>
            <option value="tensorflow">TensorFlow</option>
            <option value="pytorch">PyTorch</option>
            <option value="scikit-learn">Scikit-learn</option>
            <option value="keras">Keras</option>
            <option value="onnx">ONNX</option>
          </select>
        </div>

        <div className="form-group">
          <label>Model Type *</label>
          <select
            value={metadata.modelType}
            onChange={(e) => handleMetadataChange('modelType', e.target.value)}
            required
          >
            <option value="">Select Type</option>
            <option value="classification">Classification</option>
            <option value="regression">Regression</option>
            <option value="nlp">Natural Language Processing</option>
            <option value="computer-vision">Computer Vision</option>
            <option value="recommendation">Recommendation</option>
            <option value="time-series">Time Series</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label>Description *</label>
          <textarea
            value={metadata.description}
            onChange={(e) => handleMetadataChange('description', e.target.value)}
            placeholder="Describe your model, its capabilities, and use cases"
            rows={4}
            required
          />
        </div>

        <div className="form-group full-width">
          <label>Tags</label>
          <div className="tags-input">
            <div className="tags-list">
              {metadata.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="tag-input">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Add tag"
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <button type="button" onClick={addTag} className="btn btn-sm">
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="form-group full-width">
          <label>Performance Metrics</label>
          <div className="metrics-input">
            <div className="metrics-list">
              {Object.entries(metadata.performanceMetrics).map(([key, value]) => (
                <div key={key} className="metric-item">
                  <span className="metric-key">{key}</span>
                  <span className="metric-value">{value}</span>
                  <button
                    type="button"
                    onClick={() => removeMetric(key)}
                    className="metric-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="metric-input">
              <input
                type="text"
                value={customMetricKey}
                onChange={(e) => setCustomMetricKey(e.target.value)}
                placeholder="Metric name"
              />
              <input
                type="text"
                value={customMetricValue}
                onChange={(e) => setCustomMetricValue(e.target.value)}
                placeholder="Value"
              />
              <button type="button" onClick={addMetric} className="btn btn-sm">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLicenseStep = () => (
    <div className="publish-step">
      <h3>License Terms</h3>
      <div className="license-options">
        <div className="form-group">
          <label>License Type</label>
          <select
            value={metadata.licenseTerms.type}
            onChange={(e) => handleMetadataChange('licenseTerms', {
              ...metadata.licenseTerms,
              type: e.target.value
            })}
          >
            <option value="MIT">MIT License</option>
            <option value="Apache-2.0">Apache 2.0</option>
            <option value="GPL-3.0">GPL 3.0</option>
            <option value="BSD-3-Clause">BSD 3-Clause</option>
            <option value="custom">Custom License</option>
          </select>
        </div>

        <div className="license-permissions">
          <h4>Permissions</h4>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={metadata.licenseTerms.commercialUse}
              onChange={(e) => handleMetadataChange('licenseTerms', {
                ...metadata.licenseTerms,
                commercialUse: e.target.checked
              })}
            />
            Commercial Use
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={metadata.licenseTerms.modification}
              onChange={(e) => handleMetadataChange('licenseTerms', {
                ...metadata.licenseTerms,
                modification: e.target.checked
              })}
            />
            Modification
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={metadata.licenseTerms.distribution}
              onChange={(e) => handleMetadataChange('licenseTerms', {
                ...metadata.licenseTerms,
                distribution: e.target.checked
              })}
            />
            Distribution
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={metadata.licenseTerms.attribution}
              onChange={(e) => handleMetadataChange('licenseTerms', {
                ...metadata.licenseTerms,
                attribution: e.target.checked
              })}
            />
            Attribution Required
          </label>
        </div>
      </div>
    </div>
  );

  const renderPublishStep = () => (
    <div className="publish-step">
      <h3>Publishing Model</h3>
      {loading && (
        <div className="publish-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p>Progress: {progress}%</p>
        </div>
      )}
    </div>
  );

  if (!connected) {
    return (
      <div className="model-publisher">
        <div className="publisher-header">
          <h2>Publish ML Model</h2>
          <p>Connect your wallet to publish models to the marketplace</p>
        </div>
        <div className="wallet-required">
          <p>Please connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="model-publisher">
      <div className="publisher-header">
        <h2>Publish ML Model</h2>
        <p>Share your machine learning models with the research community</p>
      </div>

      <div className="publish-steps">
        <div className="step-indicator">
          <div className={`step ${step === 'upload' ? 'active' : ''}`}>1. Upload</div>
          <div className={`step ${step === 'metadata' ? 'active' : ''}`}>2. Metadata</div>
          <div className={`step ${step === 'license' ? 'active' : ''}`}>3. License</div>
          <div className={`step ${step === 'publish' ? 'active' : ''}`}>4. Publish</div>
        </div>

        {step === 'upload' && renderUploadStep()}
        {step === 'metadata' && renderMetadataStep()}
        {step === 'license' && renderLicenseStep()}
        {step === 'publish' && renderPublishStep()}

        <div className="publish-actions">
          {step === 'upload' && (
            <button
              className="btn btn-primary"
              onClick={() => setStep('metadata')}
              disabled={!modelFile}
            >
              Next: Metadata
            </button>
          )}

          {step === 'metadata' && (
            <div className="action-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => setStep('upload')}
              >
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep('license')}
                disabled={!metadata.name || !metadata.description || !metadata.framework || !metadata.modelType}
              >
                Next: License
              </button>
            </div>
          )}

          {step === 'license' && (
            <div className="action-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => setStep('metadata')}
              >
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePublish}
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish Model'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelPublisher;
