import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CriticPersona, PersonaId } from '../types';
import { API_BASE_URL } from '../config';
import { toast } from 'sonner';

export const PERSONAS: Record<PersonaId, CriticPersona> = {}; // Keep as a global cache if needed

interface PersonaContextType {
    personas: Record<PersonaId, CriticPersona>;
    isLoadingPersonas: boolean;
    error: string | null;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export const PersonaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [personas, setPersonas] = useState<Record<PersonaId, CriticPersona>>({});
    const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPersonas = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/personas/`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // Update state
                setPersonas(data);

                // Update global constant for legacy code compatibility
                Object.keys(PERSONAS).forEach(key => delete PERSONAS[key as PersonaId]);
                Object.assign(PERSONAS, data);

            } catch (err: any) {
                console.error("Failed to load personas:", err);
                setError("Impossibile caricare i critici. Riprova più tardi.");
                toast.error("Errore di caricamento Critici.");
            } finally {
                setIsLoadingPersonas(false);
            }
        };

        fetchPersonas();
    }, []);

    return (
        <PersonaContext.Provider value={{ personas, isLoadingPersonas, error }}>
            {children}
        </PersonaContext.Provider>
    );
};

export const usePersonas = () => {
    const context = useContext(PersonaContext);
    if (context === undefined) {
        throw new Error('usePersonas must be used within a PersonaProvider');
    }
    return context;
};
