// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from './context/UserContext';

import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import AboutScreen from './screens/AboutScreen';
import SubjectTutorScreen from './screens/SubjectTutorScreen';
import ExerciseScreen from './screens/ExerciseScreen';
import TopicSelectionScreen from './screens/TopicSelectionScreen';
import DynamicExerciseScreen from './screens/DynamicExerciseScreen';
import FlashcardsScreen from './screens/FlashcardsScreen';
import ProgressScreen from './screens/ProgressScreen';
import FlashcardHistoryScreen from './screens/FlashcardHistoryScreen';
import QuizHistoryScreen from './screens/QuizHistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4CAF50',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Mentor AI' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              title: 'Chat with Tutor',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{ title: 'About' }}
          />
          <Stack.Screen
            name="SubjectTutor"
            component={SubjectTutorScreen}
            options={{ title: 'Choose a Tutor' }}
          />
          <Stack.Screen
            name="Exercise"
            component={ExerciseScreen}
            options={{ title: 'Practice Exercises' }}
          />
          <Stack.Screen
            name="TopicSelection"
            component={TopicSelectionScreen}
            options={{ title: 'Select a Topic' }}
          />
          <Stack.Screen
            name="DynamicExercise"
            component={DynamicExerciseScreen}
            options={{ title: 'Practice Exercise' }}
          />
          <Stack.Screen
            name="FlashcardsScreen"
            component={FlashcardsScreen}
            options={{ title: 'Flashcards' }}
          />
          <Stack.Screen
            name="Progress"
            component={ProgressScreen}
            options={{ title: 'Learning Progress' }}
          />
          <Stack.Screen
            name="FlashcardHistory"
            component={FlashcardHistoryScreen}
            options={{ title: 'Flashcard History' }}
          />
          <Stack.Screen
            name="QuizHistory"
            component={QuizHistoryScreen}
            options={{ title: 'Quiz History' }}
          />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </UserProvider>
  );
}