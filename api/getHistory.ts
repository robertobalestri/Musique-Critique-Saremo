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
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Necessario login per visualizzare lo storico personale' });
        }

        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            return res.status(500).json({ message: 'Server Configuration Error: missing JWT_SECRET' });
        }

        let userId;
        try {
            const decoded = jwt.verify(token, jwtSecret) as any;
            userId = decoded.userId;
        } catch (e) {
            return res.status(401).json({ message: 'Token non valido o scaduto' });
        }

        const dbClient = await clientPromise;
        const db = dbClient.db('saremo-critique');
        const collection = db.collection('analyses');

        const page = parseInt(req.query.page as string || '1', 10);
        const limit = parseInt(req.query.limit as string || '10', 10);
        const skip = (page - 1) * limit;

        const total = await collection.countDocuments({ userId });

        // Fetch analyses sorted by recent first
        const analyses = await collection.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();

        res.status(200).json({
            data: analyses,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching history from MongoDB:', error);
        res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
}
