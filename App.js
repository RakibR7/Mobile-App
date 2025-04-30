import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View, Text } from 'react-native'
import { UserProvider } from './context/UserContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthNavigator from './navigation/AuthNavigator'

// Screens
import HomeScreen from './screens/HomeScreen'
import ChatScreen from './screens/ChatScreen'
import AboutScreen from './screens/AboutScreen'
import SubjectTutorScreen from './screens/SubjectTutorScreen'
import ExerciseScreen from './screens/ExerciseScreen'
import TopicSelectionScreen from './screens/TopicSelectionScreen'
import DynamicExerciseScreen from './screens/DynamicExerciseScreen'
import FlashcardsScreen from './screens/FlashcardsScreen'
import SubtopicProgressScreen from './screens/SubtopicProgressScreen'
import QuizHistoryScreen from './screens/QuizHistoryScreen'
import FlashcardHistoryScreen from './screens/FlashcardHistoryScreen'
import ProfileScreen from './screens/ProfileScreen'

const Stack = createNativeStackNavigator()

const AppNavigator = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#FE7648" />
        <Text style={{ marginTop: 20, fontSize: 16, color: '#666' }}>Loading profile...</Text>
      </View>
    )
  }

  let navigationContent
  if (user) {
    navigationContent = (
      <Stack.Navigator initialRouteName="Home" screenOptions={{
        headerStyle: { backgroundColor: '#FE7648' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Mentor AI' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat with Tutor', headerBackTitle: 'Back' }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
        <Stack.Screen name="SubjectTutor" component={SubjectTutorScreen} options={{ title: 'Choose a Tutor' }} />
        <Stack.Screen name="Exercise" component={ExerciseScreen} options={{ title: 'Practice Exercises' }} />
        <Stack.Screen name="TopicSelection" component={TopicSelectionScreen} options={{ title: 'Select a Topic' }} />
        <Stack.Screen name="DynamicExercise" component={DynamicExerciseScreen} options={{ title: 'Practice Exercise' }} />
        <Stack.Screen name="FlashcardsScreen" component={FlashcardsScreen} options={{ title: 'Flashcards' }} />
        <Stack.Screen name="SubtopicProgress" component={SubtopicProgressScreen} options={{ title: 'Learning Progress' }} />
        <Stack.Screen name="QuizHistory" component={QuizHistoryScreen} options={{ title: 'Quiz History' }} />
        <Stack.Screen name="FlashcardHistory" component={FlashcardHistoryScreen} options={{ title: 'Flashcard History' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      </Stack.Navigator>
    )
  } else {
    navigationContent = <AuthNavigator />
  }

  return (
    <NavigationContainer>{navigationContent}</NavigationContainer>
  )
}

export default function App() {
  return (
    <UserProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </UserProvider>
  )
}