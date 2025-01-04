import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl, Pressable, useColorScheme, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Avatar, TextInput, IconButton, Surface } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { DirectMessage } from '@/types/database';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender: {
    full_name: string;
    avatar_url: string;
  };
}

interface ChatPartner {
  id: string;
  full_name: string;
  avatar_url: string;
}

const MESSAGES_PER_PAGE = 20;

export default function DMChatScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  const themedStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    ownMessageBubble: {
      backgroundColor: Colors.primary,
    },
    otherMessageBubble: {
      backgroundColor: isDark ? '#2D2D2D' : '#E8E8E8',
    },
    ownMessageText: {
      color: '#FFFFFF',
    },
    ownTimestamp: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
  }), [colorScheme, theme]);

  const fetchMessages = async (fromDate?: string) => {
    if (!user || !id) return;

    try {
      let query = supabase
        .from('dm_messages')
        .select('*, sender:sender_id(full_name, avatar_url)')
        .eq('dm_id', id)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (fromDate) {
        query = query.lt('created_at', fromDate);
      }

      const { data: messagesData, error } = await query;

      if (error) throw error;

      if (messagesData) {
        if (fromDate) {
          setMessages(current => [...current, ...messagesData]);
        } else {
          setMessages(messagesData);
        }
        setHasMore(messagesData.length === MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;

    setLoadingMore(true);
    const lastMessage = messages[messages.length - 1];
    await fetchMessages(lastMessage.created_at);
    setLoadingMore(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [id, user]);

  useEffect(() => {
    if (!user || !id) return;

    const fetchChatData = async () => {
      setLoading(true);
      try {
        // Fetch chat partner's info
        const { data: dmData } = await supabase
          .from('direct_messages')
          .select('*, user1:user1_id(id, full_name, avatar_url), user2:user2_id(id, full_name, avatar_url)')
          .eq('id', id)
          .single();

        if (dmData) {
          const partner = dmData.user1_id === user.id ? dmData.user2 : dmData.user1;
          setChatPartner(partner);
        }

        await fetchMessages();
      } catch (error) {
        console.error('Error fetching chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();

    // Subscribe to new messages
    const subscription = supabase
      .channel('dm-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `dm_id=eq.${id}`,
      }, (payload) => {
        setMessages(current => [payload.new as Message, ...current]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, user]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const messageToSend = newMessage.trim();
      setNewMessage('');
      
      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          dm_id: id,
          sender_id: user?.id,
          message: messageToSend,
        })
        .select('*, sender:sender_id(full_name, avatar_url)')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      // Immediately update the UI with the new message
      setMessages(currentMessages => [data as Message, ...currentMessages]);
      
      // Scroll to the bottom
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const showAvatar = !isOwnMessage && 
      (index === messages.length - 1 || 
       messages[index + 1]?.sender_id !== item.sender_id);

    const isSameDay = index > 0 && 
      new Date(item.created_at).toDateString() === 
      new Date(messages[index - 1].created_at).toDateString();

    return (
      <View style={styles.messageWrapper}>
        {!isSameDay && (
          <View style={styles.dateHeader}>
            <ThemedText style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </ThemedText>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}>
          {showAvatar ? (
            item.sender?.avatar_url ? (
              <Avatar.Image
                size={32}
                source={{ uri: item.sender.avatar_url }}
                style={styles.messageAvatar}
              />
            ) : (
              <Avatar.Text
                size={32}
                label={item.sender?.full_name?.[0].toUpperCase() || '?'}
                style={styles.messageAvatar}
              />
            )
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <Surface style={[
            styles.messageBubble,
            isOwnMessage ? [styles.ownBubble, themedStyles.ownMessageBubble] : [styles.otherBubble, themedStyles.otherMessageBubble]
          ]}>
            <ThemedText style={[styles.messageText, isOwnMessage && themedStyles.ownMessageText]}>
              {item.message}
            </ThemedText>
            <ThemedText style={[styles.timestamp, isOwnMessage && themedStyles.ownTimestamp]}>
              {new Date(item.created_at).toLocaleTimeString([], { 
                hour: '2-digit',
                minute: '2-digit'
              })}
            </ThemedText>
          </Surface>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={themedStyles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: chatPartner?.full_name || '',
            headerTitleStyle: {
              color: theme.text
            },
            headerStyle: {
              backgroundColor: isDark ? '#000' : '#FFF'
            },
            headerLeft: () => (
              <IconButton
                icon="arrow-left"
                onPress={() => router.push('/chats')}
                iconColor={theme.text}
              />
            )
          }}
        />
        <Surface style={[styles.header, { backgroundColor: theme.background }]}>
          <View style={styles.headerContent}>
            <Pressable 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <IconSymbol name="chevron.left" size={28} color={theme.text} />
            </Pressable>
            <View style={styles.headerInfo}>
              {chatPartner?.avatar_url ? (
                <Avatar.Image
                  size={40}
                  source={{ uri: chatPartner.avatar_url }}
                  style={styles.headerAvatar}
                />
              ) : (
                <Avatar.Text
                  size={40}
                  label={chatPartner?.full_name?.[0].toUpperCase() || '?'}
                  style={styles.headerAvatar}
                />
              )}
              <View>
                <ThemedText style={[styles.headerName, { color: theme.text }]}>
                  {chatPartner?.full_name || 'Chat'}
                </ThemedText>
                <ThemedText style={styles.headerStatus}>
                  Online
                </ThemedText>
              </View>
            </View>
          </View>
        </Surface>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messagesList}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.tint}
              />
            }
            ListFooterComponent={loadingMore ? (
              <ActivityIndicator size="small" color={theme.tint} style={styles.loadingMore} />
            ) : null}
          />
          <Surface style={[styles.inputContainer, { 
            backgroundColor: theme.background,
            borderTopColor: isDark ? '#2A2A2A' : '#E5E7EB'
          }]}>
            <TextInput
              mode="outlined"
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
              onTouchMove={(e) => {
                const { pageY, locationY } = e.nativeEvent;
                if (pageY > locationY) {
                  Keyboard.dismiss();
                }
              }}
              style={[styles.input, { 
                backgroundColor: isDark ? '#1A1A1A' : '#F7F7F7'
              }]}
              outlineStyle={[styles.inputOutline, {
                borderColor: isDark ? '#2A2A2A' : '#E5E7EB'
              }]}
              contentStyle={[styles.inputContent, {
                color: theme.text
              }]}
              placeholderTextColor={isDark ? '#666' : '#999'}
              right={
                <TextInput.Icon
                  icon="send"
                  disabled={!newMessage.trim()}
                  onPress={sendMessage}
                  style={styles.sendButton}
                  color={newMessage.trim() ? Colors.primary : theme.icon}
                />
              }
            />
          </Surface>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 4,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
    marginLeft: 50,
  },
  otherMessage: {
    justifyContent: 'flex-start',
    marginRight: 50,
  },
  messageAvatar: {
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: 8,
  },
  messageBubble: {
    paddingTop: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    maxWidth: '100%',
    elevation: 1,
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  input: {
    maxHeight: 120,
    fontSize: 16,
  },
  inputOutline: {
    borderRadius: 24,
  },
  inputContent: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 48,
    textAlignVertical: 'center',
  },
  sendButton: {
    marginRight: 4,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    marginRight: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 14,
  },
  loadingMore: {
    paddingVertical: 16,
  },
});
