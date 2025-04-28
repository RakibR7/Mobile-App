// screens/ProgressScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions
} from 'react-native';
import { useUser } from '../context/UserContext';
import { getPerformanceData } from '../services/apiService';

const { width } = Dimensions.get('window');

export default function ProgressScreen({ navigation }) {
  const { userId } = useUser();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState({
    flashcards: [],
    quizzes: []
  });
  const [stats, setStats] = useState({
    totalFlashcards: 0,
    totalQuizzes: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    successRate: 0,
    mostStudiedSubject: '',
    mostStudiedTopic: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Get all performance data
      const allData = await getPerformanceData(userId);

      // Separate by activity type
      const flashcardData = allData.filter(item => item.activityType === 'flashcard');
      const quizData = allData.filter(item => item.activityType === 'quiz');

      setPerformanceData({
        flashcards: flashcardData,
        quizzes: quizData
      });

      // Calculate overall stats
      calculateStats(allData);

    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      setStats({
        totalFlashcards: 0,
        totalQuizzes: 0,
        totalCorrect: 0,
        totalAttempts: 0,
        successRate: 0,
        mostStudiedSubject: 'None',
        mostStudiedTopic: 'None'
      });
      return;
    }

    // Count by activity type
    const flashcardCount = data.filter(item => item.activityType === 'flashcard').length;
    const quizCount = data.filter(item => item.activityType === 'quiz').length;

    // Total cards studied and correct answers
    let totalCorrect = 0;
    let totalAttempts = 0;

    // Subject and topic tracking
    const subjectCounts = {};
    const topicCounts = {};

    // Iterate through all data
    data.forEach(item => {
      // Count subject frequency
      subjectCounts[item.tutor] = (subjectCounts[item.tutor] || 0) + 1;
      topicCounts[item.topic] = (topicCounts[item.topic] || 0) + 1;

      // Add up stats from sessions
      if (item.sessions && item.sessions.length > 0) {
        item.sessions.forEach(session => {
          totalAttempts += session.cardsStudied || 0;
          totalCorrect += session.correctAnswers || 0;
        });
      }
    });

    // Find most studied subject and topic
    let mostStudiedSubject = 'None';
    let maxSubjectCount = 0;

    for (const [subject, count] of Object.entries(subjectCounts)) {
      if (count > maxSubjectCount) {
        mostStudiedSubject = subject;
        maxSubjectCount = count;
      }
    }

    let mostStudiedTopic = 'None';
    let maxTopicCount = 0;

    for (const [topic, count] of Object.entries(topicCounts)) {
      if (count > maxTopicCount) {
        mostStudiedTopic = topic;
        maxTopicCount = count;
      }
    }

    // Calculate success rate
    const successRate = totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 100)
      : 0;

    setStats({
      totalFlashcards: flashcardCount,
      totalQuizzes: quizCount,
      totalCorrect,
      totalAttempts,
      successRate,
      mostStudiedSubject,
      mostStudiedTopic
    });
  };

  const navigateToActivityHistory = (activityType, tutor = null, topic = null) => {
    if (activityType === 'flashcard') {
      navigation.navigate('FlashcardHistory', { tutor, topic });
    } else {
      navigation.navigate('QuizHistory', { tutor, topic });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FE7648" />
        <Text style={styles.loadingText}>Loading your progress data...</Text>
      </View>
    );
  }

  // Get subjects from performance data
  const subjects = [...new Set([
    ...performanceData.flashcards.map(item => item.tutor),
    ...performanceData.quizzes.map(item => item.tutor)
  ])];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Learning Progress</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>Overall Progress</Text>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalFlashcards + stats.totalQuizzes}</Text>
            <Text style={styles.statLabel}>Total Activities</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.successRate}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalAttempts}</Text>
            <Text style={styles.statLabel}>Questions Answered</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalCorrect}</Text>
            <Text style={styles.statLabel}>Correct Answers</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <View style={styles.fullWidthStat}>
            <Text style={styles.statLabel}>Most Studied Subject:</Text>
            <Text style={styles.statHighlight}>{stats.mostStudiedSubject}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.fullWidthStat}>
            <Text style={styles.statLabel}>Most Studied Topic:</Text>
            <Text style={styles.statHighlight}>{stats.mostStudiedTopic}</Text>
          </View>
        </View>
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Activity History</Text>

        <View style={styles.activityButtons}>
          <TouchableOpacity
            style={[styles.activityButton, styles.flashcardButton]}
            onPress={() => navigateToActivityHistory('flashcard')}
          >
            <Text style={styles.activityButtonText}>Flashcards</Text>
            <Text style={styles.activityCount}>{stats.totalFlashcards} sessions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.activityButton, styles.quizButton]}
            onPress={() => navigateToActivityHistory('quiz')}
          >
            <Text style={styles.activityButtonText}>Quizzes</Text>
            <Text style={styles.activityCount}>{stats.totalQuizzes} sessions</Text>
          </TouchableOpacity>
        </View>
      </View>

      {subjects.length > 0 && (
        <View style={styles.subjectsSection}>
          <Text style={styles.sectionTitle}>Subjects Progress</Text>

          {subjects.map((subject, index) => {
            // Count activities by subject
            const flashcardCount = performanceData.flashcards.filter(
              item => item.tutor === subject
            ).length;

            const quizCount = performanceData.quizzes.filter(
              item => item.tutor === subject
            ).length;

            return (
              <View key={index} style={styles.subjectCard}>
                <Text style={styles.subjectName}>
                  {subject.charAt(0).toUpperCase() + subject.slice(1)}
                </Text>

                <View style={styles.subjectStats}>
                  <TouchableOpacity
                    style={styles.subjectStat}
                    onPress={() => navigateToActivityHistory('flashcard', subject)}
                  >
                    <Text style={styles.subjectStatValue}>{flashcardCount}</Text>
                    <Text style={styles.subjectStatLabel}>Flashcard Sets</Text>
                  </TouchableOpacity>

// screens/ProgressScreen.js (continued)
                  <TouchableOpacity
                    style={styles.subjectStat}
                    onPress={() => navigateToActivityHistory('quiz', subject)}
                  >
                    <Text style={styles.subjectStatValue}>{quizCount}</Text>
                    <Text style={styles.subjectStatLabel}>Quizzes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchData}
      >
        <Text style={styles.refreshButtonText}>Refresh Data</Text>
      </TouchableOpacity>
    </ScrollView>
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
  header: {
    backgroundColor: '#FE7648',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FE7648',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    textTransform: 'capitalize',
  },
  fullWidthStat: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  activitySection: {
    marginHorizontal: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  activityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityButton: {
    width: '48%',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flashcardButton: {
    backgroundColor: '#FF9800',
  },
  quizButton: {
    backgroundColor: '#9C27B0',
  },
  activityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  activityCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  subjectsSection: {
    marginHorizontal: 15,
    marginTop: 20,
  },
  subjectCard: {
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
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subjectStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  subjectStat: {
    alignItems: 'center',
    padding: 10,
  },
  subjectStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FE7648',
  },
  subjectStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});