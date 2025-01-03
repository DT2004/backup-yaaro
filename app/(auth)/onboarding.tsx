import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Animated, { FadeInRight, FadeOutLeft, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import ConfettiCannon from 'react-native-confetti-cannon';

interface Question {
  id: number;
  question: string;
  type: "select" | "multi-select" | "text";
  options?: string[];
  maxSelect?: number;
  placeholder?: string;
  maxLength?: number;
  profileField?: string;
  note?: string;
  style?: string;
}

interface Answers {
  [key: string]: string | string[];
}

const questions: Question[] = [
  {
    id: 1,
    question: "What age group do you belong to?",
    type: "select",
    options: ["18-22", "22-27", "25-30", "27-32", "30-35", "32-37", "36-40", "40+"],
    style: "single-select"
  },
  {
    id: 2,
    question: "Pick your conversation starters",
    type: "multi-select",
    maxSelect: 2,
    note: "Select up to 2 options",
    options: [
      "IPL debates",
      "Startup culture",
      "Life & Philosophy",
      "Food recommendations",
      "Movie reviews",
      "Travel stories",
      "College memories",
      "Local events",
      "Tech & gaming"
    ]
  },
  {
    id: 3,
    question: "Your comfort food is...",
    type: "multi-select",
    maxSelect: 2,
    note: "Select up to 2 options",
    options: [
      "Street side vada pav",
      "Home style thali",
      "Biryani anytime",
      "Momos & more",
      "North/South India",
      "Italian",
      "Asian all the way"
    ]
  },
  {
    id: 4,
    question: "Your communication comfort zone?",
    type: "select",
    note: "We will use this to find people who speak your language",
    options: [
      "English",
      "Casual Hindi",
      "Mix of everything",
      "Regional Language Pro"
    ]
  },
  {
    id: 5,
    question: "Current Work Life?",
    type: "select",
    note: "Don't worry, this won't be displayed on your profile",
    options: [
      "Tech hustler",
      "Finance/Business",
      "Creative soul",
      "Healthcare",
      "Government/Education",
      "Student",
      "Other"
    ]
  },
  {
    id: 6,
    question: "What's your vibe?",
    note: "Don't worry, this won't be displayed on your profile",
    type: "multi-select",
    maxSelect: 2,
    options: [
      "Chai over coffee",
      "Street food explorer",
      "Cricket fanatic",
      "Bollywood buff",
      "Indie music lover",
      "Tech enthusiast",
      "Local foodie",
      "Night owl",
      "Deep discussions all the way"
    ]
  },
  {
    id: 7,
    question: "Your perfect weekend looks like...",
    note: "Don't worry, this won't be displayed on your profile",
    type: "multi-select",
    maxSelect: 2,
    options: [
      "Adventure trails",
      "Sunsets & long walks",
      "Café hopping & food trails",
      "Relaxed meetups",
      "Playing/watching sports",
      "Live shows/concerts",
      "Exploring books/art"
    ]
  },
  {
    id: 8,
    question: "Tell us what you love",
    type: "text",
    placeholder: "I love...",
    maxLength: 100,
    profileField: "loves",
    note: "This will be displayed on your profile"
  }
];

const { width, height } = Dimensions.get('window');

export default function Onboarding() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
      </View>
    );
  }

  const handleSelect = (option: string) => {
    const question = questions[currentQuestion];
    if (question.type === "select") {
      setAnswers({ ...answers, [question.id]: option });
    } else if (question.type === "multi-select") {
      const currentAnswers = (answers[question.id] || []) as string[];
      if (currentAnswers.includes(option)) {
        setAnswers({
          ...answers,
          [question.id]: currentAnswers.filter((item: string) => item !== option)
        });
      } else if (currentAnswers.length < (question.maxSelect || 1)) {
        setAnswers({
          ...answers,
          [question.id]: [...currentAnswers, option]
        });
      }
    } else if (question.type === "text") {
      setAnswers({ ...answers, [question.id]: option });
    }
  };

  const isOptionSelected = (option: string) => {
    const currentAnswers = answers[questions[currentQuestion].id];
    return Array.isArray(currentAnswers) 
      ? currentAnswers.includes(option)
      : currentAnswers === option;
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Save each answer to onboarding_answers table
          const answerPromises = questions.map(question => {
            const answer = answers[question.id];
            if (answer !== undefined) {
              return supabase
                .from('onboarding_answers')
                .insert({
                  user_id: user.id,
                  question_id: question.id,
                  question_type: question.type,
                  question_text: question.question,
                  answer: JSON.stringify(answer)
                });
            }
            return Promise.resolve();
          });

          const results = await Promise.all(answerPromises);
          const errors = results.filter(result => result && result.error);
          
          if (errors.length > 0) {
            throw new Error('Failed to save some answers');
          }

          setShowCelebration(true);
          
          // Wait for animations to finish before redirecting
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 3000);
        }
      } catch (error) {
        console.error('Error saving answers:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const currentQ = questions[currentQuestion];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {showCelebration && (
        <Animated.View 
          style={[StyleSheet.absoluteFill, styles.celebrationContainer]} 
          entering={FadeIn}
          exiting={FadeOut}
        >
          <ConfettiCannon
            ref={confettiRef}
            count={100}
            origin={{ x: -10, y: 0 }}
            autoStart={true}
            fadeOut={true}
            fallSpeed={3000}
            explosionSpeed={350}
            colors={['#8B5CF6', '#EC4899', '#3B82F6', '#10B981']}
          />
          <ConfettiCannon
            count={100}
            origin={{ x: width + 10, y: 0 }}
            autoStart={true}
            fadeOut={true}
            fallSpeed={3000}
            explosionSpeed={350}
            colors={['#8B5CF6', '#EC4899', '#3B82F6', '#10B981']}
          />
          <View style={styles.welcomeContainer}>
            <Animated.View 
              entering={ZoomIn} 
              style={styles.checkCircle}
            >
              <Text style={styles.checkmark}>✓</Text>
            </Animated.View>
            <Animated.Text 
              style={styles.welcomeText}
              entering={FadeIn.delay(500)}
            >
              Welcome to Yaaro!
            </Animated.Text>
            <Animated.Text 
              style={styles.subText}
              entering={FadeIn.delay(800)}
            >
              Let's meet some new people
            </Animated.Text>
          </View>
        </Animated.View>
      )}
      <View style={styles.progressContainer}>
        {questions.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBar,
              {
                backgroundColor: index <= currentQuestion ? '#8B5CF6' : '#4B5563',
                width: `${93 / questions.length}%`
              }
            ]}
          />
        ))}
      </View>
      <ScrollView style={styles.scrollView}>
        <Animated.View 
          entering={mounted ? FadeInRight.duration(200).springify() : undefined}
          exiting={FadeOutLeft.duration(200).springify()}
          key={currentQuestion}
          style={[styles.questionContainer, { position: 'relative' }]}
        >
          <Text style={styles.question}>{currentQ.question}</Text>
          {currentQ.note && (
            <Text style={styles.note}>{currentQ.note}</Text>
          )}
          
          {currentQ.type === "text" ? (
            <TextInput
              style={styles.textInput}
              placeholder={currentQ.placeholder}
              maxLength={currentQ.maxLength}
              value={(answers[currentQ.id] || '') as string}
              onChangeText={(text) => handleSelect(text)}
              multiline
            />
          ) : (
            <View style={styles.optionsContainer}>
              {currentQ.options?.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    isOptionSelected(option) && styles.selectedOption
                  ]}
                  onPress={() => handleSelect(option)}
                >
                  <Text style={[
                    styles.optionText,
                    isOptionSelected(option) && styles.selectedOptionText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
      {currentQuestion > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleBack}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, !answers[currentQ.id] && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!answers[currentQ.id]}
        >
          <Text style={styles.buttonText}>
            {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    position: 'relative',
  },
  questionContainer: {
    flex: 1,
    padding: 20,
    minHeight: '100%',
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a3a3a3',
    marginBottom: 20,
  },
  note: {
    fontSize: 16,
    color: '#a3a3a3',
    marginBottom: 20,
  },
  optionsContainer: {
    marginTop: 20,
  },
  option: {
    backgroundColor: '#2d2d2d',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  selectedOption: {
    backgroundColor: '#8B5CF6',
    borderColor: '#9333EA',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#4B5563',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 100,
    gap: 4
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  celebrationContainer: {
    position: 'absolute',
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmark: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    color: '#a3a3a3',
    fontSize: 18,
    textAlign: 'center',
  },
});
