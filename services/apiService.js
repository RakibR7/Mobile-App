const API_BASE_URL = process.env.REACT_APP_API_URL || "https://api.teachmetutor.academy";

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
}

export const fetchAIResponse = async (message, model, tutor) => {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/openai`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model, tutor })
      },
      15000
    )

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    if (error.name === 'AbortError') {
      return "Request timed out. Please try again with a simpler query.";
    }
    return "Sorry, I couldn't get a response at the moment. Please try again later.";
  }
}

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
    return [];
  }
}

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
      )

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

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

  console.error("Failed to save message after retries");
  return null;
}

export const deleteConversation = async (id, tutor) => {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/conversations/${id}?tutor=${tutor}`,
      { method: 'DELETE' },
      5000
    )

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return { message: "Operation may have failed" };
  }
}

export const getPerformanceData = async (userId, tutor, topic, activityType) => {
  try {
    let url = `${API_BASE_URL}/api/performance?userId=${userId}`;
    if (tutor) url += `&tutor=${tutor}`;
    if (topic) url += `&topic=${encodeURIComponent(topic)}`;
    if (activityType) url += `&activityType=${activityType}`;

    console.log('Fetching performance data from:', url);

    const response = await fetchWithTimeout(url, {}, 8000);

    if (!response.ok) {
      console.error(`Performance data request failed with status ${response.status}`);
      return [];
    }

    const result = await response.json();
    console.log(`Found ${result.length} ${activityType || ''} history records`);

    if (result.length === 0 && topic) {
      console.log('No records found with specific topic, trying broader search...');
      return await getPerformanceData(userId, tutor, null, activityType);
    }

    if (Array.isArray(result) && result.length > 0) {
      const sessionsCount = result.reduce((sum, item) =>
        sum + (item.sessions?.length || 0), 0);

      const cardsCount = result.reduce((sum, item) =>
        sum + (item.cards?.length || 0), 0);
      console.log(`Results contain ${sessionsCount} sessions and ${cardsCount} cards`);
    }

    return result;
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return [];
  }
}

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
}

let performanceUpdateQueue = [];
let isProcessingQueue = false;

export const updatePerformanceData = async (performanceData) => {
  if (!performanceData.userId) {
    console.error('updatePerformanceData called without userId in data');
    return null;
  }

  performanceUpdateQueue.push(performanceData);

  if (isProcessingQueue) return null;

  isProcessingQueue = true;

  while (performanceUpdateQueue.length > 0) {
    const currentData = performanceUpdateQueue[0];
    try {
      if (currentData.sessionData) {
        currentData.sessionData.cardsStudied = Number(currentData.sessionData.cardsStudied || 0);
        currentData.sessionData.correctAnswers = Number(currentData.sessionData.correctAnswers || 0);
        currentData.sessionData.timeSpent = Number(currentData.sessionData.timeSpent || 0);
      }

      if (currentData.sessions && Array.isArray(currentData.sessions)) {
        currentData.sessions.forEach(session => {
          session.cardsStudied = Number(session.cardsStudied || 0);
          session.correctAnswers = Number(session.correctAnswers || 0);
          session.timeSpent = Number(session.timeSpent || 0);
        })
      }

      console.log(`Saving ${currentData.activityType} performance for user ${currentData.userId}:`, {
        activityType: currentData.activityType,
        cards: currentData.cards?.length || 0,
        sessionData: currentData.sessionData,
        sessions: !!currentData.sessions,
        subtopic: currentData.subtopic,
        topic: currentData.topic,
        tutor: currentData.tutor,
      })

      try {
        const response = await fetchWithTimeout(
          `${API_BASE_URL}/api/performance`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData)
          },
          8000
        )

        if (!response.ok) {
          console.error(`Failed to update performance data: ${response.status}`);
        } else {
          const responseData = await response.json();
          console.log(`${currentData.activityType} session saved successfully`, responseData);
        }
      } catch (fetchError) {
        console.error("Fetch error during performance update:", fetchError);
        if (fetchError.name === 'TypeError' || fetchError.name === 'AbortError') {
          isProcessingQueue = false;
          return null;
        }
      }

      performanceUpdateQueue.shift();
    } catch (error) {
      console.error("Error updating performance data:", error);
      if (error.name !== 'TypeError') {
        performanceUpdateQueue.shift();
      } else {
        break;
      }
    }
  }

  isProcessingQueue = false;
  return null;
}

export const retryPerformanceUpdates = () => {
  if (!isProcessingQueue && performanceUpdateQueue.length > 0) {
    updatePerformanceData(performanceUpdateQueue[0]);
  }
}