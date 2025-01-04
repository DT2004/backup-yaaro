import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar, Card, Button, Portal, Modal, TextInput } from 'react-native-paper';
import { supabase } from '@/lib/supabase';

import { ThemedText } from '@/components/ThemedText';
import { Profile } from '@/types/database';
import { useProfile } from '@/contexts/ProfileContext';
import { Colors } from '@/constants/Colors';
import { black } from 'react-native-paper/lib/typescript/styles/themes/v2/colors';

interface EditModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  value: string | string[];
  onSave: (value: string | string[]) => void;
  type: 'text' | 'select' | 'multi-select';
  options?: string[];
  maxSelect?: number;
}

function EditModal({ visible, onDismiss, title, value, onSave, type, options = [], maxSelect = 1 }: EditModalProps) {
  const [editValue, setEditValue] = useState<string | string[]>(value);

  const handleSave = () => {
    onSave(editValue);
    onDismiss();
  };

  const toggleOption = (option: string) => {
    if (type === 'select') {
      setEditValue(option);
    } else if (type === 'multi-select') {
      const currentValue = Array.isArray(editValue) ? editValue : [];
      if (currentValue.includes(option)) {
        setEditValue(currentValue.filter(v => v !== option));
      } else if (currentValue.length < maxSelect) {
        setEditValue([...currentValue, option]);
      }
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <ThemedText style={styles.modalTitle}>{title}</ThemedText>
        {type === 'text' ? (
          <TextInput
            value={editValue as string}
            onChangeText={(text) => setEditValue(text)}
            style={styles.modalInput}
          />
        ) : (
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  Array.isArray(editValue) && editValue.includes(option) && styles.selectedOption
                ]}
                onPress={() => toggleOption(option)}
              >
                <ThemedText style={[
                  styles.optionText,
                  Array.isArray(editValue) && editValue.includes(option) && styles.selectedOptionText
                ]}>
                  {option}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.modalActions}>
          <Button 
            onPress={onDismiss} 
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonLabel}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSave}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
          >
            Save
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

interface ProfileSection {
  title: string;
  value: string | string[];
  type: 'text' | 'select' | 'multi-select';
  options?: string[];
  maxSelect?: number;
  editable?: boolean;
}

