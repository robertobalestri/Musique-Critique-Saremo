import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { Resend } from 'resend';
import crypto from 'crypto';

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
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username e password sono richiesti' });
        }

        const dbClient = await clientPromise;
        const db = dbClient.db('saremo-critique');
        const collection = db.collection('users');

        // Check if user exists
        const existingUser = await collection.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username già in uso' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate 6 digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

        // Expiration exactly in 15 mins
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const result = await collection.insertOne({
            username,
            password: hashedPassword,
            isVerified: false,
            verificationCode: otpHash,
            verificationCodeExpiresAt: expiresAt,
            createdAt: new Date(),
        });

        // Send Email via Resend
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
                from: 'Saremo Critique <onboarding@resend.dev>',
                to: username, // As username is now an email
                subject: 'Codice di Verifica - Saremo',
                html: `
                    <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f0f11; color: #fff;">
                        <h2 style="color: #ec4899;">Benvenuto nel Circolo di Saremo</h2>
                        <p style="color: #e4e4e7; font-size: 16px;">Il tuo codice di verifica per l'accesso è:</p>
                        <h1 style="letter-spacing: 4px; color: #6366f1; font-size: 36px; padding: 20px; background: #18181b; border-radius: 12px; display: inline-block;">${otpCode}</h1>
                        <p style="color: #a1a1aa; font-size: 12px; margin-top: 20px;">Questo codice scadrà tra 15 minuti.</p>
                    </div>
                `
            });
        }

        res.status(201).json({
            success: true,
            userId: result.insertedId,
            message: 'Registrazione completata. Controlla la tua casella di posta (e lo SPAM) per il codice OTP.'
        });
    } catch (error) {
        console.error('[register] Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
}
