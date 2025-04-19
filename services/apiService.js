// services/apiService.js
// API base URL pointing to your EC2 server
const API_BASE_URL = 'http://51.21.106.225:5000';

// Fetch AI response
export const fetchAIResponse = async (userMessage, selectedModel, tutor) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        model: selectedModel,
        tutor: tutor
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    throw error;
  }
};

// Get all conversations for a tutor
export const getConversations = async (tutor) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations?tutor=${tutor}`);

    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
};

// Create a new conversation
export const createConversation = async (title, model, tutor) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || "",
        model,
        tutor
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

// Save a message
export const saveMessage = async (conversationId, sender, text, model, tutor) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        sender,
        text,
        model,
        tutor
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save message');
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving message:", error);
    throw error;
  }
};

// Delete a conversation
export const deleteConversation = async (id, tutor) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations/${id}?tutor=${tutor}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};