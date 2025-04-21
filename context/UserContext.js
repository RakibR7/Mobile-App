// context/UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as uuid from 'uuid';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserId = async () => {
      try {
        // Try to load existing user ID
        let storedUserId = await AsyncStorage.getItem('userId');

        // If no user ID exists, create a new one
        if (!storedUserId) {
          storedUserId = uuid.v4();
          await AsyncStorage.setItem('userId', storedUserId);
        }

        setUserId(storedUserId);
      } catch (error) {
        console.error('Error loading user ID:', error);
        // Fallback to generate a new ID if there's an error
        const newUserId = uuid.v4();
        setUserId(newUserId);
        try {
          await AsyncStorage.setItem('userId', newUserId);
        } catch (storageError) {
          console.error('Error storing user ID:', storageError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserId();
  }, []);

  return (
    <UserContext.Provider value={{ userId, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};