// syncService.js - Fix imports
import { getConversations } from '../services/apiService';

export const syncConversations = async (tutor) => {
  try {
    // Fetch the latest conversations from the server
    const conversations = await getConversations(tutor);
    return conversations;
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
};

export const syncMessages = async (conversationId, tutor) => {
  try {
    // Fetch all conversations to find the one with matching ID
    const conversations = await getConversations(tutor);
    const currentConversation = conversations.find(conv => conv._id === conversationId);

    if (currentConversation) {
      return currentConversation.messages;
    }
    return [];
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
};

export const startPolling = (conversationId, tutor, callback, interval = 5000) => {
  const pollId = setInterval(async () => {
    try {
      const messages = await syncMessages(conversationId, tutor);
      callback(messages);
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, interval);

  return () => clearInterval(pollId); // Return function to stop polling
};