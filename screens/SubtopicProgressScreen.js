import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native'
import { useUser } from '../context/UserContext'

// Simplified subject data
const subjects = {
  biology: {
    name: "Biology",
    subtopics: [
      { id: 'cells', name: 'Cell Structure & Function', icon: '🔬' },
      { id: 'genetics', name: 'Genetics & Heredity', icon: '🧬' },
      { id: 'evolution', name: 'Evolution & Natural Selection', icon: '🦖' },
      { id: 'ecosystems', name: 'Ecosystems & Environment', icon: '🌳' },
      { id: 'anatomy', name: 'Human Anatomy', icon: '🫀' }
    ]
  },
  python: {
    name: "Python",
    subtopics: [
      { id: 'variables', name: 'Variables & Data Types', icon: '🔤' },
      { id: 'functions', name: 'Functions & Methods', icon: '⚙️' },
      { id: 'loops', name: 'Loops & Control Flow', icon: '🔄' },
      { id: 'oop', name: 'Object-Oriented Programming', icon: '📦' },
      { id: 'libraries', name: 'Libraries & Modules', icon: '📚' }
    ]
  }
}

export default function SubtopicProgressScreen({ route, navigation }) {
  const { tutor } = route.params
  const { userId } = useUser()

  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ overall: 0, subtopics: [] })
  const [error, setError] = useState(null)

  // Fetch progress data when component mounts
  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch progress data from API
      const response = await fetch(`https://api.teachmetutor.academy/api/progress/subtopics?userId=${userId}&tutor=${tutor}`)

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const data = await response.json()

      // Process the data in a single function
      processAndSetProgress(data)
    } catch (error) {
      console.error('Error fetching progress:', error)
      setError('Failed to load progress data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Process and set the progress data
  const processAndSetProgress = (data) => {
    // Get subtopics for this tutor
    const tutorSubtopics = subjects[tutor]?.subtopics || []

    // Create a map for quick access to UI data
    const subtopicMap = {}
    tutorSubtopics.forEach(st => {
      subtopicMap[st.id] = st
    })

    // Process API data and add UI information
    const processedSubtopics = data.subtopics.map(apiSubtopic => {
      const uiData = subtopicMap[apiSubtopic.subtopic] || {
        id: apiSubtopic.subtopic,
        name: apiSubtopic.subtopic,
        icon: '📚'
      }

      return {
        ...apiSubtopic,
        ...uiData,
        id: apiSubtopic.subtopic
      }
    })

    // Get list of subtopics we have progress data for
    const existingIds = processedSubtopics.map(st => st.id)

    // Add missing subtopics with zero progress
    const missingSubtopics = tutorSubtopics
      .filter(st => !existingIds.includes(st.id))
      .map(st => ({
        ...st,
        progress: 0,
        masteryLevel: 0,
        totalCards: 0,
        correctCards: 0,
        sessionsCount: 0,
        subtopic: st.id
      }))

    // Combine and sort by progress (highest first)
    const allSubtopics = [...processedSubtopics, ...missingSubtopics]
      .sort((a, b) => b.progress - a.progress)

    // Update state
    setProgress({
      overall: data.overall || 0,
      subtopics: allSubtopics
    })
  }

  // Helper functions
  const getMasteryText = (level) => {
    const labels = ['Not Started', 'Beginner', 'Developing', 'Competent', 'Proficient', 'Expert']
    return labels[level] || 'Unknown'
  }

  const getMasteryColor = (level) => {
    const colors = ['#9E9E9E', '#F44336', '#FF9800', '#FFEB3B', '#8BC34A', '#4CAF50']
    return colors[level] || '#9E9E9E'
  }

  const navigateToSubtopic = (subtopic) => {
    navigation.navigate('TopicSelection', {
      tutor,
      preSelectedTopic: subtopic.id
    })
  }

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading progress data...</Text>
      </View>
    )
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProgress}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Main render
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {subjects[tutor]?.name || tutor} Progress
        </Text>
      </View>

      {/* Overall Progress */}
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

      {/* Subtopics List */}
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 15,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
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
    elevation: 3
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center'
  },
  overallSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative'
  },
  progressBar: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    lineHeight: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
    marginBottom: 10
  },
  subtopicsList: {
    paddingHorizontal: 15,
    paddingBottom: 20
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
    elevation: 2
  },
  subtopicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  subtopicIcon: {
    fontSize: 24,
    marginRight: 10
  },
  subtopicName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  masteryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  masteryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  subtopicStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  statLabel: {
    fontSize: 12,
    color: '#666'
  },
  subtopicPrompt: {
    textAlign: 'center',
    color: '#2196F3',
    marginTop: 10,
    fontSize: 12
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
})