import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = 'https://api.teachmetutor.academy';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUser = await AsyncStorage.getItem('authUser');

        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          setAuthToken(storedToken);
          setUser(userData);

          await AsyncStorage.setItem('user_id', userData.userId);
          console.log('Restored auth session for user:', userData.userId);
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

      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          pass: password,
          fullName
        })
      })

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      return await signIn(email, password);
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

      const response = await fetch(`${API_BASE_URL}/signin`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          pass: password
        })
      })

      const data = await response.json();

      if (!data.success || !data.token) {
        throw new Error(data.message || 'Invalid credentials');
      }

      const userData = {
        userId: data.userId,
        email: email.trim().toLowerCase(),
        fullName: data.fullName || email.split('@')[0]
      }

      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('authUser', JSON.stringify(userData));
      await AsyncStorage.setItem('user_id', data.userId);

      console.log('User signed in successfully:', userData.userId);
      setAuthToken(data.token);
      setUser(userData);

      return userData;
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

      console.log('User signed out');
    } catch (error) {
      console.error('Signout error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const resetPassword = async (email) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Password reset failed');
      }

      return true;
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
        signIn,
        signUp,
        signOut,
        resetPassword
      }}>
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