import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';


const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserId = async () => {
      try {
        let storedId = await AsyncStorage.getItem('user_id');

        if (storedId) {
          console.log('UserContext: Using stored user ID:', storedId);
          setUserId(storedId);
        } else {
          console.log('UserContext: No user ID found in storage');
        }
      } catch (error) {
        console.error('Error managing user ID:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserId();

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
    }, 2000);
    return () => {
      clearInterval(checkInterval);
    };
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}