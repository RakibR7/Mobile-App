// context/UserContext.js - Corrected version without event listener
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create context
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user ID
    const loadUserId = async () => {
      try {
        // Try to load existing user ID
        let storedId = await AsyncStorage.getItem('user_id');

        if (storedId) {
          console.log('UserContext: Using stored user ID:', storedId);
          setUserId(storedId);
        } else {
          // If no user ID is found, we'll wait for AuthContext to set one
          console.log('UserContext: No user ID found in storage');
        }
      } catch (error) {
        console.error('Error managing user ID:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserId();

    // Instead of using AsyncStorage event listener (which doesn't exist),
    // we'll use a polling approach to check for user_id changes
    const checkInterval = setInterval(async () => {
      try {
        const currentId = await AsyncStorage.getItem('user_id');
        if (currentId && currentId !== userId) {
          console.log('UserContext: user_id changed to', currentId);
          setUserId(currentId);
        }
      } catch (error) {
        console.error('Error checking user ID:', error);
      }
    }, 2000); // Check every 2 seconds

    // Clean up interval on unmount
    return () => {
      clearInterval(checkInterval);
    };
  }, [userId]);

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