// screens/DynamicExerciseScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useUser } from '../context/UserContext';
import { updatePerformanceData, getPerformanceData } from '../services/apiService';

// Default questions by topic
const getDefaultQuestions = (topic, tutor) => {
  return [
    {
      id: 1,
      question: `What is the most important concept in ${topic || tutor}?`
    },
    {
      id: 2,
      question: `Explain a key principle of ${topic || tutor}.`
    },
    {
      id: 3,
      question: `How would you apply ${topic || tutor} in a real-world scenario?`
    }
  ];
};

// Specific questions for biology cells topic
const getCellsQuestions = () => {
  return [
    {
      id: 1,
      question: "What are the primary components of the cell membrane and what functions do they serve?"
    },
    {
      id: 2,
      question: "Describe the structure and function of mitochondria in eukaryotic cells."
    },
    {
      id: 3,
      question: "Compare and contrast the structure and function of rough and smooth endoplasmic reticulum."
    }
  ];
};

export default function DynamicExerciseScreen({ route, navigation }) {
  const { tutor, topic, topicName } = route.params;
  const { userId } = useUser();

  const [questions, setQuestions] = useState([]);
  const [previousQuestions, setPreviousQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [showQuizOptions, setShowQuizOptions] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    questionsAttempted: 0,
    correctAnswers: 0,
    timeSpent: 0
  });

  useEffect(() => {
    // Fetch previous questions when component mounts
    fetchPreviousQuestions();
    setSessionStartTime(Date.now());

    // Cleanup function to save session data when leaving the screen
    return () => {
      if (!showQuizOptions && questions.length > 0 && sessionStats.questionsAttempted > 0) {
        saveSession();
      }
    };
  }, []);

  const fetchPreviousQuestions = async () => {
    try {
      setLoading(true);
      setNetworkError(false);

      if (userId) {
        try {
          // Get performance data to extract previous questions
          const performanceData = await getPerformanceData(
            userId,
            tutor,
            topicName || tutor,
            'quiz'
          );

          let previousQuestionsFound = [];

          if (Array.isArray(performanceData) && performanceData.length > 0) {
            // Extract questions from all previous quiz sessions
            performanceData.forEach(session => {
              if (session.cards && Array.isArray(session.cards)) {
                session.cards.forEach(card => {
                  // Only include cards for this specific topic if specified
                  if ((!topic || card.subtopic === topic) && card.question) {
                    previousQuestionsFound.push({
                      id: card.cardId || previousQuestionsFound.length + 1,
                      question: card.question,
                      answer: card.answer // This might be undefined for some cards
                    });
                  }
                });
              }
            });
          }

          // Remove duplicates by question text
          const uniqueQuestions = [];
          const questionTexts = new Set();

          previousQuestionsFound.forEach(q => {
            if (!questionTexts.has(q.question)) {
              questionTexts.add(q.question);
              uniqueQuestions.push(q);
            }
          });

          setPreviousQuestions(uniqueQuestions);
        } catch (error) {
          console.error('Error fetching previous questions:', error);
          setPreviousQuestions([]);
        }
      }
    } catch (error) {
      console.error('Error in fetchPreviousQuestions:', error);
      setPreviousQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = async () => {
    setLoading(true);
    setNetworkError(false);

    try {
      // Generate questions using your AI API
      const prompt = `Create 3 practice questions about ${topicName} in ${tutor}. Format as JSON array with the structure [{"id": 1, "question": "question text"}]. Only return the JSON, no other text.`;

      const response = await fetch('http://51.21.106.225:5000/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          model: 'gpt-3.5-turbo',
          tutor
        }),
        timeout: 10000 // Add timeout to prevent long-hanging requests
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      // Parse the AI response to extract the questions
      let parsedQuestions;
      try {
        // Try different parsing strategies to handle various API response formats
        if (typeof data.response === 'string') {
          // Look for a JSON array in the response
          const jsonMatch = data.response.match(/\[\s*\{.*\}\s*\]/s);
          if (jsonMatch) {
            parsedQuestions = JSON.parse(jsonMatch[0]);
          } else if (data.response.startsWith('[') && data.response.endsWith(']')) {
            // Try direct parsing if it looks like JSON
            parsedQuestions = JSON.parse(data.response);
          } else {
            // If we can't find JSON, fall back to default questions
            throw new Error("Couldn't extract JSON from response");
          }
        } else if (Array.isArray(data.response)) {
          // Response is already an array
          parsedQuestions = data.response;
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (parseError) {
        console.error('Error parsing questions:', parseError);
        // Use topic-specific questions when available
        if (tutor === 'biology' && topic === 'cells') {
          parsedQuestions = getCellsQuestions();
        } else {
          parsedQuestions = getDefaultQuestions(topicName, tutor);
        }
      }

      setShowQuizOptions(false);
      setQuestions(parsedQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setFeedback({});
      setSessionStats({
        questionsAttempted: 0,
        correctAnswers: 0,
        timeSpent: 0
      });
      setSessionStartTime(Date.now());
    } catch (error) {
      console.error('Error generating questions:', error);
      setNetworkError(true);

      // Even with network errors, provide default questions
      if (tutor === 'biology' && topic === 'cells') {
        setQuestions(getCellsQuestions());
      } else {
        setQuestions(getDefaultQuestions(topicName, tutor));
      }

      setShowQuizOptions(false);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setFeedback({});
      setSessionStats({
        questionsAttempted: 0,
        correctAnswers: 0,
        timeSpent: 0
      });
      setSessionStartTime(Date.now());
    } finally {
      setLoading(false);
    }
  };

  const startRevision = () => {
    if (previousQuestions.length === 0) {
      Alert.alert(
        'No Previous Questions',
        'You haven\'t completed any quizzes on this topic yet. Would you like to generate new questions?',
        [
          {
            text: 'Generate New Questions',
            onPress: generateQuestions
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
      return;
    }

    setShowQuizOptions(false);
    setQuestions(previousQuestions);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFeedback({});
    setSessionStats({
      questionsAttempted: 0,
      correctAnswers: 0,
      timeSpent: 0
    });
    setSessionStartTime(Date.now());
  };

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
        }),
        timeout: 15000 // Longer timeout for evaluation responses
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      // Parse the AI response to extract the evaluation
      let evaluation;
      try {
        // Try different parsing strategies
        if (typeof data.response === 'string') {
          const jsonMatch = data.response.match(/\{.*\}/s);
          if (jsonMatch) {
            evaluation = JSON.parse(jsonMatch[0]);
          } else if (data.response.startsWith('{') && data.response.endsWith('}')) {
            evaluation = JSON.parse(data.response);
          } else {
            throw new Error("Couldn't extract JSON from response");
          }
        } else if (typeof data.response === 'object') {
          evaluation = data.response;
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (parseError) {
        console.error('Error parsing evaluation:', parseError);
        // Provide a basic evaluation when parsing fails
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

      // Provide a fallback evaluation when the API call fails
      const fallbackEvaluation = {
        correct: false,
        feedback: "Unable to evaluate your answer due to a connection issue. Please check your network connection and try again.",
        evaluated: true
      };

      setFeedback({
        ...feedback,
        [questions[currentQuestionIndex].id]: fallbackEvaluation
      });

      // Still count the question as attempted
      setSessionStats(prev => ({
        ...prev,
        questionsAttempted: prev.questionsAttempted + 1
      }));
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
              setShowQuizOptions(true);
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
    if (!showQuizOptions && sessionStats.questionsAttempted > 0) {
      saveSession();
    }
    navigation.navigate('QuizHistory', {
      tutor,
      topic: topic || topicName
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>
          {showQuizOptions ? "Loading quiz options..." : "Generating questions..."}
        </Text>
      </View>
    );
  }

  if (showQuizOptions) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.optionsContainer}>
          <Text style={styles.title}>
            {topicName || tutor} Quiz
          </Text>

          <Text style={styles.subtitle}>
            Choose your quiz mode:
          </Text>

          {networkError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Network issue detected. You can still use quizzes in offline mode.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.optionButton}
            onPress={generateQuestions}
          >
            <Text style={styles.optionButtonText}>New Questions</Text>
            <Text style={styles.optionDescription}>
              Generate a new set of questions on this topic
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              previousQuestions.length === 0 ? styles.disabledButton : null
            ]}
            onPress={startRevision}
            disabled={previousQuestions.length === 0}
          >
            <Text style={styles.optionButtonText}>
              Review Previous Questions
            </Text>
            <Text style={styles.optionDescription}>
              {previousQuestions.length > 0
                ? `Practice with ${previousQuestions.length} questions you've already tried`
                : "You haven't completed any quizzes on this topic yet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressButton}
            onPress={viewProgress}
          >
            <Text style={styles.progressButtonText}>
              View Quiz History
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
          style={styles.optionsButton}
          onPress={() => {
            if (sessionStats.questionsAttempted > 0) {
              Alert.alert(
                'Return to Quiz Options?',
                'Your current progress will be saved. Do you want to continue?',
                [
                  {
                    text: 'Yes, Save & Return',
                    onPress: () => {
                      saveSession();
                      setShowQuizOptions(true);
                    }
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  }
                ]
              );
            } else {
              setShowQuizOptions(true);
            }
          }}
        >
          <Text style={styles.optionsButtonText}>Quiz Options</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    padding: 20,
    paddingBottom: 10,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
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
    margin: 20,
    marginTop: 0,
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
  optionsButton: {
    backgroundColor: '#9C27B0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  optionsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  }
});