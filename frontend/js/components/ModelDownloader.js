/**
 * ModelDownloader Component
 * Handles model download and decryption
 */

const ModelDownloader = () => {
    const { wallet, downloadModel, loading, error } = useApp();
    const [purchasedModels, setPurchasedModels] = useState([]);
    const [encryptionKey, setEncryptionKey] = useState('');
    const [downloading, setDownloading] = useState(null);

    useEffect(() => {
        if (wallet.connected) {
            fetchPurchasedModels();
        }
    }, [wallet.connected]);

    const fetchPurchasedModels = async () => {
        try {
            const response = await fetch(`/api/models/purchases?buyer=${wallet.address}`);
            const data = await response.json();
            
            if (data.success) {
                setPurchasedModels(data.models || []);
            }
        } catch (err) {
            console.error('Failed to fetch purchased models:', err);
        }
    };

    const handleDownload = async (model, key) => {
        const decryptionKey = key || encryptionKey;
        if (!decryptionKey) {
            alert('Please enter the decryption key');
            return;
        }

        try {
            setDownloading(model.id);
            await downloadModel(model.escrowId, decryptionKey);
            alert('Model downloaded successfully!');
        } catch (err) {
            alert(`Download failed: ${err.message}`);
        } finally {
            setDownloading(null);
        }
    };

    const formatPrice = (price) => {
        return (price / 1000000).toFixed(2);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusColor = (status) => {
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

    if (!wallet.connected) {
        return (
            <div className="text-center">
                <h2>My Purchased Models</h2>
                <p>Please connect your wallet to view your purchased models.</p>
            </div>
        );
    }

    return (
        <div className="model-downloader">
            <div className="section-header">
                <h2>My Purchased Models</h2>
                <button
                    className="btn btn-secondary"
                    onClick={fetchPurchasedModels}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            {purchasedModels.length === 0 ? (
                <div className="text-center">
                    <h3>No Purchased Models</h3>
                    <p>You haven't purchased any models yet.</p>
                    <a href="#marketplace" className="btn btn-primary">
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
                                            onClick={fetchPurchasedModels}
                                        >
                                            Check Status
                                        </button>
                                    </div>
                                ) : (
                                    <div className="failed-status">
                                        <p>Purchase failed</p>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={fetchPurchasedModels}
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
        </div>
    );
};
