import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';

export default function ExerciseScreen({ route, navigation }) {
  const { tutor, exerciseType } = route.params;
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const getExercises = () => {
    if (tutor === 'biology') {
      return [
        { id: 1, question: "What are the four nucleotide bases in DNA?", answer: "adenine, guanine, cytosine, thymine" },
        { id: 2, question: "What is the powerhouse of the cell?", answer: "mitochondria" },
        { id: 3, question: "What process do plants use to make their own food?", answer: "photosynthesis" }
      ];
    } else if (tutor === 'python') {
      return [
        { id: 1, question: "Write a Python function to add two numbers", answer: "def add(a, b):\n    return a + b" },
        { id: 2, question: "How do you create a list in Python?", answer: "my_list = []" },
        { id: 3, question: "What Python keyword is used to define a function?", answer: "def" }
      ];
    }
    return [];
  };

  const exercises = getExercises();

  const handleAnswerChange = (id, text) => {
    setAnswers({...answers, [id]: text});
  };

  const evaluateAnswers = () => {
    const results = {};
    exercises.forEach(ex => {
      const userAnswer = (answers[ex.id] || "").toLowerCase().trim();
      const correctAnswer = ex.answer.toLowerCase();

      if (userAnswer === correctAnswer || correctAnswer.includes(userAnswer)) {
        results[ex.id] = { correct: true, feedback: "Correct!" };
      } else {
        results[ex.id] = {
          correct: false,
          feedback: "Not quite. The correct answer is: " + ex.answer
        };
      }
    });

    setFeedback(results);
    setSubmitted(true);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{tutor.charAt(0).toUpperCase() + tutor.slice(1)} Practice Exercises</Text>

      {exercises.map(ex => (
        <View key={ex.id} style={styles.exerciseItem}>
          <Text style={styles.question}>{ex.id}. {ex.question}</Text>
          <TextInput
            style={styles.answerInput}
            multiline
            placeholder="Your answer..."
            value={answers[ex.id] || ""}
            onChangeText={(text) => handleAnswerChange(ex.id, text)}
            editable={!submitted}
          />

          {submitted && (
            <View style={[
              styles.feedbackContainer,
              feedback[ex.id]?.correct ? styles.correctFeedback : styles.incorrectFeedback
            ]}>
              <Text style={styles.feedbackText}>
                {feedback[ex.id]?.feedback}
              </Text>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitButton, submitted && styles.resetButton]}
        onPress={submitted ? () => {
          setSubmitted(false);
          setFeedback({});
        } : evaluateAnswers}
      >
        <Text style={styles.buttonText}>
          {submitted ? "Try Again" : "Submit Answers"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  exerciseItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    minHeight: 50,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  feedbackContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
  },
  correctFeedback: {
    backgroundColor: '#e6f7e6',
    borderColor: '#FE7648',
    borderWidth: 1,
  },
  incorrectFeedback: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#FE7648',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  resetButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});