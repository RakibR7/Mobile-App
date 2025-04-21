// screens/TopicSelectionScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ImageBackground, Alert
} from 'react-native';
import { subjectsData } from '../data/SubjectsData';

export default function TopicSelectionScreen({ route, navigation }) {
  const { tutor, preSelectedTopic } = route.params;
  const [highlightedTopic, setHighlightedTopic] = useState(preSelectedTopic || null);
  const scrollViewRef = useRef(null);

  // Get topics for the selected tutor
  const getTopics = () => {
    if (tutor === 'biology') {
      return [
        { id: 'cells', name: 'Cell Structure & Function', icon: '🔬' },
        { id: 'genetics', name: 'Genetics & Heredity', icon: '🧬' },
        { id: 'evolution', name: 'Evolution & Natural Selection', icon: '🦖' },
        { id: 'ecosystems', name: 'Ecosystems & Environment', icon: '🌳' },
        { id: 'anatomy', name: 'Human Anatomy', icon: '🫀' }
      ];
    } else if (tutor === 'python') {
      return [
        { id: 'variables', name: 'Variables & Data Types', icon: '🔤' },
        { id: 'functions', name: 'Functions & Methods', icon: '⚙️' },
        { id: 'loops', name: 'Loops & Control Flow', icon: '🔄' },
        { id: 'oop', name: 'Object-Oriented Programming', icon: '📦' },
        { id: 'libraries', name: 'Libraries & Modules', icon: '📚' }
      ];
    }
    return [];
  };

  const topics = getTopics();

  useEffect(() => {
    // If preSelectedTopic is provided, scroll to it or highlight it
    if (preSelectedTopic) {
      setHighlightedTopic(preSelectedTopic);

      // Add a small delay before scrolling to ensure the UI is ready
      setTimeout(() => {
        if (scrollViewRef.current) {
          // You would need element measurement for proper scrolling in a real app
          // This is a simplified version
          scrollViewRef.current.scrollTo({ y: 100, animated: true });
        }
      }, 500);
    }
  }, [preSelectedTopic]);

  const handleSelectActivity = (topic, activity) => {
    switch (activity) {
      case 'flashcards':
        navigation.navigate('FlashcardsScreen', {
          tutor,
          topic: topic.id,
          topicName: topic.name
        });
        break;
      case 'quiz':
        navigation.navigate('DynamicExercise', {
          tutor,
          topic: topic.id,
          topicName: topic.name
        });
        break;
      default:
        Alert.alert('Feature Not Available', 'This feature is coming soon!');
    }
  };

  const getTutorName = () => {
    return subjectsData[tutor]?.name ||
      (tutor === 'biology' ? 'Biology' :
       tutor === 'python' ? 'Python Programming' :
       tutor.charAt(0).toUpperCase() + tutor.slice(1));
  };

  return (
    <ImageBackground
      source={require('../assets/blur.jpg')}
      style={styles.backgroundImage}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>{getTutorName()} Topics</Text>

        <View style={styles.topicsContainer}>
          {topics.map(topic => (
            <View
              key={topic.id}
              style={[
                styles.topicCard,
                highlightedTopic === topic.id && styles.highlightedTopic
              ]}
            >
              <View style={styles.topicHeader}>
                <Text style={styles.topicIcon}>{topic.icon}</Text>
                <Text style={styles.topicName}>{topic.name}</Text>
              </View>

              <View style={styles.activitiesContainer}>
                <TouchableOpacity
                  style={[styles.activityButton, styles.flashcardsButton]}
                  onPress={() => handleSelectActivity(topic, 'flashcards')}
                >
                  <Text style={styles.activityIcon}>🔄</Text>
                  <Text style={styles.activityName}>Flashcards</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityButton, styles.quizButton]}
                  onPress={() => handleSelectActivity(topic, 'quiz')}
                >
                  <Text style={styles.activityIcon}>📝</Text>
                  <Text style={styles.activityName}>Quiz</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.progressButton}
          onPress={() => navigation.navigate('SubtopicProgress', { tutor })}
        >
          <Text style={styles.progressButtonText}>View My Progress</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  topicsContainer: {
    width: '100%',
  },
  topicCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  highlightedTopic: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  topicIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  topicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  activitiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: '48%',
  },
  flashcardsButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
  },
  quizButton: {
    backgroundColor: 'rgba(156, 39, 176, 0.15)',
  },
  activityIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  progressButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    alignSelf: 'center',
  },
  progressButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});