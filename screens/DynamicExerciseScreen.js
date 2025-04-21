// screens/DynamicExerciseScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useUser } from '../context/UserContext';
import { updatePerformanceData } from '../services/apiService';

export default function DynamicExerciseScreen({ route, navigation }) {
  const { tutor, topic, topicName } = route.params;
  const { userId } = useUser();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    questionsAttempted: 0,
    correctAnswers: 0,
    timeSpent: 0
  });

  useEffect(() => {
    generateQuestions();
    setSessionStartTime(Date.now());

    // Cleanup function to save session data when leaving the screen
    return () => {
      saveSession();
    };
  }, []);

  // In DynamicExerciseScreen.js - Replace the saveSession function with this:
const saveSession = async () => {
  if (sessionStats.questionsAttempted === 0 || !userId) return;

  try {
    const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);

    // Prepare card data for each question with subtopic
    const cardsData = questions.map(question => {
      const questionId = String(question.id);
      const userAnswer = answers[questionId] || '';
      const fbk = feedback[questionId] || {};

      return {
        cardId: questionId,
        question: question.question,
        answer: userAnswer,
        subtopic: topic || 'general', // Use topic as subtopic
        attempts: fbk.evaluated ? 1 : 0,
        correctAttempts: fbk.correct ? 1 : 0
      };
    }).filter(card => card.attempts > 0);

    // Prepare session data
    const sessionData = {
      cardsStudied: sessionStats.questionsAttempted,
      correctAnswers: sessionStats.correctAnswers,
      timeSpent,
      subtopic: topic || 'general' // Use topic as subtopic
    };

    console.log("Saving quiz performance:", {
      userId,
      tutor,
      topic: topicName || tutor,
      subtopic: topic || 'general',
      activityType: 'quiz',
      sessionData,
      cardsData: cardsData.length
    });

    // Send data to server
    await updatePerformanceData({
      userId,
      tutor,
      topic: topicName || tutor,
      subtopic: topic || 'general',
      activityType: 'quiz',
      sessionData,
      cardsData
    });

    console.log("Quiz session saved successfully");

  } catch (error) {
    console.error('Error saving session data:', error);
  }
};

  const generateQuestions = async () => {
    setLoading(true);
    try {
      // Generate questions using your AI API
      const prompt = `Create 3 practice questions about ${topicName} in ${tutor}. Format as JSON array with the structure [{"id": 1, "question": "question text"}]. Only return the JSON, no other text.`;

      const response = await fetch('http://51.21.106.225:5000/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          model: 'gpt-3.5-turbo', // or your preferred model
          tutor
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();

      // Parse the AI response to extract the questions
      let parsedQuestions;
      try {
        // Sometimes AI might wrap the JSON in code blocks or other text
        const jsonMatch = data.response.match(/\[.*\]/s);
        if (jsonMatch) {
          parsedQuestions = JSON.parse(jsonMatch[0]);
        } else {
          parsedQuestions = JSON.parse(data.response);
        }
      } catch (parseError) {
        console.error('Error parsing questions:', parseError);
        // Fallback to some default questions if parsing fails
        parsedQuestions = [
          { id: 1, question: `What is the most important concept in ${topicName}?` },
          { id: 2, question: `Explain a key principle of ${topicName}.` },
          { id: 3, question: `How would you apply ${topicName} in a real-world scenario?` }
        ];
      }

      setQuestions(parsedQuestions);
    } catch (error) {
      console.error('Error generating questions:', error);
      Alert.alert('Error', 'Failed to generate questions. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (id, text) => {
    setAnswers({...answers, [id]: text});
  };

  const evaluateCurrentAnswer = async () => {
    if (!answers[questions[currentQuestionIndex].id] ||
        answers[questions[currentQuestionIndex].id].trim() === '') {
      Alert.alert('Input Required', 'Please provide an answer before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const currentQuestion = questions[currentQuestionIndex];
      const userAnswer = answers[currentQuestion.id];

      // Send the question and answer to the AI for evaluation
      const prompt = `Question: "${currentQuestion.question}"\n\nStudent's answer: "${userAnswer}"\n\nEvaluate this answer for a ${tutor} student studying ${topicName}. Provide detailed feedback on the answer's correctness, completeness, and areas for improvement. Format your response as JSON: {"correct": true/false, "feedback": "your detailed feedback here"}`;

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
        throw new Error('Failed to evaluate answer');
      }

      const data = await response.json();

      // Parse the AI response to extract the evaluation
      let evaluation;
      try {
        // Sometimes AI might wrap the JSON in code blocks or other text
        const jsonMatch = data.response.match(/\{.*\}/s);
        if (jsonMatch) {
          evaluation = JSON.parse(jsonMatch[0]);
        } else {
          evaluation = JSON.parse(data.response);
        }
      } catch (parseError) {
        console.error('Error parsing evaluation:', parseError);
        evaluation = {
          correct: false,
          feedback: "I couldn't properly analyze your answer. Please try again with more details."
        };
      }

      // Add 'evaluated' flag to the feedback
      evaluation.evaluated = true;

      // Update feedback state with the evaluation
      setFeedback({
        ...feedback,
        [currentQuestion.id]: evaluation
      });

      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        questionsAttempted: prev.questionsAttempted + 1,
        correctAnswers: evaluation.correct ? prev.correctAnswers + 1 : prev.correctAnswers
      }));

    } catch (error) {
      console.error('Error evaluating answer:', error);
      Alert.alert('Error', 'Failed to evaluate your answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered - show session summary
      const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);
      const minutes = Math.floor(timeSpent / 60);
      const seconds = timeSpent % 60;

      Alert.alert(
        'Quiz Complete',
        `You've completed all questions!\n\nScore: ${sessionStats.correctAnswers}/${sessionStats.questionsAttempted}\nTime: ${minutes}m ${seconds}s`,
        [
          {
            text: 'New Quiz',
            onPress: () => {
              saveSession();
              setAnswers({});
              setFeedback({});
              setCurrentQuestionIndex(0);
              setSessionStartTime(Date.now());
              setSessionStats({
                questionsAttempted: 0,
                correctAnswers: 0,
                timeSpent: 0
              });
              generateQuestions();
            }
          },
          {
            text: 'View Progress',
            onPress: () => {
              saveSession();
              navigation.navigate('QuizHistory', {
                tutor,
                topic: topic || topicName
              });
            }
          },
          {
            text: 'Done',
            onPress: () => {
              saveSession();
              navigation.goBack();
            },
            style: 'cancel'
          }
        ]
      );
    }
  };

  const viewProgress = () => {
    saveSession();
    navigation.navigate('QuizHistory', {
      tutor,
      topic: topic || topicName
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Generating questions...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentFeedback = feedback[currentQuestion?.id];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.topic}>{topicName}</Text>
        <Text style={styles.progress}>Question {currentQuestionIndex + 1} of {questions.length}</Text>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Quiz Progress:</Text>
          <Text style={styles.statsDetail}>
            Attempted: {sessionStats.questionsAttempted} | Correct: {sessionStats.correctAnswers}
          </Text>
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.question}>{currentQuestion?.question}</Text>

        <TextInput
          style={styles.answerInput}
          multiline
          placeholder="Your answer..."
          value={answers[currentQuestion?.id] || ""}
          onChangeText={(text) => handleAnswerChange(currentQuestion?.id, text)}
          editable={!currentFeedback}
        />

        {submitting && (
          <View style={styles.submittingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.submittingText}>Evaluating your answer...</Text>
          </View>
        )}

        {currentFeedback && (
          <View style={[
            styles.feedbackContainer,
            currentFeedback.correct ? styles.correctFeedback : styles.incorrectFeedback
          ]}>
            <Text style={styles.feedbackTitle}>
              {currentFeedback.correct ? "Good work!" : "Needs improvement"}
            </Text>
            <Text style={styles.feedbackText}>{currentFeedback.feedback}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {!currentFeedback ? (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={evaluateCurrentAnswer}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>Submit Answer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={moveToNextQuestion}
            >
              <Text style={styles.buttonText}>
                {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.progressButton}
          onPress={viewProgress}
        >
          <Text style={styles.progressButtonText}>View Quiz History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    marginBottom: 20,
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
  topic: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  progress: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
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
  questionContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  question: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 20,
    color: '#333',
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  submittingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  feedbackContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
  },
  correctFeedback: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  incorrectFeedback: {
    backgroundColor: '#fbe9e7',
    borderColor: '#ff5722',
    borderWidth: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 15,
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  progressButton: {
    marginTop: 10,
    backgroundColor: '#9C27B0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  progressButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  }
});