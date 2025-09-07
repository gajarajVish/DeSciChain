/**
 * Database Migration Script for DeSciFi
 * Sets up the complete database schema for the ML models marketplace
 */

const fs = require('fs');
const path = require('path');

// Database configuration
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'descichain',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
};

async function runMigration() {
    let client;
    
    try {
        // Import pg dynamically to handle missing dependency gracefully
        const { Client } = require('pg');
        
        console.log('🚀 Starting DeSciFi database migration...');
        console.log(`📍 Connecting to database: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
        
        // Create database client
        client = new Client(DB_CONFIG);
        await client.connect();
        
        console.log('✅ Connected to database successfully');
        
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📄 Executing database schema...');
        
        // Execute schema
        await client.query(schema);
        
        console.log('✅ Database schema executed successfully');
        
        // Verify tables were created
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;
        
        const result = await client.query(tablesQuery);
        const tables = result.rows.map(row => row.table_name);
        
        console.log('📊 Created tables:');
        tables.forEach(table => {
            console.log(`   ✓ ${table}`);
        });
        
        // Verify views were created
        const viewsQuery = `
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;
        
        const viewsResult = await client.query(viewsQuery);
        const views = viewsResult.rows.map(row => row.table_name);
        
        if (views.length > 0) {
            console.log('👁️  Created views:');
            views.forEach(view => {
                console.log(`   ✓ ${view}`);
            });
        }
        
        console.log('🎉 Database migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Database migration failed:', error);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Make sure PostgreSQL is running and accessible');
            console.error('💡 Check your database configuration in environment variables');
        } else if (error.code === '3D000') {
            console.error('💡 Database does not exist. Please create it first:');
            console.error(`   createdb ${DB_CONFIG.database}`);
        } else if (error.code === '28P01') {
            console.error('💡 Authentication failed. Check your credentials');
        }
        
        process.exit(1);
    } finally {
        if (client) {
            await client.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Helper function to create database if it doesn't exist
async function createDatabaseIfNotExists() {
    let client;
    
    try {
        const { Client } = require('pg');
        
        // Connect to postgres database to create our database
        const adminConfig = {
            ...DB_CONFIG,
            database: 'postgres'
        };
        
        client = new Client(adminConfig);
        await client.connect();
        
        // Check if database exists
        const checkDbQuery = `
            SELECT 1 FROM pg_database WHERE datname = $1;
        `;
        
        const result = await client.query(checkDbQuery, [DB_CONFIG.database]);
        
        if (result.rows.length === 0) {
            console.log(`🏗️  Creating database: ${DB_CONFIG.database}`);
            await client.query(`CREATE DATABASE ${DB_CONFIG.database};`);
            console.log('✅ Database created successfully');
        } else {
            console.log(`✅ Database ${DB_CONFIG.database} already exists`);
        }
        
    } catch (error) {
        console.error('❌ Failed to create database:', error);
        throw error;
    } finally {
        if (client) {
            await client.end();
        }
    }
}

// Main execution
async function main() {
    try {
        // First, try to create the database if it doesn't exist
        await createDatabaseIfNotExists();
        
        // Then run the migration
        await runMigration();
        
    } catch (error) {
        console.error('❌ Migration process failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    runMigration,
    createDatabaseIfNotExists,
    DB_CONFIG
};
