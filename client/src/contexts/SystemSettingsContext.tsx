import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface SystemSettings {
  id: string;
  platformName: string;
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postalAddress: string | null;
  websiteUrl: string | null;
  description: string | null;
  updatedAt?: string;
  createdAt?: string;
}

interface SystemSettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  formatAssetUrl: (url: string | null | undefined) => string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  id: 'default',
  platformName: 'École 3.0',
  logoUrl: null,
  signatureUrl: null,
  stampUrl: null,
  email: 'contact@seeec-ecole30.ci',
  phone: '+225 07 00 00 00 00',
  address: 'Plateau, Abidjan, Côte d\'Ivoire',
  postalAddress: '01 BP 1234 Abidjan 01',
  websiteUrl: 'https://ecole3-seeec.ci',
  description: 'Plateforme Numérique Intelligente de Gestion Scolaire et d\'Éducation Connectée.',
};

const SystemSettingsContext = createContext<SystemSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refreshSettings: async () => {},
  formatAssetUrl: (url) => url || '/logo.png',
});

export const formatAssetUrl = (url: string | null | undefined): string => {
  if (!url) return '/logo.png';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/uploads')) {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${apiBase}${url}`;
  }
  return url;
};

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/system-settings');
      if (res.data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...res.data,
          platformName: res.data.platformName || DEFAULT_SETTINGS.platformName,
        });
      }
    } catch (error) {
      console.warn('Could not load system settings, using defaults', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        formatAssetUrl,
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => useContext(SystemSettingsContext);

export default SystemSettingsContext;
