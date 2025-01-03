import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

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
    question: "Current Work Life?",
    type: "select",
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
    id: 4,
    question: "What's your vibe?",
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
    id: 5,
    question: "Your perfect weekend looks like...",
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
    id: 6,
    question: "Tell us what you love",
    type: "text",
    placeholder: "I love...",
    maxLength: 100,
    profileField: "loves",
    note: "This will be displayed on your profile"
  }
];

export default function Onboarding() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);

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
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              age_group: answers["1"],
              conversation_starters: answers["2"],
              work_life: answers["3"],
              vibe: answers["4"],
              weekend_preferences: answers["5"],
              loves: answers["6"],
              quiz_complete: true
            });

          if (error) throw error;
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Error saving profile:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const currentQ = questions[currentQuestion];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
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
          entering={FadeInRight.duration(300)}
          exiting={FadeOutLeft.duration(300)}
          key={currentQuestion}
          style={[styles.questionContainer, { position: 'relative' }]}
        >
          <Text style={styles.question}>{currentQ.question}</Text>
          <Text style={styles.subtitle}>Dont worry, This wont appear on your profile</Text>
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
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
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
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 20,
    fontStyle: 'italic',
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
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
  },
  nextButton: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
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
});
