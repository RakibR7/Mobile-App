// services/apiService.js
// API base URL pointing to your EC2 server
const API_BASE_URL = 'http://51.21.106.225:5000';

// Helper function to handle fetch with timeout
const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Fetch AI response with better error handling
export const fetchAIResponse = async (userMessage, selectedModel, tutor) => {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/openai`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          model: selectedModel,
          tutor: tutor
        }),
      },
      15000 // 15 second timeout for AI responses
    );

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
};

// Get all conversations for a tutor
export const getConversations = async (tutor) => {
  console.log('Fetching conversations for tutor:', tutor);
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/conversations?tutor=${tutor}`,
      {},
      5000
    );

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching conversations:", error);
    // Return empty array instead of throwing to prevent crashes
    return [];
  }
};

// Create a new conversation with retry logic
export const createConversation = async (title, model, tutor, retries = 2) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/conversations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || "",
            model,
            tutor
          })
        },
        5000
      );

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
};

// Save a message with retry logic
export const saveMessage = async (conversationId, sender, text, model, tutor, retries = 1) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            sender,
            text,
            model,
            tutor
          })
        },
        5000
      );

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Save message attempt ${attempt + 1} failed:`, error);
      lastError = error;

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Even if all retries fail, we don't throw to keep the app running
  console.error("Failed to save message after retries");
  return null;
};

// Delete a conversation
export const deleteConversation = async (id, tutor) => {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/conversations/${id}?tutor=${tutor}`,
      { method: 'DELETE' },
      5000
    );

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting conversation:", error);
    // Return dummy success response to prevent crashes
    return { message: "Operation may have failed" };
  }
};

// Get user performance data with error fallback
export const getPerformanceData = async (userId, tutor, topic, activityType) => {
  try {
    let url = `${API_BASE_URL}/api/performance?userId=${userId}`;
    if (tutor) url += `&tutor=${tutor}`;
    if (topic) url += `&topic=${encodeURIComponent(topic)}`;
    if (activityType) url += `&activityType=${activityType}`;

    console.log('Fetching performance data from:', url);

    const response = await fetchWithTimeout(url, {}, 5000);

    if (!response.ok) {
      console.error(`Performance data request failed with status ${response.status}`);
      return [];
    }

    const result = await response.json();
    console.log(`Found ${result.length} ${activityType || ''} history records`);
    return result;
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return [];
  }
};

// Get subtopic progress data
export const getSubtopicProgress = async (userId, tutor) => {
  try {
    const url = `${API_BASE_URL}/api/progress/subtopics?userId=${userId}&tutor=${tutor}`;
    console.log('Fetching subtopic progress from:', url);

    const response = await fetchWithTimeout(url, {}, 5000);

    if (!response.ok) {
      console.error(`Subtopic progress request failed with status ${response.status}`);
      return { overall: 0, subtopics: [] };
    }

    const data = await response.json();
    console.log('Received progress data:', data);
    return data;
  } catch (error) {
    console.error("Error fetching subtopic progress:", error);
    return { overall: 0, subtopics: [] };
  }
};

// Update performance data with queue mechanism for offline support
let performanceUpdateQueue = [];
let isProcessingQueue = false;

export const updatePerformanceData = async (performanceData) => {
  // Add current update to queue
  performanceUpdateQueue.push(performanceData);

  // If already processing, just return
  if (isProcessingQueue) return null;

  // Process queue
  isProcessingQueue = true;

  while (performanceUpdateQueue.length > 0) {
    const currentData = performanceUpdateQueue[0];
    try {
      console.log(`Saving ${currentData.activityType} performance:`, {
        activityType: currentData.activityType,
        cardsData: currentData.cardsData?.length || 0,
        sessionData: currentData.sessionData,
        subtopic: currentData.subtopic,
        topic: currentData.topic,
        tutor: currentData.tutor,
        userId: currentData.userId
      });

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/performance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentData)
        },
        8000
      );

      if (!response.ok) {
        console.error(`Failed to update performance data: ${response.status}`);
        // We'll consider this a permanent failure and remove from queue
      }

      console.log(`${currentData.activityType} session saved successfully`);

      // Remove processed item
      performanceUpdateQueue.shift();
    } catch (error) {
      console.error("Error updating performance data:", error);

      // For network errors, we'll keep in queue for retry later
      if (error.name !== 'TypeError') {
        // For other errors, remove from queue to prevent infinite retries
        performanceUpdateQueue.shift();
      } else {
        // For network errors, stop processing for now
        break;
      }
    }
  }

  isProcessingQueue = false;
  return null;
};

// Function to retry sending any queued performance data
export const retryPerformanceUpdates = () => {
  if (!isProcessingQueue && performanceUpdateQueue.length > 0) {
    updatePerformanceData(performanceUpdateQueue[0]);
  }
};