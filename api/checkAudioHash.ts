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
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { audioHash } = req.body;

        if (!audioHash) {
            return res.status(400).json({ message: 'Missing audioHash' });
        }

        const dbClient = await clientPromise;
        const db = dbClient.db('saremo-critique');
        const collection = db.collection('analyses');

        // Check if an analysis with this hash already exists and has an audioUrl
        const existingDoc = await collection.findOne(
            { audioHash: audioHash, audioUrl: { $ne: null } },
            { projection: { audioUrl: 1, _id: 0 } }
        );

        if (existingDoc && existingDoc.audioUrl) {
            return res.status(200).json({ exists: true, audioUrl: existingDoc.audioUrl });
        } else {
            return res.status(200).json({ exists: false });
        }

    } catch (error) {
        console.error('Error checking audio hash from MongoDB:', error);
        res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
}
