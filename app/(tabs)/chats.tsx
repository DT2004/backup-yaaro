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
        // Fetch DMs
        const { data: directMessages, error: dmError } = await supabase
          .from('direct_messages')
          .select('*, user1:user1_id(full_name, avatar_url), user2:user2_id(full_name, avatar_url), dm_messages!inner(message, created_at)')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('created_at', { foreignTable: 'dm_messages', ascending: false })
          .limit(1, { foreignTable: 'dm_messages' });

        if (dmError) throw dmError;

        // Fetch Group Chats
        const { data: groupChats, error: gcError } = await supabase
          .from('group_chats')
          .select(`
            *,
            group_members!inner(user_id),
            group_messages(message, created_at, sender:sender_id(full_name))
          `)
          .eq('group_members.user_id', user.id)
          .order('created_at', { foreignTable: 'group_messages', ascending: false })
          .limit(1, { foreignTable: 'group_messages' });

        if (gcError) throw gcError;

        // Transform data into ChatListItem format
        const dmItems: ChatListItem[] = directMessages.map(dm => ({
          id: dm.id,
          type: 'dm',
          name: user.id === dm.user1_id ? dm.user2.full_name : dm.user1.full_name,
          avatar: user.id === dm.user1_id ? dm.user2.avatar_url : dm.user1.avatar_url,
          lastMessage: dm.dm_messages[0]?.message,
          timestamp: formatTimestamp(dm.dm_messages[0]?.created_at),
        }));

        const gcItems: ChatListItem[] = groupChats.map(gc => ({
          id: gc.id,
          type: 'gc',
          name: gc.name || 'Unnamed Group',
          lastMessage: gc.group_messages?.[0]?.message || 'No messages yet',
          timestamp: formatTimestamp(gc.group_messages?.[0]?.created_at || gc.created_at),
          participants: gc.group_members.length,
        }));

        // Combine and sort by latest message
        setChats([...dmItems, ...gcItems].sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }));
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // Set up real-time subscriptions
    const dmSubscription = supabase
      .channel('dm-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dm_messages'
      }, () => {
        fetchChats();
      })
      .subscribe();

    const gcSubscription = supabase
      .channel('gc-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_messages'
      }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      dmSubscription.unsubscribe();
      gcSubscription.unsubscribe();
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

  const renderChatItem = ({ item }: { item: ChatListItem }) => (
    <Pressable onPress={() => handleChatPress(item)}>
      <List.Item
        title={item.name}
        description={item.lastMessage || 'No messages yet'}
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
              icon="account"
              style={[styles.avatar, { backgroundColor: 'white' }]}
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
        style={styles.chatItem}
      />
    </Pressable>
  );

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
});
