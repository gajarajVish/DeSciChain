/**
 * MyModels Component
 * Displays user's published models
 */

const MyModels = () => {
    const { wallet, models, loading } = useApp();
    const [myPublishedModels, setMyPublishedModels] = useState([]);

    useEffect(() => {
        if (wallet.connected) {
            fetchMyModels();
        }
    }, [wallet.connected]);

    const fetchMyModels = async () => {
        try {
            // This would typically fetch models published by the current user
            // For now, we'll use the published models from the context
            setMyPublishedModels(models.published || []);
        } catch (err) {
            console.error('Failed to fetch my models:', err);
        }
    };

    const formatPrice = (price) => {
        return (price / 1000000).toFixed(2);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (!wallet.connected) {
        return (
            <div className="text-center">
                <h2>My Published Models</h2>
                <p>Please connect your wallet to view your published models.</p>
            </div>
        );
    }

    return (
        <div className="my-models">
            <div className="section-header">
                <h2>My Published Models</h2>
                <a href="#publish" className="btn btn-primary">
                    Publish New Model
                </a>
            </div>

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading your models...</p>
                </div>
            ) : myPublishedModels.length === 0 ? (
                <div className="text-center">
                    <h3>No Published Models</h3>
                    <p>You haven't published any models yet.</p>
                    <a href="#publish" className="btn btn-primary">
                        Publish Your First Model
                    </a>
                </div>
            ) : (
                <div className="models-grid">
                    {myPublishedModels.map((model) => (
                        <div key={model.id} className="model-card">
                            <div className="model-header">
                                <h3 className="model-name">{model.name}</h3>
                                <div className="model-status">
                                    <span className="status published">Published</span>
                                </div>
                            </div>

                            <div className="model-meta">
                                <span className="model-framework">{model.framework}</span>
                                <span className="model-type">{model.modelType}</span>
                            </div>

                            <p className="model-description">{model.description}</p>

                            <div className="model-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Price:</span>
                                    <span className="stat-value">{formatPrice(model.price || 0)} ALGO</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Purchases:</span>
                                    <span className="stat-value">{model.purchaseCount || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Rating:</span>
                                    <span className="stat-value">{model.rating ? model.rating.toFixed(1) : 'N/A'}/5</span>
                                </div>
                            </div>

                            <div className="model-footer">
                                <div className="model-date">
                                    Published {formatDate(model.createdAt)}
                                </div>
                                <div className="model-actions">
                                    <button className="btn btn-outline">
                                        View Details
                                    </button>
                                    <button className="btn btn-secondary">
                                        Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
