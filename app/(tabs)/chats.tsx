import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Animated, ListRenderItem, FlatListProps } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Divider, List, Searchbar, ActivityIndicator } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DirectMessage, GroupChat, Profile } from '@/types/database';
import { StatusBar } from 'expo-status-bar';

interface ChatListItem {
  id: string;
  type: 'dm' | 'gc';
  name: string;
  lastMessage?: string;
  timestamp?: string;
  avatar?: string;
  unread?: number;
  participants?: number;
  eventTitle?: string;
  eventDate?: string;
  location?: string;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<ChatListItem>);

export default function ChatsScreen() {
  const colorScheme = useColorScheme() || 'light';
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = new Animated.Value(0);

  const searchBarTranslate = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const fetchChats = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching chats for user:', user.id);

      // First, let's check what events the user has joined
      const { data: joinedEvents, error: eventError } = await supabase
        .from('event_participants')
        .select('event_id, events!inner(*)')
        .eq('user_id', user.id);

      console.log('Joined events:', joinedEvents);

      if (eventError) {
        console.error('Error fetching joined events:', eventError);
        throw eventError;
      }

      // Check for group chats for these events
      const eventIds = joinedEvents?.map(je => je.event_id) || [];
      console.log('Checking group chats for events:', eventIds);

      // Fetch both DMs and group chats in parallel
      const [groupChatsResult, dmChatsResult] = await Promise.all([
        // Fetch group chats
        supabase
          .from('group_chats')
          .select(`
            *,
            events!left(*),
            group_members!inner(user_id),
            group_messages(
              message,
              created_at,
              sender:sender_id(full_name)
            )
          `)
          .eq('group_members.user_id', user.id)
          .order('created_at', { ascending: false }),

        // Fetch DMs using the correct table names
        supabase
          .from('direct_messages')
          .select(`
            *,
            dm_messages(
              message,
              created_at,
              sender:profiles!sender_id(full_name)
            ),
            user1:profiles!direct_messages_user1_id_fkey(
              id,
              full_name,
              avatar_url
            ),
            user2:profiles!direct_messages_user2_id_fkey(
              id,
              full_name,
              avatar_url
            )
          `)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
      ]);

      const { data: groupChats, error: gcError } = groupChatsResult;
      const { data: dmChats, error: dmError } = dmChatsResult;

      if (gcError) {
        console.error('Error fetching group chats:', gcError);
        throw gcError;
      }

      if (dmError) {
        console.error('Error fetching DMs:', dmError);
        throw dmError;
      }

      // Transform group chats into ChatListItem format
      const gcItems: ChatListItem[] = (groupChats || []).map(gc => ({
        id: gc.id,
        type: 'gc',
        name: gc.events?.title || gc.name || 'Unnamed Event',
        lastMessage: gc.group_messages?.[0]?.message || 'No messages yet',
        timestamp: formatTimestamp(gc.group_messages?.[0]?.created_at || gc.created_at),
        participants: gc.group_members?.length || 0,
        eventTitle: gc.events?.title,
        eventDate: gc.events?.event_date ? formatTimestamp(gc.events.event_date) : undefined,
        location: gc.events?.location
      }));

      // Transform DMs into ChatListItem format
      const dmItems: ChatListItem[] = (dmChats || []).map(dm => ({
        id: dm.id,
        type: 'dm',
        name: (dm.user1_id === user.id ? dm.user2 : dm.user1)?.full_name || 'Unknown User',
        lastMessage: dm.dm_messages?.[0]?.message || 'No messages yet',
        timestamp: formatTimestamp(dm.dm_messages?.[0]?.created_at || dm.created_at),
        avatar: (dm.user1_id === user.id ? dm.user2 : dm.user1)?.avatar_url
      }));

      // Combine and sort all chats by timestamp
      setChats([...gcItems, ...dmItems].sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      }));
    } catch (error) {
      console.error('Error in fetchChats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChats().finally(() => setRefreshing(false));
  }, []);

  const renderItem: ListRenderItem<ChatListItem> = useCallback(({ item }) => {
    const isGroupChat = item.type === 'gc';
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.chatItem,
          pressed && { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }
        ]}
        onPress={() => router.push(`/chat/${item.type}/${item.id}` as any)}
      >
        <View style={styles.chatItemContent}>
          {item.avatar ? (
            <Avatar.Image
              size={50}
              source={{ uri: item.avatar }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={50}
              label={item.name.charAt(0).toUpperCase()}
              style={styles.avatar}
              color={Colors[colorScheme].text}
              theme={{ colors: { primary: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF' } }}
            />
          )}
          <View style={styles.chatDetails}>
            <View style={styles.chatHeader}>
              <ThemedText style={styles.chatName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText style={styles.timestamp}>
                {item.timestamp}
              </ThemedText>
            </View>
            {isGroupChat && item.eventTitle && (
              <ThemedText style={styles.eventInfo}>
                📅 {item.eventTitle} {item.eventDate && `• ${item.eventDate}`}
              </ThemedText>
            )}
            <View style={styles.messageRow}>
              <ThemedText style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage || 'No messages yet'}
              </ThemedText>
              {item.unread && item.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <ThemedText style={styles.unreadText}>
                    {item.unread}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, [colorScheme]);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const keyExtractor = useCallback((item: ChatListItem) => item.id, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: Colors[colorScheme].background }
    ]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Searchbar
        placeholder="Search chats..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      <AnimatedFlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors[colorScheme || 'light'].tint}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    justifyContent: 'center',
    marginTop: 88,
    marginHorizontal: 16,
    marginBottom: 25,
  },
  listContent: {
    paddingLeft: 5,
    paddingBottom: 7,
    paddingTop: 7,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#666',
  },
  chatItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  chatDetails: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  eventInfo: {
    fontSize: 14,
    color: '#666',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#FF69B4',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    marginHorizontal: 16,
  },
});
