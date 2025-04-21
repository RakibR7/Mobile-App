// screens/FlashcardsScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export default function FlashcardsScreen({ route }) {
  const { tutor, topic, topicName } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    generateFlashcards();
  }, []);

  const generateFlashcards = async () => {
    setLoading(true);
    try {
      // Generate flashcards using your AI API
      const prompt = `Create 5 flashcards about ${topicName || tutor} for studying. Each flashcard should have a question on one side and the answer on the other. Format as JSON array with the structure [{"id": 1, "question": "question text", "answer": "answer text"}]. Only return the JSON array, no other text.`;

      const response = await fetch('http://51.21.106.225:5000/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          model: 'gpt-3.5-turbo',
          tutor
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate flashcards');
      }

      const data = await response.json();

      // Parse the AI response to extract the flashcards
      let parsedFlashcards;
      try {
        // Sometimes AI might wrap the JSON in code blocks or other text
        const jsonMatch = data.response.match(/\[.*\]/s);
        if (jsonMatch) {
          parsedFlashcards = JSON.parse(jsonMatch[0]);
        } else {
          parsedFlashcards = JSON.parse(data.response);
        }
      } catch (parseError) {
        console.error('Error parsing flashcards:', parseError);
        // Fallback to some default flashcards if parsing fails
        parsedFlashcards = [
          { id: 1, question: `What is ${topicName || tutor}?`, answer: `The study of ${topicName || tutor} focuses on understanding key concepts and principles.` },
          { id: 2, question: `Name a key concept in ${topicName || tutor}.`, answer: `One key concept is the fundamental principles that underlie this subject.` },
          { id: 3, question: `Why is ${topicName || tutor} important?`, answer: `It's important because it helps us understand the world around us and solve real-world problems.` }
        ];
      }

      setFlashcards(parsedFlashcards);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      // Set some default flashcards as fallback
      setFlashcards([
        { id: 1, question: "Loading flashcards failed", answer: "Please try again later" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const flipCard = () => {
    if (showAnswer) {
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowAnswer(false));
    } else {
      Animated.timing(flipAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowAnswer(true));
    }
  };

  const nextCard = () => {
    if (showAnswer) {
      setShowAnswer(false);
      flipAnimation.setValue(0);
    }

    setCurrentIndex((prevIndex) =>
      prevIndex === flashcards.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevCard = () => {
    if (showAnswer) {
      setShowAnswer(false);
      flipAnimation.setValue(0);
    }

    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? flashcards.length - 1 : prevIndex - 1
    );
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Creating flashcards...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {topicName || tutor} Flashcards
      </Text>
      <Text style={styles.progress}>
        Card {currentIndex + 1} of {flashcards.length}
      </Text>

      <View style={styles.cardContainer}>
        <Animated.View style={[
          styles.card,
          frontAnimatedStyle,
          { opacity: showAnswer ? 0 : 1, zIndex: showAnswer ? 0 : 1 }
        ]}>
          <Text style={styles.cardText}>{flashcards[currentIndex]?.question}</Text>
          <Text style={styles.tapHint}>Tap to reveal answer</Text>
        </Animated.View>

        <Animated.View style={[
          styles.card,
          styles.cardBack,
          backAnimatedStyle,
          { opacity: showAnswer ? 1 : 0, zIndex: showAnswer ? 1 : 0 }
        ]}>
          <Text style={styles.cardText}>{flashcards[currentIndex]?.answer}</Text>
          <Text style={styles.tapHint}>Tap to see question</Text>
        </Animated.View>
      </View>

      <TouchableOpacity style={styles.flipButton} onPress={flipCard}>
        <Text style={styles.flipButtonText}>
          {showAnswer ? "Show Question" : "Show Answer"}
        </Text>
      </TouchableOpacity>

      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.navButton} onPress={prevCard}>
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={nextCard}>
          <Text style={styles.navButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.newCardsButton} onPress={generateFlashcards}>
        <Text style={styles.newCardsButtonText}>Generate New Cards</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F0F8FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  progress: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: 200,
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardBack: {
    backgroundColor: '#2196F3',
  },
  cardText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tapHint: {
    position: 'absolute',
    bottom: 10,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  flipButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  flipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  navButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  newCardsButton: {
    backgroundColor: '#607D8B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  newCardsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  }
});