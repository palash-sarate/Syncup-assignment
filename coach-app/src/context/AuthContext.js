'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import keycloakConfig from '../../keycloak-config.json';

const AuthContext = createContext(null);

// Utility to parse JWT payloads natively in-browser
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load token on initial render
  useEffect(() => {
    const savedToken = localStorage.getItem('syncup_token');
    const savedRefreshToken = localStorage.getItem('syncup_refresh_token');

    if (savedToken) {
      const decoded = parseJwt(savedToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        const roles = decoded.realm_access?.roles || [];
        setToken(savedToken);
        setUser({
          username: decoded.preferred_username,
          name: decoded.name || decoded.preferred_username,
          email: decoded.email,
          roles: roles,
          isCoach: roles.includes('coach'),
          isClient: roles.includes('client'),
        });
        setAuthenticated(true);
      } else {
        // Expired
        localStorage.removeItem('syncup_token');
        localStorage.removeItem('syncup_refresh_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const tokenEndpoint = `${keycloakConfig.authServerUrl}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', keycloakConfig.clientId);
      params.append('grant_type', 'password');
      params.append('username', username);
      params.append('password', password);

      const res = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error_description || 'Invalid credentials or login failure.');
      }

      const data = await res.json();
      const decoded = parseJwt(data.access_token);
      
      if (!decoded) {
        throw new Error('Received invalid token from authentication provider.');
      }

      const roles = decoded.realm_access?.roles || [];

      // Store in memory
      setToken(data.access_token);
      setUser({
        username: decoded.preferred_username,
        name: decoded.name || decoded.preferred_username,
        email: decoded.email,
        roles: roles,
        isCoach: roles.includes('coach'),
        isClient: roles.includes('client'),
      });
      setAuthenticated(true);

      // Store in localStorage for session state persistence
      localStorage.setItem('syncup_token', data.access_token);
      localStorage.setItem('syncup_refresh_token', data.refresh_token);

      setLoading(false);
      return { success: true, user: decoded };
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('syncup_token');
    localStorage.removeItem('syncup_refresh_token');
    setToken(null);
    setUser(null);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ token, user, authenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed within an AuthProvider');
  }
  return context;
};
