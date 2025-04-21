// Update UserContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// Create context
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load or create user ID
    const loadUserId = async () => {
      try {
        // Try to load existing user ID
        let storedId = await AsyncStorage.getItem('user_id');

        if (!storedId) {
          // Generate new ID if none exists
          storedId = uuidv4();
          await AsyncStorage.setItem('user_id', storedId);
          console.log('Created new user ID:', storedId);
        } else {
          console.log('Loaded existing user ID:', storedId);
        }

        setUserId(storedId);
      } catch (error) {
        console.error('Error managing user ID:', error);
        // Fallback to in-memory ID if storage fails
        setUserId(uuidv4());
      } finally {
        setLoading(false);
      }
    };

    loadUserId();
  }, []);

  // Return provider with value
  return (
    <UserContext.Provider value={{ userId, loading }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook to use the context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};