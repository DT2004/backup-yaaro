// props: {"title": "TypeScript Types for Public Schema", "runQuery": "false", "isChart": "false"}

export type EventParticipant = {
  id: string; // uuid
  event_id?: string; // uuid
  user_id?: string; // uuid
  joined_at?: string; // timestamp with time zone
};

export type Event = {
  id: string; // uuid
  title: string; // character varying(255)
  description?: string; // text
  event_date: string; // timestamp with time zone
  location: string; // character varying(255)
  max_participants: number; // integer
  current_participants?: number; // integer
  budget_range: string; // character varying(50)
  image_url?: string; // text
  status?: 'open' | 'full' | 'completed'; // character varying(20)
  created_at?: string; // timestamp with time zone
};

export type OnboardingAnswer = {
  id: number; // serial
  user_id: string; // uuid
  question_id: number; // integer
  question_type: string; // text
  question_text: string; // text
  answer: any; // jsonb
  created_at?: string; // timestamp without time zone
};

export type Profile = {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  full_name?: string; // text
  avatar_url?: string; // text
  email?: string; // text
  quiz_complete?: boolean; // boolean
};

export interface GroupMessage {
  id: string; // UUID
  group_id: string; // UUID referencing group_chats(id)
  sender_id: string; // UUID referencing profiles(id)
  message: string; // Text of the message
  created_at: string; // Timestamp with time zone
}
// types.ts

export interface DirectMessage {
  id: string; // UUID
  sender_id: string; // UUID referencing profiles(id)
  receiver_id: string; // UUID referencing profiles(id)
  message: string; // Text of the message
  created_at: string; // Timestamp with time zone
}

// types.ts


export interface GroupChat {
  id: string; // UUID
  title: string; // Title of the group chat
  created_at: string; // Timestamp with time zone
}

export interface DirectMessage {
  id: string; // UUID
  user1_id: string; // UUID referencing profiles(id)
  user2_id: string; // UUID referencing profiles(id)
  created_at: string; // Timestamp with time zone
}