import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { X, Loader2, Mail, Lock, LogIn, UserPlus, KeyRound, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
    const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState(''); // Keeping setError for form validation messages
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (authMode !== 'verify' && (!email.trim() || !password.trim())) {
            setError('Inserisci email e password');
            return;
        }

        if (authMode === 'verify' && otpCode.length !== 6) {
            setError('Inserisci il codice a 6 cifre valido');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Setup endpoint and payload dynamically based on mode
            let endpoint = '';
            let payload = {};

            if (authMode === 'login') {
                endpoint = `${API_BASE_URL}/auth/login`;
                payload = { username: email, password };
            } else if (authMode === 'register') {
                endpoint = `${API_BASE_URL}/auth/register`;
                payload = { username: email, password };
            } else if (authMode === 'verify') {
                endpoint = `${API_BASE_URL}/auth/verify`;
                payload = { username: email, otpCode };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                // If login fails because of unverified account, switch to verify mode
                if (authMode === 'login' && res.status === 403 && data.message.includes('non verificato')) {
                    setAuthMode('verify');
                    toast.error('Account non verificato. Se non hai il codice, registrati nuovamente.');
                    return;
                }
                throw new Error(data.message || 'Errore durante l\'autenticazione');
            }

            if (authMode === 'register') {
                // Registration successful, move to Verify OTP step
                setAuthMode('verify');
                setError('');
                setPassword(''); // clear password from memory for security
                toast.success('Registrazione completata! Controlla la tua email (anche nello SPAM) per il codice a 6 cifre.');
            } else if (authMode === 'verify') {
                // Verification successful
                login(data.token, data.user);
                toast.success("Verifica completata e accesso effettuato!");
                onClose();
            } else if (authMode === 'login') {
                // Login successful
                login(data.token, data.user);
                toast.success("Login effettuato con successo!");
                onClose();
            }
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-dark-surface border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors animate-in fade-in"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">
                    {authMode === 'login' ? 'Accedi al Circolo' :
                        authMode === 'register' ? 'Unisciti al Circolo' :
                            'Verifica Email'}
                </h2>
                <p className="text-gray-400 text-sm">
                    {authMode === 'login' ? 'Ritrova le tue analisi.' :
                        authMode === 'register' ? 'Crea un account per generare analisi illimitate e salvare lo storico.' :
                            "Abbiamo inviato un codice OTP a 6 cifre all'indirizzo email inserito. Controlla anche la cartella Spam."}
                </p>

                {error && (
                    <div className="bg-red-900/40 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {authMode !== 'verify' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                                    placeholder="iltuonome@email.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-300 text-center mb-4">
                                Abbiamo inviato un codice a 6 cifre a <br />
                                <strong className="text-white">{email}</strong>
                            </p>
                            <p className="text-xs text-orange-400 text-center mb-4">
                                Non lo trovi? Controlla anche la cartella <strong>Posta Indesiderata/Spam</strong>.
                            </p>
                            <label className="block text-sm font-medium text-gray-400 mb-1 text-center">Codice OTP</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-white text-center text-2xl tracking-widest focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                                placeholder="123456"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isLoading && <Loader2 size={18} className="animate-spin" />}
                        {authMode === 'login' && 'Accedi'}
                        {authMode === 'register' && 'Registrati e Ricevi Codice'}
                        {authMode === 'verify' && 'Verifica & Entra'}
                    </button>
                </form>

                {authMode !== 'verify' && (
                    <div className="mt-6 text-center text-sm text-gray-500">
                        {authMode === 'login' ? "Non hai un account? " : "Hai già un account? "}
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode(authMode === 'login' ? 'register' : 'login');
                                setError('');
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-medium underline-offset-4 hover:underline"
                        >
                            {authMode === 'login' ? 'Registrati ora' : 'Accedi'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
