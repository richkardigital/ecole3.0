/**
 * Contexte d'Authentification.
 * Gère l'état global de l'utilisateur connecté, le stockage du token JWT
 * et les fonctions de connexion/déconnexion.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Structure d'un utilisateur
interface User {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'DIRECTEUR' | 'EDUCATEUR' | 'ENSEIGNANT' | 'APPRENANT';
  firstName: string;
  lastName: string;
  schoolId?: string;
  matricule?: string;
  phone?: string;
  parentPhone?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  gender?: string;
  avatarUrl?: string;
}

// Définition du type de contexte
interface AuthContextType {
  user: User | null;      // Utilisateur actuellement connecté
  setUser: (user: User | null) => void;
  token: string | null;   // Token JWT pour les appels API
  login: (token: string, user: User) => void; // Fonction de connexion
  logout: () => void;     // Fonction de déconnexion
  isLoading: boolean;     // État de chargement initial
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Fournisseur du contexte Auth.
 * Enveloppe l'application pour rendre l'état auth accessible partout.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au chargement, on vérifie si un utilisateur est déjà stocké dans le navigateur
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Configure le header Authorization par défaut pour Axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    
    setIsLoading(false);
  }, []);

  /**
   * Connecte l'utilisateur en stockant ses infos localement.
   */
  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    // Ajoute le token aux headers Axios pour les prochaines requêtes
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  /**
   * Déconnecte l'utilisateur et nettoie le stockage local.
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook personnalisé pour utiliser le contexte d'authentification plus facilement.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
