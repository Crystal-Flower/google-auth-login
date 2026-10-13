import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

app.use(cors());
app.use(express.json());

console.log(`[Google Auth Server] Initializing secure production environment...`);

// 1. GET GOOGLE CLIENT ID CONFIGURATION
app.get('/api/auth/config', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.json({ 
            success: false, 
            error: 'GOOGLE_CLIENT_ID is missing in your .env file.' 
        });
    }
    return res.json({ 
        success: true, 
        clientId: GOOGLE_CLIENT_ID 
    });
});

// 2. SECURE TOKEN VERIFICATION ROUTE (Real Google tokens only)
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing authentication token.' 
        });
    }

    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({
            success: false,
            error: 'Server is missing GOOGLE_CLIENT_ID configuration in .env.'
        });
    }

    try {
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        
        console.log(`[Auth API] Securing token signature against Google certificates...`);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        console.log(`[Auth API] Authentication successful for: ${payload.email}`);
        
        return res.json({
            success: true,
            user: {
                name: payload.name || payload.given_name || 'Google User',
                email: payload.email,
                picture: payload.picture,
                avatarLetter: (payload.name || 'G').charAt(0).toUpperCase()
            }
        });
    } catch (error) {
        console.error(`[Auth API] Authentication failed:`, error.message);
        return res.status(401).json({
            success: false,
            error: 'Invalid Google signature or expired credentials.',
            details: error.message
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', secure_mode: true, config_loaded: !!GOOGLE_CLIENT_ID });
});

app.listen(PORT, () => {
    console.log(`[Google Auth Server] Secure server running on http://localhost:${PORT}`);
});
