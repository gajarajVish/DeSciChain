/**
 * Name Registry API for DeSciChain
 * Provides REST endpoints for interacting with the Name Registry contract
 */

const algosdk = require('algosdk');
const fs = require('fs');

class NameRegistryAPI {
    constructor() {
        // Initialize Algorand client
        this.algodToken = process.env.ALGOD_TOKEN || '';
        this.algodServer = process.env.ALGOD_ADDRESS || 'https://testnet-api.algonode.cloud';
        this.algodClient = new algosdk.Algodv2(this.algodToken, this.algodServer, '');
        
        // Load deployment info
        this.deploymentInfo = this.loadDeploymentInfo();
        this.nameRegistryAppId = this.deploymentInfo.contracts.name_registry.app_id;
    }

    loadDeploymentInfo() {
        try {
            const data = fs.readFileSync('../contracts/deployment_info.json', 'utf8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error('Could not load deployment_info.json. Please deploy contracts first.');
        }
    }

    /**
     * Register a new name
     * POST /api/names/register
     * Body: { name, cid, price, senderMnemonic }
     */
    async registerName(req, res) {
        try {
            const { name, cid, price, senderMnemonic } = req.body;

            // Validate inputs
            if (!name || !cid || !price || !senderMnemonic) {
                return res.status(400).json({
                    error: 'Missing required fields: name, cid, price, senderMnemonic'
                });
            }

            // Get sender account
            const senderAccount = algosdk.mnemonicToSecretKey(senderMnemonic);
            
            // Get suggested parameters
            const params = await this.algodClient.getTransactionParams().do();
            
            // Create application call transaction
            const appArgs = [
                new Uint8Array(Buffer.from('register')),
                new Uint8Array(Buffer.from(name)),
                new Uint8Array(Buffer.from(cid)),
                new Uint8Array(Buffer.from(price.toString()))
            ];

            const txn = algosdk.makeApplicationNoOpTxn(
                senderAccount.addr,
                params,
                this.nameRegistryAppId,
                appArgs
            );

            // Sign and submit transaction
            const signedTxn = txn.signTxn(senderAccount.sk);
            const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();
            
            // Wait for confirmation
            const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, txId, 4);

            res.json({
                success: true,
                txId: txId,
                name: name,
                price: price,
                round: confirmedTxn['confirmed-round']
            });

        } catch (error) {
            console.error('Register name error:', error);
            res.status(500).json({
                error: 'Failed to register name',
                details: error.message
            });
        }
    }

    /**
     * Resolve a name to get owner, CID, and price
     * GET /api/names/:name/resolve
     */
    async resolveName(req, res) {
        try {
            const { name } = req.params;

            if (!name) {
                return res.status(400).json({ error: 'Name parameter required' });
            }

            // Create a temporary account for the read-only transaction
            const tempAccount = algosdk.generateAccount();
            
            // Get suggested parameters
            const params = await this.algodClient.getTransactionParams().do();
            
            // Create application call transaction
            const appArgs = [
                new Uint8Array(Buffer.from('resolve')),
                new Uint8Array(Buffer.from(name))
            ];

            const txn = algosdk.makeApplicationNoOpTxn(
                tempAccount.addr,
                params,
                this.nameRegistryAppId,
                appArgs
            );

            // Sign transaction (but don't submit - we'll use dryrun)
            const signedTxn = txn.signTxn(tempAccount.sk);

            // Use dryrun to execute without submitting
            const dryrunRequest = algosdk.createDryrun(this.algodClient, [signedTxn]);
            const dryrunResult = await this.algodClient.dryrun(dryrunRequest).do();

            if (dryrunResult.txns.length > 0 && dryrunResult.txns[0].logs) {
                const logs = dryrunResult.txns[0].logs;
                const nameData = this.parseResolveLogs(logs);
                
                res.json({
                    success: true,
                    name: name,
                    ...nameData
                });
            } else {
                res.status(404).json({
                    error: 'Name not found or resolution failed'
                });
            }

        } catch (error) {
            console.error('Resolve name error:', error);
            res.status(500).json({
                error: 'Failed to resolve name',
                details: error.message
            });
        }
    }

