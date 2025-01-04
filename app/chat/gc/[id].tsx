import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl, Pressable, useColorScheme, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Avatar, TextInput, IconButton, Surface } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
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

interface GroupInfo {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  avatar_url?: string | null;
  members: {
    user_id: string;
    joined_at: string;
    profile: {
      full_name: string;
      avatar_url?: string | null;
    };
  }[];
}

const MESSAGES_PER_PAGE = 20;

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
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
    if (!user || !chatId) return;

    try {
      let query = supabase
        .from('group_messages')
        .select('*, sender:sender_id(full_name, avatar_url)')
        .eq('group_id', chatId)
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
  }, [chatId, user]);

  useEffect(() => {
    if (!user || !chatId) return;

    const fetchGroupData = async () => {
      setLoading(true);
      try {
        // Fetch group info and members
        const { data: groupData, error: groupError } = await supabase
          .from('group_chats')
          .select(`
            *,
            members:group_members(
              user_id,
              joined_at,
              profile:user_id(
                full_name,
                avatar_url
              )
            )
          `)
          .eq('id', chatId)
          .single();

        if (groupError) throw groupError;

        if (groupData) {
          setGroupInfo(groupData);
        }

        await fetchMessages();
      } catch (error) {
        console.error('Error fetching group data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel(`group_chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${chatId}`,
        },
        async (payload) => {
          const { data: newMessage, error } = await supabase
            .from('group_messages')
            .select('*, sender:sender_id(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (!error && newMessage) {
            setMessages(current => [newMessage, ...current]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !chatId) return;

    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('group_messages')
        .insert([
          {
            group_id: chatId,
            sender_id: user.id,
            message: messageToSend,
          }
        ]);

      if (error) throw error;

      // Fetch latest messages after sending
      const { data: latestMessages, error: fetchError } = await supabase
        .from('group_messages')
        .select('*, sender:sender_id(full_name, avatar_url)')
        .eq('group_id', chatId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (fetchError) throw fetchError;

      if (latestMessages) {
        setMessages(latestMessages);
        // Scroll to bottom after update
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending/fetching message:', error);
      // Optionally show error to user
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
                label={item.sender?.full_name?.charAt(0).toUpperCase() || '?'}
                style={[styles.messageAvatar, { backgroundColor: '#007AFF' }]}
              />
            )
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage
          ]}>
            <View style={[
              styles.messageBubble,
              isOwnMessage ? [styles.ownBubble, themedStyles.ownMessageBubble] : [styles.otherBubble, themedStyles.otherMessageBubble]
            ]}>
              {!isOwnMessage && (
                <ThemedText style={{ fontSize: 12, marginBottom: 2, opacity: 0.7 }}>
                  {item.sender.full_name}
                </ThemedText>
              )}
              <ThemedText style={[
                styles.messageText,
                isOwnMessage && themedStyles.ownMessageText
              ]}>
                {item.message}
              </ThemedText>
              <ThemedText style={[
                styles.timestamp,
                isOwnMessage && themedStyles.ownTimestamp
              ]}>
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleBack = () => {
    router.push('/(tabs)/chats');
  };

  const handleInfo = () => {
    router.push({
      pathname: '/chat/gc/[id]',
      params: { id: chatId, view: 'info' }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={themedStyles.container}>
        <Surface style={[styles.header, { backgroundColor: theme.background }]}>
          <View style={styles.headerContent}>
            <IconButton
              icon="arrow-back"
              size={24}
              onPress={handleBack}
              style={styles.backButton}
            />
            <Pressable 
              style={styles.headerInfo}
              onPress={handleInfo}
            >
              <ThemedText style={styles.headerName}>
                {groupInfo?.name || 'Group Chat'}
              </ThemedText>
              <ThemedText style={styles.headerStatus}>
                {groupInfo?.members?.length || 0} members
              </ThemedText>
            </Pressable>
            <IconButton
              icon="information"
              size={24}
              onPress={handleInfo}
            />
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
            keyExtractor={item => item.id}
            inverted
            style={styles.messagesList}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator 
                  size="small" 
                  color={Colors.primary}
                  style={styles.loadingMore} 
                />
              ) : null
            }
          />
          <Surface 
            style={[
              styles.inputContainer,
              { backgroundColor: theme.background }
            ]} 
            elevation={4}
          >
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              style={[styles.input, { 
                backgroundColor: isDark ? '#1A1A1A' : '#F7F7F7'
              }]}
              contentStyle={[styles.inputContent, {
                color: theme.text
              }]}
              outlineStyle={[styles.inputOutline, {
                borderColor: isDark ? '#2A2A2A' : '#E5E7EB'
              }]}
              mode="outlined"
              multiline
              dense
              placeholderTextColor={isDark ? '#666' : '#999'}
              right={
                <TextInput.Icon
                  icon="send"
                  disabled={!newMessage.trim()}
                  onPress={handleSend}
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
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingMore: {
    paddingVertical: 16,
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
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  headerStatus: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
  },
  groupInfoHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
  },
  membersList: {
    flex: 1,
  },
  membersHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberName: {
    fontSize: 16,
    marginLeft: 8,
  },
});
