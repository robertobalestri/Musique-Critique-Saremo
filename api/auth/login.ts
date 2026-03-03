import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
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
        console.log("=== START ENV DEBUG ===");
        console.log("MONGODB_URI is set:", !!process.env.MONGODB_URI);
        console.log("JWT_SECRET is set:", !!process.env.JWT_SECRET);
        console.log("JWT_SECRET raw value:", process.env.JWT_SECRET);
        console.log("All ENV Keys:", Object.keys(process.env).filter(k => !k.startsWith('npm_')).join(', '));
        console.log("=== END ENV DEBUG ===");

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username e password sono richiesti' });
        }

        const dbClient = await clientPromise;
        const db = dbClient.db('saremo-critique');
        const collection = db.collection('users');

        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Credenziali non valide' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenziali non valide' });
        }

        if (user.isVerified === false) {
            return res.status(403).json({ message: 'Account non verificato. Controlla la tua email per il codice OTP.' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('[login] Server configuration error: JWT_SECRET is missing from process.env.');
            return res.status(500).json({ message: 'Errore lato server: JWT_SECRET non configurato.' });
        }

        const token = jwt.sign(
            { userId: user._id.toString(), username: user.username },
            jwtSecret,
            { expiresIn: '7d' } // Token expires in 7 days
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('[login] Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
}
