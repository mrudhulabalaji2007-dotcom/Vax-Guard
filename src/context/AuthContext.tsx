import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/index.js';
import { api } from '../services/api.js';

export type DiagramRole =
  | 'admin'
  | 'hospital_staff'
  | 'driver'
  | 'health_department'
  | 'public_viewer'
  | 'warehouse_manager'
  | 'logistics_manager'
  | 'hospital_receiver';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginAsDemoRole: (role: DiagramRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isHospitalStaff: boolean;
  isTransportPersonnel: boolean;
  isHealthDepartment: boolean;
  isPublicViewer: boolean;
  isWarehouseManager: boolean;
  isLogisticsManager: boolean;
  isHospitalReceiver: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vaxguard_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('vaxguard_token');
      const storedUser = localStorage.getItem('vaxguard_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch {
          localStorage.removeItem('vaxguard_token');
          localStorage.removeItem('vaxguard_user');
        }
      } else {
        // Auto initialize as default Admin for seamless first load
        try {
          const res = await api.login('admin@vaxguard.org', 'Admin@123');
          setToken(res.token);
          setUser(res.user);
          localStorage.setItem('vaxguard_token', res.token);
          localStorage.setItem('vaxguard_user', JSON.stringify(res.user));
        } catch (e) {
          console.warn('Initial auto-login fallback error:', e);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, pass);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('vaxguard_token', res.token);
      localStorage.setItem('vaxguard_user', JSON.stringify(res.user));
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoRole = async (role: DiagramRole) => {
    setLoading(true);
    try {
      if (role === 'public_viewer') {
        const guestUser: UserProfile = {
          id: 'guest-public',
          name: 'Citizen Public Viewer',
          email: 'citizen@public.vaxguard.org',
          role: 'public_viewer',
          department: 'Public Community Access Portal',
        };
        setUser(guestUser);
        localStorage.setItem('vaxguard_user', JSON.stringify(guestUser));
        return;
      }

      if (role === 'health_department') {
        const healthUser: UserProfile = {
          id: 'user-health-dept',
          name: 'Dr. S. K. Ramanathan',
          email: 'director@health.tn.gov.in',
          role: 'health_department',
          department: 'State Directorate of Public Health & Preventive Medicine',
        };
        setUser(healthUser);
        localStorage.setItem('vaxguard_user', JSON.stringify(healthUser));
        return;
      }

      if (role === 'driver') {
        const driverUser: UserProfile = {
          id: 'user-driver-rajan',
          name: 'K. Rajan',
          email: 'driver.rajan@vaxguard.org',
          role: 'driver',
          department: 'Vaccine Reefer Van Delivery Fleet (TN-01-CV-9821)',
        };
        setUser(driverUser);
        localStorage.setItem('vaxguard_user', JSON.stringify(driverUser));
        return;
      }

      let email = 'admin@vaxguard.org';
      if (role === 'warehouse_manager') email = 'warehouse@vaxguard.org';
      if (role === 'logistics_manager') email = 'logistics@vaxguard.org';
      if (role === 'hospital_receiver' || role === 'hospital_staff') email = 'hospital@vaxguard.org';

      const res = await api.login(email, 'Admin@123');
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('vaxguard_token', res.token);
      localStorage.setItem('vaxguard_user', JSON.stringify(res.user));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('vaxguard_token');
    localStorage.removeItem('vaxguard_user');
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    loginAsDemoRole,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isHospitalStaff: user?.role === 'hospital_staff' || user?.role === 'hospital_receiver' || user?.role === 'admin',
    isTransportPersonnel: user?.role === 'driver' || user?.role === 'logistics_manager' || user?.role === 'admin',
    isHealthDepartment: user?.role === 'health_department' || user?.role === 'admin',
    isPublicViewer: user?.role === 'public_viewer',
    isWarehouseManager: user?.role === 'warehouse_manager' || user?.role === 'admin',
    isLogisticsManager: user?.role === 'logistics_manager' || user?.role === 'admin',
    isHospitalReceiver: user?.role === 'hospital_receiver' || user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