    /**
     * Check if a name exists
     * GET /api/names/:name/exists
     */
    async nameExists(req, res) {
        try {
            const { name } = req.params;

            if (!name) {
                return res.status(400).json({ error: 'Name parameter required' });
            }

            // Create a temporary account for the read-only transaction
            const tempAccount = algosdk.generateAccount();
            
            // Get suggested parameters
            const params = await this.algodClient.getTransactionParams().do();
            
            // Create application call transaction
            const appArgs = [
                new Uint8Array(Buffer.from('exists')),
                new Uint8Array(Buffer.from(name))
            ];

            const txn = algosdk.makeApplicationNoOpTxn(
                tempAccount.addr,
                params,
                this.nameRegistryAppId,
                appArgs
            );

            // Sign and use dryrun
            const signedTxn = txn.signTxn(tempAccount.sk);
            const dryrunRequest = algosdk.createDryrun(this.algodClient, [signedTxn]);
            const dryrunResult = await this.algodClient.dryrun(dryrunRequest).do();

            if (dryrunResult.txns.length > 0 && dryrunResult.txns[0].logs) {
                const logs = dryrunResult.txns[0].logs;
                const exists = this.parseExistsLogs(logs);
                
                res.json({
                    success: true,
                    name: name,
                    exists: exists
                });
            } else {
                res.json({
                    success: true,
                    name: name,
                    exists: false
                });
            }

        } catch (error) {
            console.error('Name exists error:', error);
            res.status(500).json({
                error: 'Failed to check name existence',
                details: error.message
            });
        }
    }

    /**
     * Get marketplace listing of all registered names
     * GET /api/names/marketplace
     */
    async getMarketplace(req, res) {
        try {
            // For this demo, return the demo data
            // In a real implementation, you'd query an indexer or scan the blockchain
            const demoData = this.loadDemoData();
            
            const marketplace = demoData.registered_names.map(item => ({
                name: item.name,
                price_algo: item.price_algo,
                description: item.description,
                cid: item.cid
            }));

            res.json({
                success: true,
                names: marketplace,
                total: marketplace.length
            });

        } catch (error) {
            console.error('Marketplace error:', error);
            res.status(500).json({
                error: 'Failed to get marketplace data',
                details: error.message
            });
        }
    }

    loadDemoData() {
        try {
            const data = fs.readFileSync('../contracts/demo_data.json', 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { registered_names: [] };
        }
    }

    parseResolveLogs(logs) {
        const nameData = {};
        
        logs.forEach(logBase64 => {
            const logStr = Buffer.from(logBase64, 'base64').toString();
            
            if (logStr.startsWith('OWNER:')) {
                nameData.owner = logStr.substring(6);
            } else if (logStr.startsWith('CID:')) {
                nameData.cid = logStr.substring(4);
            } else if (logStr.startsWith('PRICE:')) {
                const priceBytes = logStr.substring(6);
                // Convert 8-byte big-endian to number
                nameData.price_microalgos = this.bytesToNumber(priceBytes);
                nameData.price_algo = nameData.price_microalgos / 1_000_000;
            } else if (logStr.startsWith('TIMESTAMP:')) {
                const timestampBytes = logStr.substring(10);
                nameData.timestamp = this.bytesToNumber(timestampBytes);
            }
        });
        
        return nameData;
    }

    parseExistsLogs(logs) {
        for (const logBase64 of logs) {
            const logStr = Buffer.from(logBase64, 'base64').toString();
            
            if (logStr.startsWith('EXISTS:')) {
                const parts = logStr.split(':');
                return parts[2] === '1';
            }
        }
        return false;
    }

    bytesToNumber(byteStr) {
        // Simple conversion - in production, properly handle big-endian 8-byte integers
        let num = 0;
        for (let i = 0; i < byteStr.length && i < 8; i++) {
            num = (num << 8) + byteStr.charCodeAt(i);
        }
        return num;
    }
}

module.exports = NameRegistryAPI;