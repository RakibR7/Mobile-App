// screens/FlashcardsScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ActivityIndicator, Dimensions, Alert, ScrollView
} from 'react-native';
import { useUser } from '../context/UserContext';
import { updatePerformanceData, getPerformanceData } from '../services/apiService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export default function FlashcardsScreen({ route, navigation }) {
  const { tutor, topic, topicName } = route.params;
  const { userId } = useUser();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [savedFlashcards, setSavedFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [showRevisionOptions, setShowRevisionOptions] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    timeSpent: 0
  });

  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fetch saved flashcards on mount
    fetchSavedFlashcards();
    setSessionStartTime(Date.now());

    // Cleanup when leaving the screen
    return () => {
      if (flashcards.length > 0 && sessionStats.cardsStudied > 0) {
        saveSession();
      }
    };
  }, []);

  const fetchSavedFlashcards = async () => {
    try {
      setLoading(true);
      // Get previously studied flashcards from the performance data
      if (userId) {
        const performanceData = await getPerformanceData(
          userId,
          tutor,
          topicName || tutor,
          'flashcard'
        );

        // Extract unique flashcards from the performance data
        const savedCards = [];
        const uniqueQuestions = new Set();

        performanceData.forEach(session => {
          if (session.cards && session.cards.length > 0) {
            session.cards.forEach(card => {
              // Only add cards for this specific topic if specified
              if ((!topic || card.subtopic === topic) && !uniqueQuestions.has(card.question)) {
                uniqueQuestions.add(card.question);
                savedCards.push({
                  id: card.cardId || savedCards.length + 1,
                  question: card.question,
                  answer: card.answer,
                  attempts: card.attempts || 0,
                  correct: card.correctAttempts || 0,
                  lastResult: null
                });
              }
            });
          }
        });

        setSavedFlashcards(savedCards);
      }
    } catch (error) {
      console.error('Error fetching saved flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

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

        // Add tracking properties to each card
        parsedFlashcards = parsedFlashcards.map(card => ({
          ...card,
          attempts: 0,
          correct: 0,
          lastResult: null
        }));

      } catch (parseError) {
        console.error('Error parsing flashcards:', parseError);
        // Fallback to some default flashcards if parsing fails
        parsedFlashcards = [
          {
            id: 1,
            question: `What is ${topicName || tutor}?`,
            answer: `The study of ${topicName || tutor} focuses on understanding key concepts and principles.`,
            attempts: 0,
            correct: 0,
            lastResult: null
          },
          {
            id: 2,
            question: `Name a key concept in ${topicName || tutor}.`,
            answer: `One key concept is the fundamental principles that underlie this subject.`,
            attempts: 0,
            correct: 0,
            lastResult: null
          },
          {
            id: 3,
            question: `Why is ${topicName || tutor} important?`,
            answer: `It's important because it helps us understand the world around us and solve real-world problems.`,
            attempts: 0,
            correct: 0,
            lastResult: null
          }
        ];
      }

      setShowRevisionOptions(false);
      setFlashcards(parsedFlashcards);
      setCurrentIndex(0);
      setSessionStats({
        cardsStudied: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        timeSpent: 0
      });
      setSessionStartTime(Date.now());
    } catch (error) {
      console.error('Error generating flashcards:', error);
      Alert.alert('Error', 'Failed to generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startRevision = () => {
    if (savedFlashcards.length === 0) {
      Alert.alert(
        'No Cards to Review',
        'You haven\'t studied any flashcards for this topic yet. Would you like to generate new flashcards?',
        [
          {
            text: 'Generate New Cards',
            onPress: generateFlashcards
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
      return;
    }

    setShowRevisionOptions(false);
    setFlashcards(savedFlashcards);
    setCurrentIndex(0);
    setSessionStats({
      cardsStudied: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      timeSpent: 0
    });
    setSessionStartTime(Date.now());
  };

  const saveSession = async () => {
    if (sessionStats.cardsStudied === 0 || !userId) return;

    try {
      const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);

      // Prepare cards data with subtopic
      const cardsData = flashcards.map(card => {
        // Only include cards that were studied this session
        if (card.lastResult !== null) {
          return {
            cardId: card.id.toString(),
            question: card.question,
            answer: card.answer,
            subtopic: topic || 'general', // Use topic as subtopic
            attempts: card.attempts || 0,
            correctAttempts: card.correct || 0
          };
        }
        return null;
      }).filter(Boolean); // Remove null entries

      // Prepare session data
      const sessionData = {
        cardsStudied: sessionStats.cardsStudied,
        correctAnswers: sessionStats.correctAnswers,
        timeSpent,
        subtopic: topic || 'general' // Use topic as subtopic
      };

      console.log("Saving flashcard performance:", {
        userId,
        tutor,
        topic: topicName || tutor,
        subtopic: topic || 'general',
        activityType: 'flashcard',
        sessionData,
        cardsData: cardsData.length
      });

      // Send data to server
      await updatePerformanceData({
        userId,
        tutor,
        topic: topicName || tutor,
        subtopic: topic || 'general',
        activityType: 'flashcard',
        sessionData,
        cardsData
      });

      console.log("Flashcard session saved successfully");

    } catch (error) {
      console.error('Error saving session data:', error);
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

  const markCardResult = (isCorrect) => {
    // Only count if card was viewed (answer shown)
    if (!showAnswer) {
      Alert.alert("Reminder", "Please flip the card and view the answer before marking your result.");
      return;
    }

    // Update the current flashcard
    const updatedFlashcards = [...flashcards];
    const currentCard = updatedFlashcards[currentIndex];

    currentCard.attempts += 1;
    if (isCorrect) {
      currentCard.correct += 1;
      currentCard.lastResult = true;
    } else {
      currentCard.lastResult = false;
    }

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      cardsStudied: prev.cardsStudied + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      incorrectAnswers: !isCorrect ? prev.incorrectAnswers + 1 : prev.incorrectAnswers
    }));

    setFlashcards(updatedFlashcards);

    // Move to next card automatically
    if (showAnswer) {
      setShowAnswer(false);
      flipAnimation.setValue(0);
    }

    // Go to next card or end if it's the last one
    if (currentIndex === flashcards.length - 1) {
      // Show session complete dialog
      Alert.alert(
        "Session Complete",
        `You've reviewed all cards!\n\nCorrect: ${sessionStats.correctAnswers + (isCorrect ? 1 : 0)}\nIncorrect: ${sessionStats.incorrectAnswers + (!isCorrect ? 1 : 0)}`,
        [
          {
            text: "Start New Set",
            onPress: () => {
              saveSession();
              setSessionStartTime(Date.now());
              setSessionStats({
                cardsStudied: 0,
                correctAnswers: 0,
                incorrectAnswers: 0,
                timeSpent: 0
              });
              setShowRevisionOptions(true);
            }
          },
          {
            text: "Review Again",
            onPress: () => {
              saveSession();
              setSessionStartTime(Date.now());
              setSessionStats({
                cardsStudied: 0,
                correctAnswers: 0,
                incorrectAnswers: 0,
                timeSpent: 0
              });
              setCurrentIndex(0);
            }
          },
          {
            text: "View Progress",
            onPress: () => {
              saveSession();
              navigation.navigate('FlashcardHistory', {
                tutor,
                topic: topic || topicName
              });
            }
          }
        ]
      );
    } else {
      setCurrentIndex(prevIndex => prevIndex + 1);
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

  const viewProgress = () => {
    saveSession();
    navigation.navigate('FlashcardHistory', {
      tutor,
      topic: topic || 'general'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>
          {savedFlashcards.length > 0
            ? "Loading your flashcards..."
            : "Creating flashcards..."}
        </Text>
      </View>
    );
  }

  if (showRevisionOptions) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.optionsContainer}>
          <Text style={styles.title}>
            {topicName || tutor} Flashcards
          </Text>

          <Text style={styles.subtitle}>
            Choose your study mode:
          </Text>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={generateFlashcards}
          >
            <Text style={styles.optionButtonText}>Study New Cards</Text>
            <Text style={styles.optionDescription}>
              Generate a new set of flashcards on this topic
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              savedFlashcards.length === 0 ? styles.disabledButton : null
            ]}
            onPress={startRevision}
            disabled={savedFlashcards.length === 0}
          >
            <Text style={styles.optionButtonText}>
              Review Previous Cards
            </Text>
            <Text style={styles.optionDescription}>
              {savedFlashcards.length > 0
                ? `Practice with ${savedFlashcards.length} cards you've already studied`
                : "You haven't studied any cards on this topic yet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressButton}
            onPress={viewProgress}
          >
            <Text style={styles.progressButtonText}>
              View Study Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>
              Back to Topics
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>
          {topicName || tutor} Flashcards
        </Text>
        <Text style={styles.progress}>
          Card {currentIndex + 1} of {flashcards.length}
        </Text>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Session Stats:</Text>
          <Text style={styles.statsDetail}>
            Studied: {sessionStats.cardsStudied} | Correct: {sessionStats.correctAnswers} | Incorrect: {sessionStats.incorrectAnswers}
          </Text>
        </View>
      </View>

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

      {showAnswer && (
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>How well did you know this?</Text>
          <View style={styles.ratingButtons}>
            <TouchableOpacity
              style={[styles.ratingButton, styles.incorrectButton]}
              onPress={() => markCardResult(false)}
            >
              <Text style={styles.ratingButtonText}>Didn't Know</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ratingButton, styles.correctButton]}
              onPress={() => markCardResult(true)}
            >
              <Text style={styles.ratingButtonText}>Knew It</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.navButton} onPress={prevCard}>
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={nextCard}>
          <Text style={styles.navButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            saveSession();
            setShowRevisionOptions(true);
          }}
        >
          <Text style={styles.actionButtonText}>Study Options</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={viewProgress}>
          <Text style={styles.actionButtonText}>View Progress</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
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
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  optionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  optionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  optionDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  progress: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  statsText: {
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  statsDetail: {
    color: '#333',
    fontSize: 14,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    alignSelf: 'center',
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
    marginBottom: 15,
    alignSelf: 'center',
  },
  flipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  ratingContainer: {
    width: '90%',
    alignItems: 'center',
    marginBottom: 15,
    alignSelf: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  ratingButton: {
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: '48%',
  },
  incorrectButton: {
    backgroundColor: '#F44336',
  },
  correctButton: {
    backgroundColor: '#4CAF50',
  },
  ratingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 15,
    alignSelf: 'center',
  },
  navButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 20,
    alignSelf: 'center',
  },
  actionButton: {
    backgroundColor: '#607D8B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  progressButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  progressButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#FFA000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  }
});