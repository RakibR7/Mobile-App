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

// Get user performance data
export const getPerformanceData = async (userId, tutor, topic, activityType) => {
  try {
    let url = `${API_BASE_URL}/api/performance?userId=${userId}`;
    if (tutor) url += `&tutor=${tutor}`;
    if (topic) url += `&topic=${topic}`;
    if (activityType) url += `&activityType=${activityType}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch performance data');
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching performance data:", error);
    throw error;
  }
};

// Update performance data
export const updatePerformanceData = async (performanceData) => {
  try {
    console.log('Sending performance data to API:', JSON.stringify(performanceData));

    const response = await fetch(`${API_BASE_URL}/api/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(performanceData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server error (${response.status}):`, errorText);
      throw new Error(`Failed to update performance: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Performance data saved successfully:', data._id);
    return data;
  } catch (error) {
    console.error("Error updating performance data:", error);
    throw error;
  }
};

export const getSubtopicProgress = async (userId, tutor) => {
  try {
    console.log(`Fetching subtopic progress for user ${userId}, tutor ${tutor}`);

    const response = await fetch(`${API_BASE_URL}/api/progress/subtopics?userId=${userId}&tutor=${tutor}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server error (${response.status}):`, errorText);
      throw new Error(`Failed to fetch progress: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Received subtopic progress data:', data);
    return data;
  } catch (error) {
    console.error("Error fetching subtopic progress:", error);
    throw error;
  }
};