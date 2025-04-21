// screens/FlashcardHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert
} from 'react-native';
import { useUser } from '../context/UserContext';
import { getPerformanceData } from '../services/apiService';
import { subjectsData } from '../data/SubjectsData';

export default function FlashcardHistoryScreen({ route, navigation }) {
  const { tutor, topic } = route.params || {};
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);

  useEffect(() => {
    fetchFlashcardHistory();
  }, []);

  const fetchFlashcardHistory = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Fetch flashcard history for this user/tutor/topic
      const query = { userId, activityType: 'flashcard' };
      if (tutor) query.tutor = tutor;
      if (topic) query.topic = topic;

      console.log('Fetching flashcard history with query:', query);

      const data = await getPerformanceData(userId, tutor, topic, 'flashcard');
      console.log(`Found ${data.length} flashcard history records`);

      // Group by subtopic for easier navigation
      const groupedBySubtopic = {};

      data.forEach(item => {
        const subtopic = item.subtopic || 'general';
        if (!groupedBySubtopic[subtopic]) {
          groupedBySubtopic[subtopic] = [];
        }
        groupedBySubtopic[subtopic].push(item);
      });

      // Convert to array format for FlatList
      const formattedData = Object.keys(groupedBySubtopic).map(subtopic => {
        const sets = groupedBySubtopic[subtopic];
        const totalCards = sets.reduce((sum, set) => sum + set.cards.length, 0);
        const correctCards = sets.reduce((sum, set) =>
          sum + set.cards.reduce((total, card) => total + card.correctAttempts, 0), 0);

        const attempts = sets.reduce((sum, set) =>
          sum + set.cards.reduce((total, card) => total + card.attempts, 0), 0);

        const successRate = attempts > 0 ? Math.round((correctCards / attempts) * 100) : 0;

        // Find subtopic details
        const subtopicInfo = findSubtopic(tutor, subtopic) || {
          name: subtopic.charAt(0).toUpperCase() + subtopic.slice(1),
          icon: '📚'
        };

        return {
          subtopic,
          name: subtopicInfo.name,
          icon: subtopicInfo.icon,
          sets,
          totalCards,
          correctCards,
          attempts,
          successRate,
          lastStudied: sets.reduce((latest, set) => {
            const setLatest = set.updatedAt ? new Date(set.updatedAt) : null;
            return latest && setLatest ?
              (latest > setLatest ? latest : setLatest) :
              (latest || setLatest);
          }, null)
        };
      });

      // Sort by most recently studied
      formattedData.sort((a, b) => {
        if (!a.lastStudied) return 1;
        if (!b.lastStudied) return -1;
        return b.lastStudied - a.lastStudied;
      });

      setFlashcardSets(formattedData);
    } catch (error) {
      console.error('Error fetching flashcard history:', error);
      Alert.alert('Error', 'Failed to load flashcard history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';

    // If it's today, show time
    const today = new Date();
    const dateObj = new Date(date);

    if (dateObj.toDateString() === today.toDateString()) {
      return 'Today at ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // If it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateObj.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Otherwise show date
    return dateObj.toLocaleDateString();
  };

  const findSubtopic = (tutorId, subtopicId) => {
    const subject = subjectsData[tutorId];
    if (!subject) return null;

    return subject.subtopics.find(st => st.id === subtopicId) || null;
  };

  const handleReviewFlashcards = (subtopicData) => {
    // Navigate to flashcard screen with existing cards from history
    if (subtopicData.sets.length === 0 || subtopicData.sets[0].cards.length === 0) {
      Alert.alert('No Cards', 'No flashcards found for this topic.');
      return;
    }

    // Combine all cards from all sets
    let allCards = [];
    subtopicData.sets.forEach(set => {
      const cards = set.cards.map(card => ({
        id: card.cardId,
        question: card.question,
        answer: card.answer,
        attempts: card.attempts || 0,
        correct: card.correctAttempts || 0,
        difficulty: card.difficulty || 3,
        lastResult: null
      }));
      allCards = [...allCards, ...cards];
    });

    // Filter out duplicates by question
    const uniqueCards = [];
    const questionSet = new Set();

    allCards.forEach(card => {
      if (!questionSet.has(card.question)) {
        questionSet.add(card.question);
        uniqueCards.push(card);
      }
    });

    // Sort by difficulty (hardest first)
    uniqueCards.sort((a, b) => b.difficulty - a.difficulty);

    // Navigate to flashcard screen with these cards
    navigation.navigate('FlashcardsScreen', {
      tutor,
      topic: subtopicData.subtopic,
      topicName: subtopicData.name,
      existingCards: uniqueCards.slice(0, 10), // Limit to 10 cards
      isReview: true
    });
  };

  const handleStudyOptions = (subtopicData) => {
    // Show options: review existing or create new
    Alert.alert(
      'Study Options',
      `How would you like to study ${subtopicData.name}?`,
      [
        {
          text: 'Review Existing Cards',
          onPress: () => handleReviewFlashcards(subtopicData)
        },
        {
          text: 'Generate New Cards',
          onPress: () => navigation.navigate('FlashcardsScreen', {
            tutor,
            topic: subtopicData.subtopic,
            topicName: subtopicData.name
          })
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading flashcard history...</Text>
      </View>
    );
  }

  if (flashcardSets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Flashcard History</Text>
        <Text style={styles.emptySubtitle}>
          You haven't studied any flashcards yet for {topic ? `the ${topic} topic` : `this subject`}.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('TopicSelection', { tutor })}
        >
          <Text style={styles.emptyButtonText}>Start Studying</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Flashcard History {topic ? `- ${topic}` : ''}
      </Text>

      <FlatList
        data={flashcardSets}
        keyExtractor={(item) => item.subtopic}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleStudyOptions(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{item.icon}</Text>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{item.successRate}%</Text>
              </View>
            </View>

            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.totalCards}</Text>
                <Text style={styles.statLabel}>Cards</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.correctCards}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.attempts}</Text>
                <Text style={styles.statLabel}>Attempts</Text>
              </View>
            </View>

            <Text style={styles.lastStudied}>
              Last studied: {formatDate(item.lastStudied)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchFlashcardHistory}
      >
        <Text style={styles.refreshButtonText}>Refresh History</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  emptyButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  lastStudied: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});