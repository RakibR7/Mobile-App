// screens/FlashcardHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, FlatList
} from 'react-native';
import { useUser } from '../context/UserContext';
import { getPerformanceData } from '../services/apiService';

export default function FlashcardHistoryScreen({ route, navigation }) {
  const { tutor, topic } = route.params || {};
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);

  useEffect(() => {
    fetchFlashcardData();
  }, []);

  const fetchFlashcardData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Construct query parameters
      const queryParams = {
        userId,
        activityType: 'flashcard'
      };

      if (tutor) queryParams.tutor = tutor;
      if (topic) queryParams.topic = topic;

      // Get filtered performance data
      const data = await getPerformanceData(
        userId,
        tutor,
        topic,
        'flashcard'
      );

      setPerformanceData(data);

    } catch (error) {
      console.error('Error fetching flashcard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateSetStats = (item) => {
    if (!item.sessions || item.sessions.length === 0) {
      return { total: 0, correct: 0, rate: 0 };
    }

    let totalCards = 0;
    let correctCards = 0;

    item.sessions.forEach(session => {
      totalCards += session.cardsStudied || 0;
      correctCards += session.correctAnswers || 0;
    });

    const successRate = totalCards > 0 ? Math.round((correctCards / totalCards) * 100) : 0;

    return {
      total: totalCards,
      correct: correctCards,
      rate: successRate
    };
  };

  const calculateCardSuccessRate = (card) => {
    if (!card.attempts || card.attempts === 0) return 0;
    return Math.round((card.correctAttempts / card.attempts) * 100);
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 1: return '#4CAF50'; // Easy - green
      case 2: return '#8BC34A'; // Somewhat easy - light green
      case 3: return '#FFC107'; // Medium - amber
      case 4: return '#FF9800'; // Somewhat difficult - orange
      case 5: return '#F44336'; // Difficult - red
      default: return '#9E9E9E'; // Default - grey
    }
  };

  const renderCardItem = ({ item }) => {
    const successRate = calculateCardSuccessRate(item);

    return (
      <View style={styles.cardItem}>
        <View style={styles.cardHeader}>
          <View style={[
            styles.difficultyIndicator,
            { backgroundColor: getDifficultyColor(item.difficulty) }
          ]} />
          <Text style={styles.cardHeaderText}>
            Success Rate: {successRate}% ({item.correctAttempts}/{item.attempts})
          </Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardQuestion}>{item.question}</Text>
          <Text style={styles.cardAnswer}>{item.answer}</Text>
        </View>

        <Text style={styles.cardLastAttempt}>
          Last reviewed: {formatDate(item.lastAttempt)}
        </Text>
      </View>
    );
  };

  const renderSessionItem = ({ item, index }) => {
    return (
      <View style={styles.sessionItem}>
        <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
        <View style={styles.sessionStats}>
          <Text style={styles.sessionStat}>Cards: {item.cardsStudied}</Text>
          <Text style={styles.sessionStat}>Correct: {item.correctAnswers}</Text>
          <Text style={styles.sessionStat}>
            Rate: {Math.round((item.correctAnswers / item.cardsStudied) * 100)}%
          </Text>
        </View>
        <Text style={styles.sessionTime}>
          Time: {Math.floor(item.timeSpent / 60)}m {item.timeSpent % 60}s
        </Text>
      </View>
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

  if (performanceData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No flashcard history found.</Text>
        <Text style={styles.emptySubtext}>
          Complete some flashcard sessions to track your progress!
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('SubjectTutor')}
        >
          <Text style={styles.emptyButtonText}>Start Studying</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (selectedSet) {
    // Show detailed view of a specific set
    const stats = calculateSetStats(selectedSet);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedSet(null)}
          >
            <Text style={styles.backButtonText}>← Back to Sets</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {selectedSet.topic} - {selectedSet.tutor}
          </Text>
        </View>

        <View style={styles.setStatsCard}>
          <Text style={styles.setStatsTitle}>Overall Performance</Text>
          <View style={styles.setStatsRow}>
            <View style={styles.setStat}>
              <Text style={styles.setStatValue}>{stats.total}</Text>
              <Text style={styles.setStatLabel}>Cards Studied</Text>
            </View>

            <View style={styles.setStat}>
              <Text style={styles.setStatValue}>{stats.correct}</Text>
              <Text style={styles.setStatLabel}>Correct</Text>
            </View>

            <View style={styles.setStat}>
              <Text style={styles.setStatValue}>{stats.rate}%</Text>
              <Text style={styles.setStatLabel}>Success Rate</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Session History</Text>
        </View>

        <FlatList
          data={selectedSet.sessions.sort((a, b) => new Date(b.date) - new Date(a.date))}
          renderItem={renderSessionItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.sessionsList}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No session data available</Text>
          }
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cards</Text>
          <Text style={styles.sectionSubtitle}>
            Sorted by difficulty (hardest first)
          </Text>
        </View>

        <FlatList
          data={selectedSet.cards.sort((a, b) => b.difficulty - a.difficulty)}
          renderItem={renderCardItem}
          keyExtractor={(item) => item.cardId}
          style={styles.cardsList}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No card data available</Text>
          }
        />
      </View>
    );
  }

  // Show list of flashcard sets
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Flashcard History {tutor ? `- ${tutor}` : ''}
        </Text>
      </View>

      <FlatList
        data={performanceData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const stats = calculateSetStats(item);
          const lastSession = item.sessions && item.sessions.length > 0
            ? item.sessions[item.sessions.length - 1]
            : null;

          return (
            <TouchableOpacity
              style={styles.setCard}
              onPress={() => setSelectedSet(item)}
            >
              <View style={styles.setCardHeader}>
                <Text style={styles.setName}>{item.topic}</Text>
                <Text style={styles.setSubject}>{item.tutor}</Text>
              </View>

              <View style={styles.setCardStats}>
                <View style={styles.setCardStat}>
                  <Text style={styles.setCardStatValue}>{stats.total}</Text>
                  <Text style={styles.setCardStatLabel}>Cards</Text>
                </View>

                <View style={styles.setCardStat}>
                  <Text style={styles.setCardStatValue}>{stats.rate}%</Text>
                  <Text style={styles.setCardStatLabel}>Success</Text>
                </View>

                <View style={styles.setCardStat}>
                  <Text style={styles.setCardStatValue}>{item.sessions.length}</Text>
                  <Text style={styles.setCardStatLabel}>Sessions</Text>
                </View>
              </View>

              {lastSession && (
                <Text style={styles.setLastSession}>
                  Last session: {formatDate(lastSession.date)}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.setsList}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>No flashcard sets found</Text>
        }
      />

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchFlashcardData}
      >
        <Text style={styles.refreshButtonText}>Refresh Data</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#FF9800',
    padding: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  setsList: {
    padding: 15,
  },
  setCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  setName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  setSubject: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  setCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  setCardStat: {
    alignItems: 'center',
  },
  setCardStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  setCardStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  setLastSession: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  emptyListText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Detailed set view styles
  setStatsCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  setStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  setStat: {
    alignItems: 'center',
  },
  setStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  setStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionHeader: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sessionsList: {
    maxHeight: 200,
  },
  sessionItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  sessionStat: {
    fontSize: 12,
    color: '#666',
  },
  sessionTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  cardsList: {
    flex: 1,
    marginBottom: 15,
  },
  cardItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  difficultyIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  cardHeaderText: {
    fontSize: 14,
    color: '#666',
  },
  cardContent: {
    marginBottom: 10,
  },
  cardQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardAnswer: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  cardLastAttempt: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  }
});