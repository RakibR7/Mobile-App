// screens/DynamicExerciseScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useUser } from '../context/UserContext';
import { updatePerformanceData, getPerformanceData } from '../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
          console.log(`Fetching previous questions for user: ${userId}, tutor: ${tutor}, topic: ${topicName || topic || 'any'}`);
          
          // Get performance data to extract previous questions
          // Don't filter by topic initially to see if we get any results
          const performanceData = await getPerformanceData(
            userId,
            tutor,
            null, // Don't filter by topic to get all questions
            'quiz'
          );

          console.log(`Retrieved ${performanceData?.length || 0} quiz sessions`);
          
          let previousQuestionsFound = [];

          if (Array.isArray(performanceData) && performanceData.length > 0) {
            // Extract questions from all previous quiz sessions
            performanceData.forEach(session => {
              console.log(`Session has ${session.cards?.length || 0} cards`);
              
              if (session.cards && Array.isArray(session.cards)) {
                session.cards.forEach(card => {
                  if (card.question) {
                    previousQuestionsFound.push({
                      id: card.cardId || `q_${previousQuestionsFound.length + 1}`,
                      question: card.question,
                      answer: card.answer || "" // This might be undefined for some cards
                    });
                  }
                });
              }
            });
          }

          console.log(`Extracted ${previousQuestionsFound.length} questions from performance data`);

          // If we found questions, remove duplicates
          if (previousQuestionsFound.length > 0) {
            // Remove duplicates by question text
            const uniqueQuestions = [];
            const questionTexts = new Set();

            previousQuestionsFound.forEach(q => {
              if (!questionTexts.has(q.question)) {
                questionTexts.add(q.question);
                uniqueQuestions.push(q);
              }
            });

            // If we found topics for this specific topic, use them
            // Otherwise, use all questions we found (better than nothing)
            setPreviousQuestions(uniqueQuestions);
            console.log(`Set ${uniqueQuestions.length} unique previous questions`);
          } else {
            // If no previous questions found, set empty array
            console.log('No previous questions found in performance data');
            setPreviousQuestions([]);
          }
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
      // Get the user's preferred difficulty level
      let difficulty = 'normal'; // Default
      try {
        const savedDifficulty = await AsyncStorage.getItem('questionDifficulty');
        if (savedDifficulty) {
          difficulty = savedDifficulty;
        }
      } catch (error) {
        console.log('Could not load difficulty setting:', error);
      }

      // Get the appropriate model based on tutor
      const tutorModel = {
        biology: 'ft:gpt-3.5-turbo-0125:personal:csp-biology-finetuning-data10-20000:BJN7IqeS',
        python: 'ft:gpt-3.5-turbo-0125:personal:dr1-csv6-shortened-3381:B0DlvD7p'
      }[tutor] || 'gpt-3.5-turbo';

      // Generate unique identifier for variety
      const uniqueId = Math.random().toString(36).substring(2, 8);

      // Create difficulty-specific guidance
      let difficultyGuide = '';
      if (difficulty === 'easy') {
        difficultyGuide = 'Create beginner-friendly questions that focus on basic concepts and definitions. Use simple language and provide clear context. These should help build foundational knowledge.';
      } else if (difficulty === 'normal') {
        difficultyGuide = 'Create moderately challenging questions that test understanding and application of concepts. Include some analytical thinking but maintain accessibility.';
      } else if (difficulty === 'hard') {
        difficultyGuide = 'Create challenging, exam-style questions that require deep understanding, critical thinking, and application of multiple concepts. These should prepare students for advanced assessments.';
      }

      const prompt = `Create 3 ${difficulty} difficulty practice questions about ${topicName} in ${tutor}.
      ${difficultyGuide}
      Make these questions unique and not generic textbook questions.
      ID: ${uniqueId}
      Format as JSON array with structure [{"id": 1, "question": "question text"}].
      Only return the JSON, no other text.`;

      console.log(`Using model ${tutorModel} for quiz generation with ${difficulty} difficulty`);

      const response = await fetch('https://api.teachmetutor.academy/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          model: tutorModel, // Use the subject-specific model
          tutor
        }),
        timeout: 15000
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      // Parse the AI response to extract the questions
      let parsedQuestions;
      try {
        // Try different parsing strategies
        if (typeof data.response === 'string') {
          const jsonMatch = data.response.match(/\[\s*\{.*\}\s*\]/s);
          if (jsonMatch) {
            parsedQuestions = JSON.parse(jsonMatch[0]);
          } else if (data.response.startsWith('[') && data.response.endsWith(']')) {
            parsedQuestions = JSON.parse(data.response);
          } else {
            throw new Error("Couldn't extract JSON from response");
          }
        } else if (Array.isArray(data.response)) {
          parsedQuestions = data.response;
        } else {
          throw new Error("Unexpected response format");
        }

        // Add difficulty property
        parsedQuestions = parsedQuestions.map((q, idx) => ({
          ...q,
          difficulty: difficulty
        }));
      } catch (parseError) {
        console.error('Error parsing questions:', parseError);

        // Use default questions as fallback, but adjust for difficulty
        let fallbackQuestions;
        if (tutor === 'biology' && topic === 'cells') {
          fallbackQuestions = getCellsQuestions();
        } else {
          fallbackQuestions = getDefaultQuestions(topicName, tutor);
        }

        // Modify questions based on difficulty
        fallbackQuestions = fallbackQuestions.map(q => {
          let modifiedQuestion = q.question;

          if (difficulty === 'easy') {
            modifiedQuestion = `[Beginner] ${q.question} Explain in simple terms.`;
          } else if (difficulty === 'normal') {
            modifiedQuestion = `[Intermediate] ${q.question} Provide a thorough explanation.`;
          } else if (difficulty === 'hard') {
            modifiedQuestion = `[Advanced] ${q.question} Analyze in depth and discuss broader implications.`;
          }

          return {
            ...q,
            question: modifiedQuestion,
            difficulty: difficulty
          };
        });

        // Randomize order
        parsedQuestions = fallbackQuestions.sort(() => Math.random() - 0.5);
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

      // Try to get the saved difficulty
      let difficulty = 'normal';
      try {
        const savedDifficulty = await AsyncStorage.getItem('questionDifficulty');
        if (savedDifficulty) {
          difficulty = savedDifficulty;
        }
      } catch (err) {
        console.log('Could not load difficulty setting on error:', err);
      }

      // Use default questions as fallback
      let fallbackQuestions;
      if (tutor === 'biology' && topic === 'cells') {
        fallbackQuestions = getCellsQuestions();
      } else {
        fallbackQuestions = getDefaultQuestions(topicName, tutor);
      }

      // Add difficulty-based modifications
      fallbackQuestions = fallbackQuestions.map(q => {
        let modifiedQuestion = q.question;

        // Modify question based on difficulty
        if (difficulty === 'easy') {
          modifiedQuestion = `[Beginner Level] ${q.question}`;
        } else if (difficulty === 'normal') {
          modifiedQuestion = `[Standard Level] ${q.question}`;
        } else if (difficulty === 'hard') {
          modifiedQuestion = `[Advanced Level] ${q.question}`;
        }

        return {
          ...q,
          question: modifiedQuestion,
          difficulty: difficulty
        };
      }).sort(() => Math.random() - 0.5);

      setQuestions(fallbackQuestions);
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
        cards: cardsData
      });

      console.log("Quiz session saved successfully");

    } catch (error) {
      console.error('Error saving session data:', error);
      // Don't show errors to user for this process
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
      const questionDifficulty = currentQuestion.difficulty || 'normal';

      // Get the appropriate model based on tutor
      const tutorModel = {
        biology: 'ft:gpt-3.5-turbo-0125:personal:csp-biology-finetuning-data10-20000:BJN7IqeS',
        python: 'ft:gpt-3.5-turbo-0125:personal:dr1-csv6-shortened-3381:B0DlvD7p'
      }[tutor] || 'gpt-3.5-turbo';

      // Adjust feedback style based on difficulty
      let difficultyGuidance = '';
      if (questionDifficulty === 'easy') {
        difficultyGuidance = `This is a beginner-level question. Be encouraging and supportive in your feedback. Focus on clarifying basic concepts and providing simple explanations. Use friendly, accessible language.`;
      } else if (questionDifficulty === 'normal') {
        difficultyGuidance = `This is an intermediate-level question. Provide balanced feedback that acknowledges strengths and identifies areas for improvement. Include moderate detail in explanations.`;
      } else if (questionDifficulty === 'hard') {
        difficultyGuidance = `This is an advanced-level question. Provide thorough, detailed feedback with rigorous analysis. Point out nuances and deeper connections. Set high standards for accuracy and completeness.`;
      }

      // Send the question and answer to the AI for evaluation
      const prompt = `Question: "${currentQuestion.question}"\n\nStudent's answer: "${userAnswer}"\n\n${difficultyGuidance}\n\nEvaluate this answer for a ${tutor} student studying ${topicName}. Provide detailed feedback on the answer's correctness, completeness, and areas for improvement. Format your response as JSON: {"correct": true/false, "feedback": "your detailed feedback here"}`;

      const response = await fetch('https://api.teachmetutor.academy/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          model: tutorModel,
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
          feedback: `I couldn't properly analyze your answer. Here's some general guidance on this ${questionDifficulty} question: The question is asking about ${currentQuestion.question.split(' ').slice(0, 5).join(' ')}... When answering, focus on key concepts and provide specific examples. Try to be precise and thorough in your explanation.`
        };
      }

      // Add 'evaluated' flag to the feedback
      evaluation.evaluated = true;
      // Also add difficulty level
      evaluation.difficulty = questionDifficulty;

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

      // Get the current difficulty
      const questionDifficulty = questions[currentQuestionIndex].difficulty || 'normal';

      // Provide a fallback evaluation when the API call fails
      const fallbackEvaluation = {
        correct: false,
        feedback: `Unable to evaluate your answer at this time. For this ${questionDifficulty} level question, consider reviewing the key concepts related to ${topicName} and try again.`,
        evaluated: true,
        difficulty: questionDifficulty
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
        <ActivityIndicator size="large" color="#FE7648" />
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
        {currentQuestion?.difficulty && (
          <View style={[
            styles.difficultyBadge,
            currentQuestion.difficulty === 'easy' ? styles.easyBadge :
            currentQuestion.difficulty === 'hard' ? styles.hardBadge :
            styles.normalBadge
          ]}>
            <Text style={styles.difficultyText}>
              {currentQuestion.difficulty === 'easy' ? 'Easy' :
               currentQuestion.difficulty === 'hard' ? 'Hard' :
               'Normal'}
            </Text>
          </View>
        )}
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
            <ActivityIndicator size="small" color="#FE7648" />
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
    color: '#FE7648',
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
  difficultyBadge: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 10,
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
    borderColor: '#FE7648',
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
    backgroundColor: '#FE7648',
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
