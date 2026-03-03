import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
    throw new Error('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        console.log('[saveAnalysis] Received POST request.');
        const {
            results,
            synthesis,
            averageScore,
            metadata,
            tag,
            fashionCritique,
            averageAestheticScore,
            audioUrl,
            audioHash
        } = req.body;

        console.log(`[saveAnalysis] Extracted body. Tag: "${tag}", Metadata:`, metadata);

        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const jwtSecret = process.env.JWT_SECRET;
            if (jwtSecret) {
                try {
                    const decoded = jwt.verify(token, jwtSecret) as any;
                    userId = decoded.userId;
                    console.log(`[saveAnalysis] Verified JWT. UserID: ${userId}`);
                } catch (e) {
                    console.warn('[saveAnalysis] Invalid JWT token provided');
                }
            } else {
                console.warn('[saveAnalysis] Missing JWT_SECRET env var');
            }
        }

        const dbClient = await clientPromise;
        console.log('[saveAnalysis] Connected to MongoDB database.');
        const db = dbClient.db('saremo-critique'); // Use appropriate DB name
        const collection = db.collection('analyses');

        const newDoc = {
            results,
            synthesis,
            averageScore,
            metadata,
            tag: tag || '',
            fashionCritique,
            averageAestheticScore,
            audioUrl,
            audioHash,
            userId,
            createdAt: new Date(),
        };

        console.log('[saveAnalysis] Inserting document...');
        const result = await collection.insertOne(newDoc);
        console.log(`[saveAnalysis] Successfully inserted document with ID: ${result.insertedId}`);

        res.status(200).json({ success: true, id: result.insertedId });
    } catch (error) {
        console.error('[saveAnalysis] Error saving to MongoDB:', error);
        res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
}
