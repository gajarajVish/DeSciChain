"use strict";
/**
 * Name Registry Routes
 * REST API endpoints for the DeSci Name Registry
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const algosdk_1 = __importDefault(require("algosdk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Load deployment info
const loadDeploymentInfo = () => {
    try {
        const deploymentPath = path_1.default.join(__dirname, '../../contracts/deployment_info.json');
        const data = fs_1.default.readFileSync(deploymentPath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        throw new Error('Could not load deployment_info.json. Please deploy contracts first.');
    }
};
// Load demo data
const loadDemoData = () => {
    try {
        const demoPath = path_1.default.join(__dirname, '../../contracts/demo_data.json');
        const data = fs_1.default.readFileSync(demoPath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        return { registered_names: [] };
    }
};
// Initialize Algorand client
const algodToken = process.env.ALGOD_TOKEN || '';
const algodServer = process.env.ALGOD_ADDRESS || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk_1.default.Algodv2(algodToken, algodServer, '');
// Get name registry app ID
const deploymentInfo = loadDeploymentInfo();
const nameRegistryAppId = deploymentInfo.contracts.name_registry.app_id;
/**
 * Parse resolution logs from contract execution
 */
const parseResolveLogs = (logs) => {
    const nameData = {};
    logs.forEach(logBase64 => {
        const logStr = Buffer.from(logBase64, 'base64').toString();
        if (logStr.startsWith('OWNER:')) {
            // Owner is stored as raw bytes - convert to base32 address
            const ownerBytes = logStr.substring(6);
            nameData.owner = algosdk_1.default.encodeAddress(new Uint8Array(Buffer.from(ownerBytes, 'binary')));
        }
        else if (logStr.startsWith('CID:')) {
            nameData.cid = logStr.substring(4);
        }
        else if (logStr.startsWith('PRICE:')) {
            const priceBytes = Buffer.from(logStr.substring(6), 'binary');
            // Convert 8-byte big-endian to number
            let price = 0;
            for (let i = 0; i < priceBytes.length && i < 8; i++) {
                price = (price * 256) + priceBytes[i];
            }
            nameData.price_microalgos = price;
            nameData.price_algo = price / 1000000;
        }
        else if (logStr.startsWith('TIMESTAMP:')) {
            const timestampBytes = Buffer.from(logStr.substring(10), 'binary');
            let timestamp = 0;
            for (let i = 0; i < timestampBytes.length && i < 8; i++) {
                timestamp = (timestamp * 256) + timestampBytes[i];
            }
            nameData.timestamp = timestamp;
        }
    });
    return nameData;
};
/**
 * POST /api/names/register
 * Register a new name
 */
router.post('/register', async (req, res) => {
    try {
        const { name, cid, price, senderMnemonic } = req.body;
        // Validate inputs
        if (!name || !cid || price === undefined || !senderMnemonic) {
            return res.status(400).json({
                error: 'Missing required fields: name, cid, price, senderMnemonic'
            });
        }
        // Get sender account
        const senderAccount = algosdk_1.default.mnemonicToSecretKey(senderMnemonic);
        // Get suggested parameters
        const params = await algodClient.getTransactionParams().do();
        // Create application call transaction
        const appArgs = [
            new Uint8Array(Buffer.from('register')),
            new Uint8Array(Buffer.from(name)),
            new Uint8Array(Buffer.from(cid)),
            new Uint8Array(Buffer.from(price.toString()))
        ];
        const txn = algosdk_1.default.makeApplicationNoOpTxn(senderAccount.addr, params, nameRegistryAppId, appArgs);
        // Sign and submit transaction
        const signedTxn = txn.signTxn(senderAccount.sk);
        const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
        // Wait for confirmation
        const confirmedTxn = await algosdk_1.default.waitForConfirmation(algodClient, txId, 4);
        res.json({
            success: true,
            txId: txId,
            name: name,
            price: price,
            price_algo: price / 1000000,
            round: confirmedTxn['confirmed-round']
        });
    }
    catch (error) {
        console.error('Register name error:', error);
        res.status(500).json({
            error: 'Failed to register name',
            details: error.message
        });
    }
});
/**
 * GET /api/names/:name/resolve
 * Resolve a name to get owner, CID, and price
 */