export default function ProfileScreen() {
  const { profile } = useProfile();
  const [editingSection, setEditingSection] = useState<ProfileSection | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<any>({});
  const [eventCount, setEventCount] = useState<number>(0);

  React.useEffect(() => {
    if (profile?.id) {
      fetchOnboardingAnswers();
      fetchEventCount();
    }
  }, [profile?.id]);

  const fetchOnboardingAnswers = async () => {
    const { data, error } = await supabase
      .from('onboarding_answers')
      .select('*')
      .eq('user_id', profile?.id);

    if (data) {
      const answers: any = {};
      data.forEach(answer => {
        try {
          // Parse the JSONB answer field if it's a string
          let parsedAnswer = answer.answer;
          if (typeof answer.answer === 'string') {
            try {
              parsedAnswer = JSON.parse(answer.answer);
            } catch (e) {
              console.error('Failed to parse answer:', answer.answer);
              parsedAnswer = answer.answer;
            }
          }
          
          console.log('Question ID:', answer.question_id, 'Raw Answer:', answer.answer, 'Parsed Answer:', parsedAnswer);
          
          // For multi-select questions, ensure we have an array
          if ([2, 3].includes(answer.question_id)) {
            answers[answer.question_id] = Array.isArray(parsedAnswer) 
              ? parsedAnswer 
              : parsedAnswer 
                ? [parsedAnswer] 
                : [];
          } else {
            answers[answer.question_id] = parsedAnswer;
          }
        } catch (e) {
          console.error('Error processing answer:', e, 'Raw answer:', answer.answer);
          answers[answer.question_id] = answer.answer;
        }
      });
      console.log('Final processed answers:', answers);
      setOnboardingAnswers(answers);
    }
  };

  const fetchEventCount = async () => {
    const { data, error } = await supabase
      .from('event_participants')
      .select('id', { count: 'exact' })
      .eq('user_id', profile?.id);

    if (data) {
      setEventCount(data.length);
    }
  };

  const handleSaveSection = async (value: string | string[]) => {
    if (!editingSection || !profile) return;

    const questionId = parseInt(editingSection.title.split('-')[0]);
    
    // Convert the value to a JSON string for storage
    const jsonValue = JSON.stringify(value);

    const { error } = await supabase
      .from('onboarding_answers')
      .update({ answer: jsonValue })
      .eq('user_id', profile.id)
      .eq('question_id', questionId);

    if (!error) {
      setOnboardingAnswers(prev => ({
        ...prev,
        [questionId]: value
      }));
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <ThemedText>Loading profile...</ThemedText>
      </View>
    );
  }

  const profileSections: ProfileSection[] = [
    {
      title: "1-Age Group",
      value: onboardingAnswers[1] || "Not specified",
      type: "select",
      options: ["18-22", "22-27", "25-30", "27-32", "30-35", "32-37", "36-40", "40+"],
      editable: true
    },
    {
      title: "2-Conversation Starters",
      value: Array.isArray(onboardingAnswers[2]) 
        ? onboardingAnswers[2] 
        : typeof onboardingAnswers[2] === 'string'
          ? JSON.parse(onboardingAnswers[2])
          : [],
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
      ],
      editable: true
    },
    {
      title: "3-Comfort Food",
      value: Array.isArray(onboardingAnswers[3])
        ? onboardingAnswers[3]
        : typeof onboardingAnswers[3] === 'string'
          ? JSON.parse(onboardingAnswers[3])
          : [],
      type: "multi-select",
      maxSelect: 2,
      options: [
        "Street side vada pav",
        "Home style thali",
        "Biryani anytime",
        "Momos & more",
        "North/South India",
        "Italian",
        "Asian all the way"
      ],
      editable: true
    },
    {
      title: "4-Communication Style",
      value: onboardingAnswers[4] || "Not specified",
      type: "select",
      options: [
        "English",
        "Casual Hindi",
        "Mix of everything",
        "Regional Language Pro"
      ],
      editable: true
    },
    {
      title: "8-Things I Love",
      value: onboardingAnswers[8] || "Not specified",
      type: "text",
      editable: true
    }
  ];

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.coverImageContainer}>
            <View style={styles.coverImage} />
          </View>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Avatar.Image
                size={100}
                source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
                style={[
                  !profile.avatar_url && styles.defaultAvatar,
                  styles.avatarImage
                ]}
              />
            </View>
            <View style={styles.nameContainer}>
              <ThemedText style={styles.name}>{profile.full_name || 'Anonymous'}</ThemedText>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNumber}>{eventCount}</ThemedText>
                  <ThemedText style={styles.statLabel}>Events</ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNumber}>0</ThemedText>
                  <ThemedText style={styles.statLabel}>Friends</ThemedText>
                </View>
              </View>
            </View>
          </View>

          <Card.Content style={styles.contentContainer}>
            {profileSections.map((section) => (
              <View key={section.title} style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>
                    {section.title.split('-')[1]}
                  </ThemedText>
                  {section.editable && (
                    <Button
                      mode="text"
                      compact
                      onPress={() => setEditingSection(section)}
                    >
                      Edit
                    </Button>
                  )}
                </View>
                <View style={styles.sectionContent}>
                  {Array.isArray(section.value) ? (
                    section.value.length > 0 ? (
                      <View style={styles.tagsContainer}>
                        {section.value.map((item, i) => (
                          <View key={i} style={styles.tag}>
                            <ThemedText style={styles.tagText}>{item}</ThemedText>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <ThemedText style={styles.sectionValue}>Not specified</ThemedText>
                    )
                  ) : (
                    <ThemedText style={styles.sectionValue}>{section.value}</ThemedText>
                  )}
                </View>
              </View>
            ))}
          </Card.Content>
        </View>
      </Card>

      {editingSection && (
        <EditModal
          visible={true}
          onDismiss={() => setEditingSection(null)}
          title={`Edit ${editingSection.title.split('-')[1]}`}
          value={editingSection.value}
          onSave={handleSaveSection}
          type={editingSection.type}
          options={editingSection.options}
          maxSelect={editingSection.maxSelect}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginTop: 90,
    marginBottom: 16,
    borderRadius: 12,
  },
  cardContent: {
    overflow: 'hidden',
  },
  coverImageContainer: {
    width: '100%',
    height: 150,
  },
  coverImage: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: 120,
    width: '100%',
    backgroundColor: Colors.primary,
  },
  profileSection: {
    marginTop: -50,
    padding: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarImage: {
    borderWidth: 4,
    borderColor: 'white',
  },
  nameContainer: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  contentContainer: {
    paddingTop: 8,
  },
  defaultAvatar: {
    backgroundColor: Colors.primary,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  sectionContent: {
    marginTop: 4,
  },
  sectionValue: {
    fontSize: 15,
    opacity: 0.8,
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  tagText: {
    fontSize: 14,
    color: '#fff',
  },
  modalContainer: {
    backgroundColor: Colors.light.background,
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.light.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: Colors.light.text,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    marginLeft: 12,
    color: '#000000',
  },
  selectedOptionText: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  selectedOption: {
    backgroundColor: Colors.primary,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
  },
  saveButtonLabel: {
    color: '#ffffff',
  },
  cancelButton: {
    marginTop: 8,
  },
  cancelButtonLabel: {
    color: Colors.primary,
  },
});
