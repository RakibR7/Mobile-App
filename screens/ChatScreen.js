import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';

export default function ChatScreen({ route, navigation }) {
  const { conversationId, tutor, selectedModel } = route.params;
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [showSidebar, setShowSidebar] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`https://api.teachmetutor.academy/api/conversations?tutor=${tutor}`);
      const data = await response.json();
      setConversations(data);

      if (data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0]._id);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, [tutor, activeConversationId]);

  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) return;

    try {
      const foundConvo = conversations.find(c => c._id === activeConversationId);
      if (foundConvo) {
        setMessages(foundConvo.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages, activeConversationId]);

  const handleSend = async () => {
    if (!userInput.trim() || !activeConversationId) return;

    const userMessage = {
      sender: "user",
      text: userInput,
      model: selectedModel,
      tutor: tutor,
      conversationId: activeConversationId
    }

    setIsLoading(true);
    setMessages(prev => [...prev, userMessage]);

    try {
      await fetch("https://api.teachmetutor.academy/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userMessage)
      })

      const aiResponseData = await fetch("https://api.teachmetutor.academy/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userInput,
          model: selectedModel,
          tutor
        })
      })

      const aiData = await aiResponseData.json();
      const aiMessage = {
        sender: "ai",
        text: aiData.response,
        model: selectedModel,
        tutor: tutor,
        conversationId: activeConversationId
      }

      await fetch("https://api.teachmetutor.academy/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiMessage)
      })
      setMessages(prev => [...prev, aiMessage]);
      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  }

  const handleNewConversation = async () => {
    try {
      const response = await fetch("https://api.teachmetutor.academy/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Conversation",
          model: selectedModel,
          tutor
        })
      })

      const newConversation = await response.json();
      setConversations([newConversation, ...conversations]);
      setActiveConversationId(newConversation._id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  }

  const handleDeleteConversation = async (id) => {
    try {
      await fetch(`https://api.teachmetutor.academy/api/conversations/${id}?tutor=${tutor}`, {
        method: "DELETE"
      });

      const updatedConversations = conversations.filter(conv => conv._id !== id);
      setConversations(updatedConversations);

      if (activeConversationId === id) {
        if (updatedConversations.length > 0) {
          setActiveConversationId(updatedConversations[0]._id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  }

  const switchConversation = (id) => {
    setActiveConversationId(id);
    setShowSidebar(false);
  }

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  }

  const renderMessage = ({ item }) => (
    <View style={[styles.messageContainer,
          item.sender === "user" ? styles.userMessage : styles.aiMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  )

  const renderConversationItem = ({ item }) => (
    <View style={[
      styles.conversationItem,
      item._id === activeConversationId ? styles.activeConversation : null
    ]}>
      <TouchableOpacity
        style={styles.convoTitleContainer}
        onPress={() => switchConversation(item._id)}>
        <Text style={styles.convoTitle}>
          {item.title || "Untitled Conversation"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteConversation(item._id)}>
        <Text style={styles.deleteButtonText}>X</Text>
      </TouchableOpacity>
    </View>
  )

  const getActiveTitle = () => {
    const activeConvo = conversations.find(c => c._id === activeConversationId);
    return activeConvo ? (activeConvo.title || "Untitled Conversation") : "No Conversation";
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {}
        {showSidebar && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <TouchableOpacity
                style={styles.newConvoButton}
                onPress={handleNewConversation}>
                <Text style={styles.buttonText}>+ New</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeSidebarButton}
                onPress={toggleSidebar}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={conversations}
              renderItem={renderConversationItem}
              keyExtractor={item => item._id}
              style={styles.convoList}
            />
          </View>
        )}

        <View style={styles.chatContainer}>
          {}
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>{getActiveTitle()}</Text>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={toggleSidebar}>
              <Text style={styles.buttonText}>
                {showSidebar ? "Hide History" : "Show History"}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => index.toString()}
            style={styles.messagesList}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={userInput}
              onChangeText={setUserInput}
              placeholder="Type your message..."
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              disabled={isLoading || !userInput.trim()}>
              <Text style={styles.buttonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  newConvoButton: {
    backgroundColor: '#FE7648',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  closeSidebarButton: {
    backgroundColor: '#757575',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  convoList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  activeConversation: {
    backgroundColor: '#e0f7fa',
  },
  convoTitleContainer: {
    flex: 1,
  },
  convoTitle: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 2,
    borderRadius: 3,
  },
  deleteButtonText: {
    color: 'red',
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  messagesList: {
    flex: 1,
    padding: 10,
  },
  messageContainer: {
    padding: 10,
    marginVertical: 5,
    maxWidth: '80%',
    borderRadius: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e0f7fa',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f8e9',
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#FE7648',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginLeft: 10,
    borderRadius: 5,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
})