router.get('/:name/resolve', async (req, res) => {
    try {
        const { name } = req.params;
        if (!name) {
            return res.status(400).json({ error: 'Name parameter required' });
        }
        // Create a temporary account for the read-only transaction
        const tempAccount = algosdk_1.default.generateAccount();
        // Get suggested parameters
        const params = await algodClient.getTransactionParams().do();
        // Create application call transaction
        const appArgs = [
            new Uint8Array(Buffer.from('resolve')),
            new Uint8Array(Buffer.from(name))
        ];
        const txn = algosdk_1.default.makeApplicationNoOpTxn(tempAccount.addr, params, nameRegistryAppId, appArgs);
        // Sign transaction
        const signedTxn = txn.signTxn(tempAccount.sk);
        // Use dryrun to execute without submitting
        const dryrunRequest = algosdk_1.default.createDryrun(algodClient, [signedTxn]);
        const dryrunResult = await algodClient.dryrun(dryrunRequest).do();
        if (dryrunResult.txns.length > 0 && dryrunResult.txns[0].logs) {
            const logs = dryrunResult.txns[0].logs;
            const nameData = parseResolveLogs(logs);
            res.json({
                success: true,
                name: name,
                ...nameData
            });
        }
        else {
            res.status(404).json({
                error: 'Name not found or resolution failed',
                name: name
            });
        }
    }
    catch (error) {
        console.error('Resolve name error:', error);
        res.status(500).json({
            error: 'Failed to resolve name',
            details: error.message
        });
    }
});
/**
 * GET /api/names/:name/exists
 * Check if a name exists
 */
router.get('/:name/exists', async (req, res) => {
    try {
        const { name } = req.params;
        if (!name) {
            return res.status(400).json({ error: 'Name parameter required' });
        }
        // Create a temporary account for the read-only transaction
        const tempAccount = algosdk_1.default.generateAccount();
        // Get suggested parameters
        const params = await algodClient.getTransactionParams().do();
        // Create application call transaction
        const appArgs = [
            new Uint8Array(Buffer.from('exists')),
            new Uint8Array(Buffer.from(name))
        ];
        const txn = algosdk_1.default.makeApplicationNoOpTxn(tempAccount.addr, params, nameRegistryAppId, appArgs);
        // Sign and use dryrun
        const signedTxn = txn.signTxn(tempAccount.sk);
        const dryrunRequest = algosdk_1.default.createDryrun(algodClient, [signedTxn]);
        const dryrunResult = await algodClient.dryrun(dryrunRequest).do();
        let exists = false;
        if (dryrunResult.txns.length > 0 && dryrunResult.txns[0].logs) {
            const logs = dryrunResult.txns[0].logs;
            for (const logBase64 of logs) {
                const logStr = Buffer.from(logBase64, 'base64').toString();
                if (logStr.startsWith('EXISTS:')) {
                    const parts = logStr.split(':');
                    exists = parts[2] === '1';
                    break;
                }
            }
        }
        res.json({
            success: true,
            name: name,
            exists: exists
        });
    }
    catch (error) {
        console.error('Name exists error:', error);
        res.status(500).json({
            error: 'Failed to check name existence',
            details: error.message
        });
    }
});
/**
 * GET /api/names/marketplace
 * Get marketplace listing of all registered names
 */
router.get('/marketplace', async (req, res) => {
    try {
        // For this demo, return the demo data
        // In a real implementation, you'd query an indexer or scan the blockchain
        const demoData = loadDemoData();
        const marketplace = demoData.registered_names.map((item) => ({
            name: item.name,
            price_algo: item.price_algo,
            description: item.description,
            cid: item.cid,
            tx_id: item.tx_id
        }));
        res.json({
            success: true,
            names: marketplace,
            total: marketplace.length,
            app_id: nameRegistryAppId
        });
    }
    catch (error) {
        console.error('Marketplace error:', error);
        res.status(500).json({
            error: 'Failed to get marketplace data',
            details: error.message
        });
    }
});
/**
 * GET /api/names/info
 * Get information about the Name Registry contract
 */
router.get('/info', async (req, res) => {
    try {
        res.json({
            success: true,
            contract: {
                app_id: nameRegistryAppId,
                network: deploymentInfo.network,
                creator: deploymentInfo.creator_address,
                deployment_timestamp: deploymentInfo.deployment_timestamp
            },
            endpoints: {
                register: 'POST /api/names/register',
                resolve: 'GET /api/names/:name/resolve',
                exists: 'GET /api/names/:name/exists',
                marketplace: 'GET /api/names/marketplace'
            }
        });
    }
    catch (error) {
        console.error('Info error:', error);
        res.status(500).json({
            error: 'Failed to get registry info',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=nameRegistry.route.js.map