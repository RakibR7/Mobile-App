import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, NetInfo } from 'react-native';

const API_BASE_URL = 'https://api.teachmetutor.academy';

const AuthContext = createContext();

const FALLBACK_CREDENTIALS = {
  email: 'demo@example.com',
  password: 'password123',
  fullName: 'Demo User',
  userId: 'user_nkjmsr7z_m9rm99ta'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const checkNetwork = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ping`, {
        method: 'GET',
        timeout: 3000
      });
      return response.ok;
    } catch (error) {
      console.log('Network check failed:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUser = await AsyncStorage.getItem('authUser');

        if (storedToken && storedUser) {
          setAuthToken(storedToken);
          setUser(JSON.parse(storedUser));
          await AsyncStorage.setItem('user_id', JSON.parse(storedUser).userId);
        }
        const networkAvailable = await checkNetwork();
        setIsOffline(!networkAvailable);
        if (!networkAvailable) {
          console.log('Running in offline mode');
        }
      } catch (error) {
        console.error('Error loading authentication data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUserData();
  }, [])


  const signUp = async (email, password, fullName) => {
    try {
      setLoading(true);
      const networkAvailable = await checkNetwork();
      if (!networkAvailable) {
        setIsOffline(true);
        throw new Error('Network unavailable. Please try again when online.');
      }

      try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            pass: password,
            fullName
          }),
          timeout: 10000
        })

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Registration failed');
        }
        return await signIn(email, password);
      } catch (fetchError) {
        console.error('Fetch error during signup:', fetchError);
        throw new Error('Network request failed. Please try again later.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      if (email.trim().toLowerCase() === FALLBACK_CREDENTIALS.email &&
          password === FALLBACK_CREDENTIALS.password) {
        const userData = {
          userId: FALLBACK_CREDENTIALS.userId,
          email: FALLBACK_CREDENTIALS.email,
          fullName: FALLBACK_CREDENTIALS.fullName
        }
        await AsyncStorage.setItem('authUser', JSON.stringify(userData));
        await AsyncStorage.setItem('user_id', userData.userId);
        await AsyncStorage.setItem('authToken', 'offline-token');
        setAuthToken('offline-token');
        setUser(userData);
        return userData;
      }
      const networkAvailable = await checkNetwork();
      if (!networkAvailable) {
        setIsOffline(true);
        const userData = {
          userId: 'user_nkjmsr7z_m9rm99ta',
          email: email.trim().toLowerCase(),
          fullName: email.split('@')[0]
        };

        await AsyncStorage.setItem('authUser', JSON.stringify(userData));
        await AsyncStorage.setItem('user_id', userData.userId);
        await AsyncStorage.setItem('authToken', 'offline-token');
        setAuthToken('offline-token');
        setUser(userData);
        return userData;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/signin`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            pass: password
          }),
          timeout: 10000
        });

        const data = await response.json();

        if (!data.success || !data.token) {
          throw new Error(data.message || 'Invalid credentials');
        }
        await AsyncStorage.setItem('authToken', data.token);

        const userData = {
          userId: data.userId,
          email: email.trim().toLowerCase(),
          fullName: data.fullName || email.split('@')[0]
        };

        await AsyncStorage.setItem('authUser', JSON.stringify(userData));
        await AsyncStorage.setItem('user_id', data.userId);
        setAuthToken(data.token);
        setUser(userData);

        return userData;
      } catch (fetchError) {
        console.error('Fetch error during login:', fetchError);

        if (__DEV__) {
          console.log('Using development fallback authentication');
          const userData = {
            userId: 'user_nkjmsr7z_m9rm99ta',
            email: email.trim().toLowerCase(),
            fullName: email.split('@')[0]
          };
          await AsyncStorage.setItem('authUser', JSON.stringify(userData));
          await AsyncStorage.setItem('user_id', userData.userId);
          await AsyncStorage.setItem('authToken', 'dev-fallback-token');
          setAuthToken('dev-fallback-token');
          setUser(userData);

          return userData;
        }

        throw new Error('Login failed. Please check your network connection and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('authUser');
      setAuthToken(null);
      setUser(null);
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      setLoading(false);
    }
  }


  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const networkAvailable = await checkNetwork();
      if (!networkAvailable) {
        setIsOffline(true);
        throw new Error('Network unavailable. Please try again when online.');
      }

      try {
        const response = await fetch(`${API_BASE_URL}/reset-password`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
          timeout: 10000
        })

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Password reset failed');
        }
        return true;
      } catch (fetchError) {
        console.error('Fetch error during password reset:', fetchError);
        throw new Error('Network request failed. Please try again later.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authToken,
        isOffline,
        signIn,
        signUp,
        signOut,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}