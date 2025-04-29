import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ActivityIndicator, Dimensions, Alert, ScrollView
} from 'react-native';
import { useUser } from '../context/UserContext';
import { updatePerformanceData, getPerformanceData } from '../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

const getDefaultFlashcards = (topic, tutor) => {
  return [
    {
      id: 1,
      question: `What is ${topic || tutor}?`,
      answer: `The study of ${topic || tutor} focuses on understanding key concepts and principles.`,
      attempts: 0,
      correct: 0,
      lastResult: null
    },
    {
      id: 2,
      question: `Name a key concept in ${topic || tutor}.`,
      answer: `One key concept is the fundamental principles that underlie ${topic || tutor}.`,
      attempts: 0,
      correct: 0,
      lastResult: null
    },
    {
      id: 3,
      question: `Why is ${topic || tutor} important?`,
      answer: `It's important because it helps us understand the world around us and solve real-world problems.`,
      attempts: 0,
      correct: 0,
      lastResult: null
    }
  ]
}

//Get specific defaultcards for biology topics
const getBiologyFlashcards = (topic) => {
  if (topic === "cells") {
    return [
      {
        id: 1,
        question: "What are the main parts of a eukaryotic cell?",
        answer: "Nucleus, cell membrane, cytoplasm, and various organelles like mitochondria, endoplasmic reticulum, and Golgi apparatus.",
        attempts: 0,
        correct: 0,
        lastResult: null
      },
      {
        id: 2,
        question: "What is the function of the cell membrane?",
        answer: "The cell membrane regulates what enters and exits the cell, provides structure, and helps in cell communication.",
        attempts: 0,
        correct: 0,
        lastResult: null
      },
      {
        id: 3,
        question: "What is the difference between prokaryotic and eukaryotic cells?",
        answer: "Prokaryotic cells lack a nucleus and membrane-bound organelles, while eukaryotic cells have a nucleus and various membrane-bound organelles.",
        attempts: 0,
        correct: 0,
        lastResult: null
      },
      {
        id: 4,
        question: "What is the function of mitochondria?",
        answer: "Mitochondria are the powerhouses of the cell, responsible for cellular respiration and producing ATP (energy).",
        attempts: 0,
        correct: 0,
        lastResult: null
      },
      {
        id: 5,
        question: "What is the role of the nucleus in a cell?",
        answer: "The nucleus contains the cell's DNA, controls cellular activities, and regulates gene expression.",
        attempts: 0,
        correct: 0,
        lastResult: null
      }
    ]
  }
  return getDefaultFlashcards(topic, "biology");
}

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
  const [networkError, setNetworkError] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    timeSpent: 0
  })

  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchSavedFlashcards();
    setSessionStartTime(Date.now());

    return () => {
      if (flashcards.length > 0 && sessionStats.cardsStudied > 0) {
        saveSession();
      }
    }
  }, [])

  const fetchSavedFlashcards = async () => {
    try {
      setLoading(true);
      setNetworkError(false);

      if (userId) {
        try {
          console.log(`Fetching flashcards for user: ${userId}, tutor: ${tutor}, topic: ${topic || topicName}`);

          const performanceData = await getPerformanceData(
            userId,
            tutor,
            null,
            'flashcard'
          );

          console.log(`Retrieved ${performanceData?.length || 0} flashcard sessions`);

          const savedCards = [];
          const uniqueQuestions = new Set();

          if (Array.isArray(performanceData) && performanceData.length > 0) {
            performanceData.forEach(session => {
              console.log(`Session has ${session.cards?.length || 0} cards`);

              if (session.cards && Array.isArray(session.cards) && session.cards.length > 0) {
                session.cards.forEach(card => {
                  if (!uniqueQuestions.has(card.question)) {
                    uniqueQuestions.add(card.question);
                    savedCards.push({
                      id: card.cardId || `card_${savedCards.length + 1}`,
                      question: card.question,
                      answer: card.answer || "No answer provided for this card.",
                      attempts: card.attempts || 0,
                      correct: card.correctAttempts || 0,
                      lastResult: null
                    })
                  }
                })
              }
            })
          }

          console.log(`Extracted ${savedCards.length} unique flashcards`);

          if (savedCards.length === 0) {
            console.log('No saved flashcards found, using defaults as fallback');
            let fallbackCards;
            if (tutor === 'biology' && topic === 'cells') {
              fallbackCards = getBiologyFlashcards(topic);
            } else {
              fallbackCards = getDefaultFlashcards(topicName, tutor);
            }

            setSavedFlashcards(fallbackCards);
          } else {
            setSavedFlashcards(savedCards);
          }
        } catch (error) {
          console.error('Error fetching performance data:', error);

          let fallbackCards;
          if (tutor === 'biology' && topic === 'cells') {
            fallbackCards = getBiologyFlashcards(topic);
          } else {
            fallbackCards = getDefaultFlashcards(topicName, tutor);
          }

          setSavedFlashcards(fallbackCards);
        }
      }
    } catch (error) {
      console.error('Error in fetchSavedFlashcards:', error);
      let fallbackCards = getDefaultFlashcards(topicName, tutor);
      setSavedFlashcards(fallbackCards);
    } finally {
      setLoading(false);
    }
  }

  const generateFlashcards = async () => {
    setLoading(true);
    setNetworkError(false);

    try {
      let difficulty = 'normal';
      try {
        const savedDifficulty = await AsyncStorage.getItem('questionDifficulty');
        if (savedDifficulty) {
          difficulty = savedDifficulty;
        }
      } catch (error) {
        console.log('Could not load difficulty setting:', error);
      }

      const tutorModel = {
        biology: 'ft:gpt-3.5-turbo-0125:personal:csp-biology-finetuning-data10-20000:BJN7IqeS',
        python: 'ft:gpt-3.5-turbo-0125:personal:dr1-csv6-shortened-3381:B0DlvD7p'
      }[tutor] || 'gpt-3.5-turbo';

      const uniqueId = Math.random().toString(36).substring(2, 8);
      const timestamp = new Date().toISOString();

      let difficultyGuide = '';
      if (difficulty === 'easy') {
        difficultyGuide = 'Make these beginner-friendly with clear explanations and basic concepts. Focus on foundational knowledge that new learners need to understand.';
      } else if (difficulty === 'normal') {
        difficultyGuide = 'Include moderately challenging content appropriate for students with some background knowledge. Balance depth and accessibility.';
      } else if (difficulty === 'hard') {
        difficultyGuide = 'Create challenging, exam-style questions that test deeper understanding and application of concepts. Include advanced topics and complex relationships.';
      }

      const prompt = `Create 5 unique ${difficulty} difficulty flashcards about ${topicName || tutor} for studying.
      ${difficultyGuide}
      Each flashcard should have a thought-provoking question and comprehensive answer.
      Reference: ${uniqueId}-${timestamp}
      Format as JSON array with structure [{"id": 1, "question": "question text", "answer": "answer text"}].
      Only return the JSON array, no other text.`;

      console.log(`Using model ${tutorModel} for flashcard generation`);

      const response = await fetch('https://api.teachmetutor.academy/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          model: tutorModel,
          tutor
        }),
        timeout: 15000
      })

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      let parsedFlashcards;
      try {
        if (typeof data.response === 'string') {
          const jsonMatch = data.response.match(/\[\s*\{.*\}\s*\]/s);
          if (jsonMatch) {
            parsedFlashcards = JSON.parse(jsonMatch[0]);
          } else if (data.response.startsWith('[') && data.response.endsWith(']')) {
            parsedFlashcards = JSON.parse(data.response);
          } else {
            throw new Error("Couldn't extract JSON from response");
          }
        } else if (Array.isArray(data.response)) {
          parsedFlashcards = data.response;
        } else {
          throw new Error("Unexpected response format");
        }

        parsedFlashcards = parsedFlashcards.map((card, index) => ({
          id: card.id || index + 1,
          question: card.question,
          answer: card.answer,
          difficulty: difficulty,
          attempts: 0,
          correct: 0,
          lastResult: null
        }))

      } catch (parseError) {
        console.error('Error parsing flashcards:', parseError);

        let fallbackCards;
        if (tutor === 'biology' && topic === 'cells') {
          fallbackCards = getBiologyFlashcards(topic);
        } else {
          fallbackCards = getDefaultFlashcards(topicName, tutor);
        }

        fallbackCards = fallbackCards.map(card => {
          let modifiedQuestion = card.question;
          let modifiedAnswer = card.answer;

          if (difficulty === 'easy') {
            modifiedQuestion = `Basic concept: ${card.question}`;
            modifiedAnswer = `${card.answer} This is an important foundational concept to understand.`;
          } else if (difficulty === 'hard') {
            modifiedQuestion = `Advanced analysis: ${card.question} Explain the mechanisms and implications in detail.`;
            modifiedAnswer = `${card.answer} Consider how this concept connects to broader themes in ${topicName}.`;
          }

          return {
            ...card,
            question: modifiedQuestion,
            answer: modifiedAnswer,
            difficulty: difficulty,
            attempts: 0,
            correct: 0,
            lastResult: null
          }
        })

        parsedFlashcards = fallbackCards.sort(() => Math.random() - 0.5);
      }

      setShowRevisionOptions(false);
      setFlashcards(parsedFlashcards);
      setCurrentIndex(0);
      setSessionStats({
        cardsStudied: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        timeSpent: 0
      })
      setSessionStartTime(Date.now());
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setNetworkError(true);

      let difficulty = 'normal';
      try {
        const savedDifficulty = await AsyncStorage.getItem('questionDifficulty');
        if (savedDifficulty) {
          difficulty = savedDifficulty;
        }
      } catch (err) {
        console.log('Could not load difficulty setting on error:', err);
      }

      let fallbackCards;
      if (tutor === 'biology' && topic === 'cells') {
        fallbackCards = getBiologyFlashcards(topic);
      } else {
        fallbackCards = getDefaultFlashcards(topicName, tutor);
      }

      fallbackCards = fallbackCards.map(card => {
        let modifiedQuestion = card.question;
        let modifiedAnswer = card.answer;

        if (difficulty === 'easy') {
          modifiedQuestion = `Basic concept: ${card.question}`;
          modifiedAnswer = `${card.answer} This is a fundamental concept in ${topicName}.`;
        } else if (difficulty === 'hard') {
          modifiedQuestion = `Advanced topic: ${card.question} Provide detailed analysis.`;
          modifiedAnswer = `${card.answer} Consider the wider implications and applications.`;
        }

        return {
          ...card,
          question: modifiedQuestion,
          answer: modifiedAnswer,
          difficulty: difficulty,
          attempts: 0,
          correct: 0,
          lastResult: null
        }
      }).sort(() => Math.random() - 0.5);

      setFlashcards(fallbackCards);
      setShowRevisionOptions(false);
      setCurrentIndex(0);
      setSessionStats({
        cardsStudied: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        timeSpent: 0
      })
      setSessionStartTime(Date.now());
    } finally {
      setLoading(false);
    }
  }

  const saveSession = async () => {
    if (sessionStats.cardsStudied === 0 || !userId) return;

    try {
      const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);

      const cardsData = flashcards.map(card => {
        if (card.lastResult !== null) {
          return {
            cardId: card.id.toString(),
            question: card.question,
            answer: card.answer,
            subtopic: topic || 'general',
            difficulty: card.difficulty || 'normal',
            attempts: card.attempts || 0,
            correctAttempts: card.correct || 0
          }
        }
        return null;
      }).filter(Boolean);

      const sessionData = {
        cardsStudied: sessionStats.cardsStudied,
        correctAnswers: sessionStats.correctAnswers,
        timeSpent,
        subtopic: topic || 'general'
      }

      console.log("Saving flashcard performance:", {
        userId,
        tutor,
        topic: topicName || tutor,
        subtopic: topic || 'general',
        activityType: 'flashcard',
        sessionData,
        cardsData: cardsData.length
      })

      const response = await updatePerformanceData({
        userId,
        tutor,
        topic: topicName || tutor,
        subtopic: topic || 'general',
        activityType: 'flashcard',
        sessionData,
        sessions: [sessionData],
        cards: cardsData
      })

      if (response) {
        console.log("Flashcard session saved successfully, response:", response);
      } else {
        console.log("Flashcard session queued for saving");
      }

    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }

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
      )
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
    })
    setSessionStartTime(Date.now());
  }

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
  }

  const markCardResult = (isCorrect) => {
    if (!showAnswer) {
      Alert.alert("Reminder", "Please flip the card and view the answer before marking your result.");
      return;
    }

    const updatedFlashcards = [...flashcards];
    const currentCard = updatedFlashcards[currentIndex];

    currentCard.attempts += 1;
    if (isCorrect) {
      currentCard.correct += 1;
      currentCard.lastResult = true;
    } else {
      currentCard.lastResult = false;
    }

    setSessionStats(prev => ({
      ...prev,
      cardsStudied: prev.cardsStudied + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      incorrectAnswers: !isCorrect ? prev.incorrectAnswers + 1 : prev.incorrectAnswers
    }))

    setFlashcards(updatedFlashcards);

    if (showAnswer) {
      setShowAnswer(false);
      flipAnimation.setValue(0);
    }

    if (currentIndex === flashcards.length - 1) {
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
              })
            }
          }
        ]
      )
    } else {
      setCurrentIndex(prevIndex => prevIndex + 1);
    }
  }

  const nextCard = () => {
    if (showAnswer) {
      setShowAnswer(false);
      flipAnimation.setValue(0);
    }

    setCurrentIndex((prevIndex) =>
      prevIndex === flashcards.length - 1 ? 0 : prevIndex + 1
    )
  }

  const prevCard = () => {
    if (showAnswer) {
      setShowAnswer(false);
      flipAnimation.setValue(0);
    }

    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? flashcards.length - 1 : prevIndex - 1
    )
  }

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  })

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  }

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  }

  const viewProgress = () => {
    saveSession();
    navigation.navigate('FlashcardHistory', {
      tutor,
      topic: topic || 'general'
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FE7648" />
        <Text style={styles.loadingText}>
          {savedFlashcards.length > 0
            ? "Loading your flashcards..."
            : "Creating flashcards..."}
        </Text>
      </View>
    )
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

          {networkError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Network issue detected. You can still use flashcards in offline mode.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.optionButton}
            onPress={generateFlashcards}>
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
            disabled={savedFlashcards.length === 0}>
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
            onPress={viewProgress}>
            <Text style={styles.progressButtonText}>
              View Study Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>
              Back to Topics
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
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
          {flashcards[currentIndex]?.difficulty && (
            <View style={[
              styles.difficultyBadge,
              flashcards[currentIndex]?.difficulty === 'easy' ? styles.easyBadge :
              flashcards[currentIndex]?.difficulty === 'hard' ? styles.hardBadge :
              styles.normalBadge
            ]}>
              <Text style={styles.difficultyText}>
                {flashcards[currentIndex]?.difficulty === 'easy' ? 'Easy' :
                flashcards[currentIndex]?.difficulty === 'hard' ? 'Hard' :
                'Normal'}
              </Text>
            </View>
          )}
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
              onPress={() => markCardResult(false)}>
              <Text style={styles.ratingButtonText}>Didn't Know</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ratingButton, styles.correctButton]}
              onPress={() => markCardResult(true)}>
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
          }}>
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
    backgroundColor: '#FE7648',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#FF9B7A',
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
    color: '#FE7648',
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
    backgroundColor: '#FE7648',
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
    backgroundColor: '#FE7648',
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
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  difficultyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  easyBadge: {
    backgroundColor: '#FE7648',
  },
  normalBadge: {
    backgroundColor: '#2196F3',
  },
  hardBadge: {
    backgroundColor: '#F44336',
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});