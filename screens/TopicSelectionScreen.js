// screens/TopicSelectionScreen.js (updated with flashcard option)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';

export default function TopicSelectionScreen({ route, navigation }) {
  const { tutor } = route.params;

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

  return (
    <ImageBackground
      source={require('../assets/blur.jpg')}
      style={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Select a Study Method</Text>

        <View style={styles.studyMethods}>
          <TouchableOpacity
            style={[styles.methodCard, styles.practiceCard]}
            onPress={() => navigation.navigate('FlashcardsScreen', {
              tutor,
              topicName: getTutorName()
            })}
          >
            <Text style={styles.methodIcon}>🔄</Text>
            <Text style={styles.methodTitle}>Flashcards</Text>
            <Text style={styles.methodDesc}>Learn through quick memory recall</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, styles.exerciseCard]}
            onPress={() => {
              // Show topic selection below
              document.getElementById('topicSection').scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Text style={styles.methodIcon}>📝</Text>
            <Text style={styles.methodTitle}>Practice Questions</Text>
            <Text style={styles.methodDesc}>Test your knowledge with questions</Text>
          </TouchableOpacity>
        </View>

        <View id="topicSection">
          <Text style={styles.subtitle}>Topics for Practice Questions:</Text>

          <View style={styles.topicsGrid}>
            {topics.map(topic => (
              <TouchableOpacity
                key={topic.id}
                style={styles.topicButton}
                onPress={() => navigation.navigate('DynamicExercise', {
                  tutor,
                  topic: topic.id,
                  topicName: topic.name
                })}
              >
                <Text style={styles.topicIcon}>{topic.icon}</Text>
                <Text style={styles.topicText}>{topic.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );

  function getTutorName() {
    if (tutor === 'biology') return 'Biology';
    if (tutor === 'python') return 'Python Programming';
    return tutor.charAt(0).toUpperCase() + tutor.slice(1);
  }
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 15,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  studyMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  methodCard: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 150,
  },
  practiceCard: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
  },
  exerciseCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  methodIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  methodTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  methodDesc: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  topicIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  topicText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  }
});