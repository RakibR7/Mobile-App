// screens/SubtopicProgressScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Dimensions
} from 'react-native';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

// Subject data with subtopics
const subjectsData = {
  biology: {
    name: "Biology",
    subtopics: [
      { id: 'cells', name: 'Cell Structure & Function'},
      { id: 'genetics', name: 'Genetics & Heredity'},
      { id: 'evolution', name: 'Evolution & Natural Selection'},
      { id: 'ecosystems', name: 'Ecosystems & Environment'},
      { id: 'anatomy', name: 'Human Anatomy'}
    ]
  },
  python: {
    name: "Python",
    subtopics: [
      { id: 'variables', name: 'Variables & Data Types'},
      { id: 'functions', name: 'Functions & Methods'},
      { id: 'loops', name: 'Loops & Control Flow'},
      { id: 'oop', name: 'Object-Oriented Programming'},
      { id: 'libraries', name: 'Libraries & Modules'}
    ]
  }
};

export default function SubtopicProgressScreen({ route, navigation }) {
  const { tutor } = route.params;
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ overall: 0, subtopics: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch progress data from API
      const response = await fetch(`https://api.teachmetutor.academy/api/progress/subtopics?userId=${userId}&tutor=${tutor}`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Received progress data:', data);

      // Map subtopic data to include UI info
      const enrichedSubtopics = data.subtopics.map(subtopic => {
        // Find UI info for this subtopic
        const uiInfo = subjectsData[tutor]?.subtopics.find(st => st.id === subtopic.subtopic) || {
          id: subtopic.subtopic,
          name: subtopic.subtopic,
          icon: '📚'
        };

        return {
          ...subtopic,
          ...uiInfo,
          id: subtopic.subtopic // Ensure ID is set from the subtopic field
        };
      });

      // For any subtopics that don't have progress data yet, add them with 0 progress
      const existingSubtopicIds = enrichedSubtopics.map(st => st.id);
      const missingSubtopics = (subjectsData[tutor]?.subtopics || [])
        .filter(st => !existingSubtopicIds.includes(st.id))
        .map(st => ({
          ...st,
          progress: 0,
          masteryLevel: 0,
          totalCards: 0,
          correctCards: 0,
          sessionsCount: 0,
          subtopic: st.id
        }));

      // Combine and sort by progress (highest first)
      const allSubtopics = [...enrichedSubtopics, ...missingSubtopics]
        .sort((a, b) => b.progress - a.progress);

      setProgress({
        overall: data.overall || 0,
        subtopics: allSubtopics
      });

    } catch (error) {
      console.error('Error fetching progress:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryText = (level) => {
    switch (level) {
      case 0: return 'Not Started';
      case 1: return 'Beginner';
      case 2: return 'Developing';
      case 3: return 'Competent';
      case 4: return 'Proficient';
      case 5: return 'Expert';
      default: return 'Unknown';
    }
  };

  const getMasteryColor = (level) => {
    switch (level) {
      case 0: return '#9E9E9E'; // Gray
      case 1: return '#F44336'; // Red
      case 2: return '#FF9800'; // Orange
      case 3: return '#FFEB3B'; // Yellow
      case 4: return '#8BC34A'; // Light Green
      case 5: return '#4CAF50'; // Green
      default: return '#9E9E9E';
    }
  };

  const navigateToSubtopic = (subtopic) => {
    navigation.navigate('TopicSelection', {
      tutor,
      preSelectedTopic: subtopic.id
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading progress data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProgress}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {subjectsData[tutor]?.name || tutor} Progress
        </Text>
      </View>

      <View style={styles.overallContainer}>
        <Text style={styles.overallTitle}>Overall Progress</Text>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress.overall}%` },
              { backgroundColor: getMasteryColor(Math.ceil(progress.overall / 20)) }
            ]}
          />
          <Text style={styles.progressText}>{progress.overall}%</Text>
        </View>

        <Text style={styles.overallSubtitle}>
          Based on your progress across all subtopics
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Subtopics</Text>

      <FlatList
        data={progress.subtopics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.subtopicsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.subtopicCard}
            onPress={() => navigateToSubtopic(item)}
          >
            <View style={styles.subtopicHeader}>
              <Text style={styles.subtopicIcon}>{item.icon}</Text>
              <Text style={styles.subtopicName}>{item.name}</Text>
              <View
                style={[
                  styles.masteryBadge,
                  { backgroundColor: getMasteryColor(item.masteryLevel) }
                ]}
              >
                <Text style={styles.masteryText}>
                  {getMasteryText(item.masteryLevel)}
                </Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${item.progress}%` },
                  { backgroundColor: getMasteryColor(item.masteryLevel) }
                ]}
              />
              <Text style={styles.progressText}>{item.progress}%</Text>
            </View>

            <View style={styles.subtopicStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.totalCards || 0}</Text>
                <Text style={styles.statLabel}>Questions</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.correctCards || 0}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.sessionsCount || 0}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
            </View>

            <Text style={styles.subtopicPrompt}>Tap to practice this subtopic</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No progress data available yet</Text>
            <Text style={styles.emptySubtext}>
              Complete some activities to track your progress!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('TopicSelection', { tutor })}
            >
              <Text style={styles.emptyButtonText}>Start Learning</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchProgress}
      >
        <Text style={styles.refreshButtonText}>Refresh Progress</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  overallContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  overallSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  subtopicsList: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  subtopicCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  subtopicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  subtopicIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  subtopicName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  masteryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  masteryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subtopicStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
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
  subtopicPrompt: {
    textAlign: 'center',
    color: '#2196F3',
    marginTop: 10,
    fontSize: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  }
});