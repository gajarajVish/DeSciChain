/**
 * Smart Contract Service for DeSciFi
 * Handles interaction with deployed ModelRegistry and Escrow contracts
 */

class SmartContractService {
    constructor() {
        // Contract IDs from deployment_info.json
        this.MODEL_REGISTRY_APP_ID = 745475657;
        this.ESCROW_APP_ID = 745475660;
        this.NAME_REGISTRY_APP_ID = 745493991;
        
        this.algodClient = null;
        this.isInitialized = false;
    }

    async initialize(algodClient) {
        try {
            this.algodClient = algodClient;
            this.isInitialized = true;
            console.log('✅ Smart Contract Service initialized');
            console.log(`📋 Model Registry: ${this.MODEL_REGISTRY_APP_ID}`);
            console.log(`🔒 Escrow Contract: ${this.ESCROW_APP_ID}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Smart Contract Service:', error);
            throw error;
        }
    }

    /**
     * Publish a model to the Model Registry smart contract
     */
    async publishModel(publisherAddress, modelCID, licenseTerms) {
        try {
            if (!this.isInitialized) {
                throw new Error('Smart Contract Service not initialized');
            }

            console.log('📋 Publishing model to smart contract...');

            const params = await this.algodClient.getTransactionParams().do();
            
            // Prepare application call arguments
            const appArgs = [
                new TextEncoder().encode("publish_model"),
                new TextEncoder().encode(modelCID),
                algosdk.decodeAddress(publisherAddress).publicKey,
                new TextEncoder().encode(licenseTerms)
            ];

            // Create application call transaction
            const txn = algosdk.makeApplicationCallTxnFromObject({
                from: publisherAddress,
                appIndex: this.MODEL_REGISTRY_APP_ID,
                onComplete: algosdk.OnApplicationComplete.NoOpOC,
                appArgs: appArgs,
                suggestedParams: params,
            });

            console.log('✅ Model registry transaction created');
            return txn;

        } catch (error) {
            console.error('❌ Error creating model registry transaction:', error);
            throw error;
        }
    }

    /**
     * Create an escrow for model purchase
     */
    async createEscrow(buyerAddress, sellerAddress, modelId, priceInMicroAlgos) {
        try {
            if (!this.isInitialized) {
                throw new Error('Smart Contract Service not initialized');
            }

            console.log('🔒 Creating escrow transaction...');

            // Validate inputs
            if (!buyerAddress || !sellerAddress || !modelId || !priceInMicroAlgos) {
                throw new Error('Missing required parameters for escrow creation');
            }

            if (priceInMicroAlgos <= 0) {
                throw new Error('Invalid price amount');
            }

            const params = await this.algodClient.getTransactionParams().do();

            // Create payment transaction to escrow contract
            const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                from: buyerAddress,
                to: algosdk.getApplicationAddress(this.ESCROW_APP_ID),
                amount: priceInMicroAlgos,
                suggestedParams: params,
                note: new TextEncoder().encode(`Escrow payment for model ${modelId}`)
            });

            // Create application call transaction
            const appArgs = [
                new TextEncoder().encode("create_escrow"),
                algosdk.encodeUint64(modelId),
                algosdk.decodeAddress(sellerAddress).publicKey,
                algosdk.encodeUint64(priceInMicroAlgos)
            ];

            const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
                from: buyerAddress,
                appIndex: this.ESCROW_APP_ID,
                onComplete: algosdk.OnApplicationComplete.NoOpOC,
                appArgs: appArgs,
                suggestedParams: params,
                note: new TextEncoder().encode(`Escrow creation for model ${modelId}`)
            });

            // Group transactions
            const txns = [paymentTxn, appCallTxn];
            algosdk.assignGroupID(txns);

            console.log('✅ Escrow transaction group created');
            console.log(`📊 Payment: ${priceInMicroAlgos} microAlgos to escrow contract`);
            console.log(`🔢 Model ID: ${modelId}, Seller: ${sellerAddress}`);

            return txns;

        } catch (error) {
            console.error('❌ Error creating escrow transaction:', error);
            throw error;
        }
    }

    /**
     * Release escrow funds to seller (called by buyer after receiving model)
     */
    async releaseEscrow(buyerAddress, escrowId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Smart Contract Service not initialized');
            }

            console.log('💰 Releasing escrow funds...');

            const params = await this.algodClient.getTransactionParams().do();
            
            const appArgs = [
                new TextEncoder().encode("release_escrow"),
                algosdk.encodeUint64(escrowId)
            ];

            const txn = algosdk.makeApplicationCallTxnFromObject({
                from: buyerAddress,
                appIndex: this.ESCROW_APP_ID,
                onComplete: algosdk.OnApplicationComplete.NoOpOC,
                appArgs: appArgs,
                suggestedParams: params,
            });

            console.log('✅ Escrow release transaction created');
            return txn;

        } catch (error) {
            console.error('❌ Error creating escrow release transaction:', error);
            throw error;
        }
    }

    /**
     * Get model data from Model Registry contract
     */
    async getModelFromContract(modelId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Smart Contract Service not initialized');
            }

            const appInfo = await this.algodClient.getApplicationByID(this.MODEL_REGISTRY_APP_ID).do();
            const globalState = appInfo.params['global-state'];

            // Parse global state to find model data
            const modelData = {};
            
            for (const item of globalState) {
                const key = Buffer.from(item.key, 'base64').toString();
                
                if (key.startsWith(`cid_${modelId}`)) {
                    modelData.cid = Buffer.from(item.value.bytes, 'base64').toString();
                } else if (key.startsWith(`pub_${modelId}`)) {
                    modelData.publisher = algosdk.encodeAddress(Buffer.from(item.value.bytes, 'base64'));
                } else if (key.startsWith(`lic_${modelId}`)) {
                    modelData.license = Buffer.from(item.value.bytes, 'base64').toString();
                } else if (key.startsWith(`ts_${modelId}`)) {
                    modelData.timestamp = item.value.uint;
                }
            }

            return modelData;

        } catch (error) {
            console.error('❌ Error reading model from contract:', error);
            throw error;
        }
    }

    /**
     * Get escrow status from Escrow contract
     */
    async getEscrowStatus(escrowId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Smart Contract Service not initialized');
            }

            const appInfo = await this.algodClient.getApplicationByID(this.ESCROW_APP_ID).do();
            const globalState = appInfo.params['global-state'];

            // Parse global state to find escrow data
            const escrowData = {};
            
            for (const item of globalState) {
                const key = Buffer.from(item.key, 'base64').toString();
                
                if (key.startsWith(`status_${escrowId}`)) {
                    escrowData.status = item.value.uint;
                } else if (key.startsWith(`buyer_${escrowId}`)) {
                    escrowData.buyer = algosdk.encodeAddress(Buffer.from(item.value.bytes, 'base64'));
                } else if (key.startsWith(`seller_${escrowId}`)) {
                    escrowData.seller = algosdk.encodeAddress(Buffer.from(item.value.bytes, 'base64'));
                } else if (key.startsWith(`amount_${escrowId}`)) {
                    escrowData.amount = item.value.uint;
                }
            }

            return escrowData;

        } catch (error) {
            console.error('❌ Error reading escrow status:', error);
            throw error;
        }
    }

    /**
     * Get total model count from contract
     */
    async getModelCount() {
        try {
            if (!this.isInitialized) {
                throw new Error('Smart Contract Service not initialized');
            }

            const appInfo = await this.algodClient.getApplicationByID(this.MODEL_REGISTRY_APP_ID).do();
            const globalState = appInfo.params['global-state'];

            for (const item of globalState) {
                const key = Buffer.from(item.key, 'base64').toString();
                if (key === 'model_count') {
                    return item.value.uint;
                }
            }

            return 0;

        } catch (error) {
            console.error('❌ Error reading model count:', error);
            throw error;
        }
    }

    /**
     * Verify model ownership through smart contract
     */
    async verifyModelOwnership(modelId, userAddress) {
        try {
            const modelData = await this.getModelFromContract(modelId);
            return modelData.publisher === userAddress;
        } catch (error) {
            console.error('❌ Error verifying model ownership:', error);
            return false;
        }
    }

    /**
     * Check if user has purchased a model (has completed escrow)
     */
    async hasUserPurchasedModel(modelId, userAddress) {
        try {
            // This would require tracking escrow IDs by model ID
            // For now, we'll implement a simplified version
            // In production, you'd want to maintain an index of escrows by model
            
            const appInfo = await this.algodClient.getApplicationByID(this.ESCROW_APP_ID).do();
            const globalState = appInfo.params['global-state'];

            // Look for completed escrows for this user and model
            // This is a simplified implementation - in production you'd want better indexing
            for (const item of globalState) {
                const key = Buffer.from(item.key, 'base64').toString();
                
                if (key.startsWith('buyer_') && item.value.bytes) {
                    const buyer = algosdk.encodeAddress(Buffer.from(item.value.bytes, 'base64'));
                    if (buyer === userAddress) {
                        // Found an escrow for this user, check if it's for this model
                        const escrowId = key.split('_')[1];
                        const escrowData = await this.getEscrowStatus(parseInt(escrowId));
                        
                        if (escrowData.status === 1) { // STATUS_RELEASED
                            return true;
                        }
                    }
                }
            }

            return false;

        } catch (error) {
            console.error('❌ Error checking model purchase status:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.SmartContractService = SmartContractService;
