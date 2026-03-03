import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        const jsonResponse = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // We could authenticate here, for now we just allow audio uploads
                return {
                    allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/mp3', 'audio/x-m4a'],
                    tokenPayload: JSON.stringify({ pathname }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Upload completed', blob.url);
            },
        });

        return res.status(200).json(jsonResponse);
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(400).json({ error: (error as Error).message });
    }
}
