import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Event } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface PayloadType {
  new: {
    id: string;
    [key: string]: any;
  };
}

export default function DiscoverScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joinedEvents, setJoinedEvents] = useState<string[]>([]);
  const router = useRouter();

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'open')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchJoinedEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: participations, error: participationsError } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      if (participationsError) throw participationsError;
      setJoinedEvents(participations?.map(p => p.event_id) || []);
    } catch (error) {
      console.error('Error fetching joined events:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchJoinedEvents()]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('event-updates')
      .on('postgres_changes' as const, {
        event: '*',
        schema: 'public',
        table: 'events'
      }, (payload: RealtimePostgresChangesPayload<Event>) => {
        if (payload.new) {
          setEvents(prev => prev.map(event => 
            event.id === payload.new.id ? { ...event, ...payload.new } : event
          ));
        }
      })
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'event_participants'
        },
        () => {
          fetchJoinedEvents();
        }
      )
      .on('broadcast', { event: 'event_updated' }, (payload: { event_id: string; current_participants: number }) => {
        setEvents(prev => prev.map(event =>
          event.id === payload.event_id
            ? { ...event, current_participants: payload.current_participants }
            : event
        ));
      })
      .on('broadcast', { event: 'group_chat_created' }, async (payload: { event_id: string; group_chat_id: string; user_id: string }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === payload.user_id) {
          router.push({
            pathname: '/chat/gc/[id]',
            params: { id: payload.group_chat_id }
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchJoinedEvents();
  }, []);

  const handleLeaveEvent = async (event: Event) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to leave events');
        return;
      }

      const { error: leaveError } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);

      if (leaveError) {
        console.error('Error leaving event:', leaveError);
        Alert.alert('Error', 'Failed to leave event. Please try again.');
        return;
      }

      // Update local state immediately
      setJoinedEvents(prev => prev.filter(id => id !== event.id));
      setEvents(prev => prev.map(e => 
        e.id === event.id 
          ? { ...e, current_participants: Math.max((e.current_participants || 0) - 1, 0) }
          : e
      ));
    } catch (error) {
      console.error('Error in handleLeaveEvent:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleJoinEvent = async (event: Event) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to join events');
        return;
      }

      Alert.alert(
        'Join Event',
        `Would you like to join "${event.title}"?\n\nDetails:\n📍 ${event.location}\n📅 ${formatDate(event.event_date)}\n👥 ${event.current_participants}/${event.max_participants} participants`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Join',
            style: 'default',
            onPress: async () => {
              setLoading(true);
              try {
                const { error: joinError } = await supabase
                  .from('event_participants')
                  .insert([{ event_id: event.id, user_id: user.id }]);

                if (joinError) {
                  console.error('Error joining event:', joinError);
                  Alert.alert('Error', 'Failed to join event. Please try again.');
                  return;
                }

                setJoinedEvents(prev => [...prev, event.id]);
                setEvents(prev => prev.map(e => 
                  e.id === event.id 
                    ? { ...e, current_participants: (e.current_participants || 0) + 1 }
                    : e
                ));

                // Wait briefly for the trigger to create the group chat
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Get the group chat ID
                const { data: groupChat } = await supabase
                  .from('group_chats')
                  .select('id')
                  .eq('event_id', event.id)
                  .single();

                if (groupChat) {
                  router.push({
                    pathname: '/chat/gc/[id]',
                    params: { id: groupChat.id }
                  });
                }
              } catch (error) {
                console.error('Error in handleJoinEvent:', error);
                Alert.alert('Error', 'An unexpected error occurred');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleJoinEvent:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const isJoined = joinedEvents.includes(item.id);
    const isFull = (item.current_participants || 0) >= item.max_participants;

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.participantCount}>
            <Ionicons name="people" size={16} color="#9C27B0" />
            <Text style={[styles.participantText, { color: '#9C27B0' }]}>
              {item.current_participants || 0}/{item.max_participants}
            </Text>
          </View>
        </View>

        <Text style={styles.eventDescription}>{item.description}</Text>

        <View style={styles.eventDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="location" size={16} color="#9C27B0" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={16} color="#9C27B0" />
            <Text style={styles.detailText}>{formatDate(item.event_date)}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              isJoined ? styles.leaveButton : styles.joinButton,
              (!isJoined && isFull) && styles.disabledButton
            ]}
            onPress={() => {
              if (loading) return;
              if (isJoined) {
                handleLeaveEvent(item);
              } else if (!isFull) {
                handleJoinEvent(item);
              }
            }}
            disabled={loading || (!isJoined && isFull)}
          >
            <Text style={styles.buttonText}>
              {isJoined ? 'Leave' : (isFull ? 'Full' : 'Join')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yaaro Hangouts</Text>
        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Discover people</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Text style={[styles.tabText, styles.activeTabText]}>Discover hangouts</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#9C27B0',
    padding: 16,
    paddingTop: 130,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#fff',
    fontSize: 16,
  },
  activeTabText: {
    color: '#9C27B0',
  },
  list: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  participantCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantText: {
    marginLeft: 4,
    color: '#9C27B0',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#444',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButton: {
    backgroundColor: '#9C27B0',
  },
  leaveButton: {
    backgroundColor: '#9C27B0',
    opacity: 0.8,
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
