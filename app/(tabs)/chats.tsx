import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Divider, List, Searchbar } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DirectMessage, GroupChat, Profile } from '@/types/database';

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

export default function ChatsScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchChats = async () => {
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

        console.log('Group chats found:', groupChats);
        console.log('DM chats found:', dmChats);

        // Check for missing group chats
        const groupChatEventIds = new Set(groupChats?.map(gc => gc.event_id) || []);
        const missingEventIds = eventIds.filter(id => !groupChatEventIds.has(id));
        if (missingEventIds.length > 0) {
          console.log('Missing group chats for events:', missingEventIds);
          // Retry after a delay if there are missing chats
          setTimeout(fetchChats, 1000);
        }

        // Transform group chats into ChatListItem format
        const gcItems: ChatListItem[] = (groupChats || []).map(gc => {
          console.log('Processing group chat:', gc);
          return {
            id: gc.id,
            type: 'gc',
            name: gc.events?.title || gc.name || 'Unnamed Event',
            lastMessage: gc.group_messages?.[0]?.message || 'No messages yet',
            timestamp: formatTimestamp(gc.group_messages?.[0]?.created_at || gc.created_at),
            participants: gc.group_members?.length || 0,
            eventTitle: gc.events?.title,
            eventDate: gc.events?.event_date ? formatTimestamp(gc.events.event_date) : undefined,
            location: gc.events?.location
          };
        });

        // Transform DMs into ChatListItem format
        const dmItems: ChatListItem[] = (dmChats || []).map(dm => {
          const otherUser = dm.user1_id === user.id ? dm.user2 : dm.user1;
          return {
            id: dm.id,
            type: 'dm',
            name: otherUser?.full_name || 'Unknown User',
            lastMessage: dm.dm_messages?.[0]?.message || 'No messages yet',
            timestamp: formatTimestamp(dm.dm_messages?.[0]?.created_at || dm.created_at),
            avatar: otherUser?.avatar_url
          };
        });

        console.log('Transformed group chat items:', gcItems);
        console.log('Transformed DM items:', dmItems);

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

    // Set up real-time subscriptions
    const setupSubscriptions = async () => {
      try {
        const channel = supabase.channel('chat-changes')
          // Listen for event participant changes (joining/leaving events)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'event_participants',
            filter: `user_id=eq.${user.id}`
          }, () => {
            console.log('Event participation changed, fetching...');
            fetchChats();
          })
          // Listen for group chat changes
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'group_chats'
          }, () => {
            console.log('Group chat changed, fetching...');
            fetchChats();
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'group_members',
            filter: `user_id=eq.${user.id}`
          }, () => {
            console.log('Group membership changed, fetching...');
            fetchChats();
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'group_messages'
          }, () => {
            console.log('New group message received, fetching...');
            fetchChats();
          })
          // Listen for DM changes
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'direct_messages',
            filter: `or(user1_id.eq.${user.id},user2_id.eq.${user.id})`
          }, () => {
            console.log('DM chat changed, fetching...');
            fetchChats();
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'dm_messages'
          }, () => {
            console.log('New DM message received, fetching...');
            fetchChats();
          })
          // Listen for database notifications
          .on('presence', { event: 'sync' }, () => {
            console.log('Realtime subscription synchronized');
          })
          .on('presence', { event: 'join' }, ({ key }) => {
            console.log('Joined presence:', key);
          })
          .on('broadcast', { event: 'new_group_chat' }, (payload) => {
            console.log('New group chat created:', payload);
            fetchChats();
          })
          .on('broadcast', { event: 'group_member_added' }, (payload) => {
            console.log('Added to group chat:', payload);
            fetchChats();
          });

        const status = await channel.subscribe(async (status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            await fetchChats();
          }
        });

        console.log('Subscription status:', status);
        return channel;
      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        // Retry subscription setup after a delay
        setTimeout(setupSubscriptions, 2000);
      }
    };

    // Initial fetch
    fetchChats();

    // Set up subscriptions
    let channel: RealtimeChannel;
    setupSubscriptions().then(ch => {
      channel = ch;
    });

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user]);

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

  const handleChatPress = (chat: ChatListItem) => {
    if (chat.type === 'dm') {
      router.push({
        pathname: '/chat/dm/[id]',
        params: { id: chat.id }
      });
    } else {
      router.push({
        pathname: '/chat/gc/[id]',
        params: { id: chat.id }
      });
    }
  };

  const filteredChats = useMemo(() => 
    chats.filter(chat => 
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [chats, searchQuery]
  );

  const renderChatItem = ({ item }: { item: ChatListItem }) => {
    // Get the background color based on color scheme
    const backgroundColor = Colors[colorScheme ?? 'light'].tint;
    
    return (
      <Pressable onPress={() => handleChatPress(item)}>
        <List.Item
          title={item.name}
          description={
            item.type === 'gc' ? (
              <View>
                <ThemedText style={styles.eventInfo}>
                  {item.location} • {item.eventDate}
                </ThemedText>
                <ThemedText style={styles.lastMessage}>
                  {item.lastMessage || 'No messages yet'}
                </ThemedText>
              </View>
            ) : (
              item.lastMessage || 'No messages yet'
            )
          }
          left={() => (
            item.avatar ? (
              <Avatar.Image
                size={50}
                source={{ uri: item.avatar }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Icon
                size={50}
                icon={item.type === 'gc' ? 'account-group' : 'account'}
                style={[styles.avatar, { backgroundColor }]}
              />
            )
          )}
          right={() => (
            <View style={styles.rightContent}>
              <ThemedText style={styles.timestamp}>{item.timestamp}</ThemedText>
              {item.unread && (
                <View style={styles.unreadBadge}>
                  <ThemedText style={styles.unreadText}>{item.unread}</ThemedText>
                </View>
              )}
              {item.type === 'gc' && (
                <ThemedText style={styles.participantsText}>
                  {item.participants} members
                </ThemedText>
              )}
            </View>
          )}
        />
        <Divider />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search chats"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  searchBar: {
    marginTop: 88,
    marginHorizontal: 16,
    marginBottom: 38,
  },
  listContent: {
    paddingLeft: 5,
    paddingBottom: 7,
    paddingTop: 7,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#636363',
  },
  chatItem: {
    paddingVertical: 8,
  },
  avatar: {
    marginRight: 12,
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  unreadBadge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  participantsText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  eventInfo: {
    fontSize: 12,
    color: Colors.light.tint,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.7,
  },
});
