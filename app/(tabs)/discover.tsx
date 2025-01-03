import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Event } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function DiscoverScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinedEvents, setJoinedEvents] = useState<string[]>([]);
  const router = useRouter;

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

      const { data, error } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setJoinedEvents(data.map(item => item.event_id));
    } catch (error) {
      console.error('Error fetching joined events:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchEvents();
    fetchJoinedEvents();
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchJoinedEvents();
  }, []);

  const handleJoinEvent = async (eventId: string) => {
    if (joinedEvents.includes(eventId)) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('event_participants')
        .insert([{ event_id: eventId, user_id: user.id }]);

      if (error) throw error;
      // Refresh events after joining
      fetchEvents();
      fetchJoinedEvents();
    } catch (error) {
      console.error('Error joining event:', error);
    }
  };

  const EventCard = ({ event }: { event: Event }) => {
    const isJoined = joinedEvents.includes(event.id);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.dateTime}>
            {new Date(event.event_date).toLocaleString('en-US', {
              hour: 'numeric',
              minute: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.location}>{event.location}</Text>

          <View style={styles.participantsContainer}>
            <View style={styles.participantsInfo}>
              <Ionicons name="people" size={20} color={Colors.primary} />
              <Text style={styles.participantsText}>
                {event.current_participants}/{event.max_participants} seats filled
              </Text>
            </View>

            {isJoined ? (
              <View style={[styles.joinButton, styles.joinedButton]}>
                <Ionicons name="checkmark" size={24} color="#fff" />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => handleJoinEvent(event.id)}
              >
                <Text style={styles.joinButtonText}>JOIN</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
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

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </ScrollView>
    </View>
  );
}

DiscoverScreen.options = {
  tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="sparkles" color={color} />,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: Colors.primary,
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
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  participantsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantsText: {
    fontSize: 14,
    color: '#666',
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinedButton: {
    width: 40,
    paddingHorizontal: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
