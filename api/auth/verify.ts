import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
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
        const { username, otpCode } = req.body;

        if (!username || !otpCode) {
            return res.status(400).json({ message: 'Email e codice OTP sono richiesti' });
        }

        const dbClient = await clientPromise;
        const db = dbClient.db('saremo-critique');
        const collection = db.collection('users');

        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Utente già verificato. Effettua il Login.' });
        }

        // Verify OTP expiration
        if (!user.verificationCodeExpiresAt || new Date() > new Date(user.verificationCodeExpiresAt)) {
            return res.status(400).json({ message: 'Il codice di verifica è scaduto. Registrati di nuovo.' });
        }

        // Hash the incoming OTP and compare
        const hashedInputOtp = crypto.createHash('sha256').update(otpCode).digest('hex');
        if (hashedInputOtp !== user.verificationCode) {
            return res.status(400).json({ message: 'Codice errato.' });
        }

        // Verification successful, update DB and remove the code
        await collection.updateOne(
            { _id: user._id },
            {
                $set: { isVerified: true },
                $unset: { verificationCode: "", verificationCodeExpiresAt: "" }
            }
        );

        if (!jwtSecret) {
            return res.status(500).json({ message: 'Errore server: JWT_SECRET non configurato' });
        }

        // Instantly log the user in after verification
        const token = jwt.sign(
            { userId: user._id.toString(), username: user.username },
            jwtSecret,
            { expiresIn: '7d' }
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
        console.error('[verify] Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
}
