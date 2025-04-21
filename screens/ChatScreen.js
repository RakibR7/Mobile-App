// screens/ChatScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
// At the top of ChatScreen.js
import { saveMessage } from '../services/apiService';
import { syncMessages, startPolling } from '../services/syncService';

export default function ChatScreen({ route, navigation }) {
  const { conversationId, tutor, selectedModel } = route.params;

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState(false);

  const flatListRef = useRef(null);

  // Function to fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const fetchedMessages = await syncMessages(conversationId, tutor);

      // Check if there are new messages
      if (messages.length > 0 && fetchedMessages.length > messages.length) {
        setNewMessageAlert(true);
      }

      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  }, [conversationId, tutor, messages.length]);

  // Initial load
  useEffect(() => {
    fetchMessages();

    // Start polling for updates
    const stopPolling = startPolling(conversationId, tutor, (updatedMessages) => {
      // Only update if there are new messages
      if (updatedMessages.length > messages.length) {
        setMessages(updatedMessages);
        setNewMessageAlert(true);
      }
    }, 5000); // Poll every 5 seconds

    // Set navigation options
    navigation.setOptions({
      title: `${tutor.charAt(0).toUpperCase() + tutor.slice(1)} Tutor`,
      headerRight: () => (
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewConversation}
        >
          <Text style={styles.newChatButtonText}>New</Text>
        </TouchableOpacity>
      ),
    });

    // Clean up polling when component unmounts
    return () => stopPolling();
  }, [conversationId, tutor, navigation, fetchMessages, messages.length]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchMessages();
      setNewMessageAlert(false);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMessages]);

  const handleNewConversation = async () => {
    navigation.navigate('SubjectTutor');
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !conversationId) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setIsLoading(true);

    try {
      // Add user message to the UI immediately
      const updatedMessages = [...messages, { sender: 'user', text: userMessage }];
      setMessages(updatedMessages);

      // Save user message to API
      await saveMessage(conversationId, 'user', userMessage, selectedModel, tutor);

      // Get AI response
      const aiResponseData = await fetch('http://51.21.106.225:5000/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          model: selectedModel,
          tutor
        })
      });

      if (!aiResponseData.ok) {
        throw new Error('Failed to get AI response');
      }

      const aiData = await aiResponseData.json();
      const aiReply = aiData.response;

      // Save AI response to API
      await saveMessage(conversationId, 'ai', aiReply, selectedModel, tutor);

      // Update messages in the UI
      setMessages([...updatedMessages, { sender: 'ai', text: aiReply }]);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.aiMessage
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {newMessageAlert && (
        <TouchableOpacity
          style={styles.newMessageAlert}
          onPress={() => {
            setNewMessageAlert(false);
            flatListRef.current?.scrollToEnd();
          }}
        >
          <Text style={styles.newMessageAlertText}>New messages available</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => {
            if (messages.length > 0 && !newMessageAlert) {
              flatListRef.current?.scrollToEnd();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4CAF50']}
              tintColor="#4CAF50"
            />
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Ask your mentor..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (isLoading || !userInput.trim()) && styles.disabledButton
            ]}
            onPress={sendMessage}
            disabled={isLoading || !userInput.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  keyboardAvoid: {
    flex: 1,
  },
  newChatButton: {
    paddingHorizontal: 15,
  },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  messagesContainer: {
    padding: 10,
    paddingBottom: 20,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E0F7FA',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F8E9',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  newMessageAlert: {
    backgroundColor: '#4CAF50',
    padding: 10,
    alignItems: 'center',
  },
  newMessageAlertText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});