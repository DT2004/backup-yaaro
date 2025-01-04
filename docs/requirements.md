# Yaaro Social Meetup App MVP Documentation

## Authentication & Onboarding
- **Welcome Screen**: Bold text "Find YOUR people & Join spontaneous coffee meetups around the city with 2-6 people"
- **Authentication Options**:
  - Google Sign-in
  - Email Authentication
  - Phone Number (+91) with OTP verification

### Onboarding Quiz
Beautiful purple layout with typeform-like box select options:

1. **Age Group** (Single Select)
   - Options: 18-22, 22-27, 25-30, 27-32, 30-35, 32-37, 36-40, 40+

2. **Conversation Starters** (Multi-select, choose 2)
   - IPL debates
   - Startup culture
   - Life & Philosophy
   - Food recommendations
   - Movie reviews
   - Travel stories
   - College memories
   - Local events
   - Tech & gaming

3. **Current Work Life** (Single Select)
   - Tech hustler
   - Finance/Business
   - Creative soul
   - Healthcare
   - Government/Education
   - Student
   - Other

4. **Your Vibe** (Multi-select, choose 2)
   - Chai over coffee
   - Street food explorer
   - Cricket fanatic
   - Bollywood buff
   - Indie music lover
   - Tech enthusiast
   - Local foodie
   - Night owl
   - Deep discussions all the way

5. **Perfect Weekend** (Multi-select, choose 2)
   - Adventure trails
   - Sunsets & long walks
   - Café hopping & food trails
   - Relaxed meetups
   - Playing/watching sports
   - Live shows/concerts
   - Exploring books/art

6. **Personal Description**
   - Text field: "I love..." (max 100 characters)
   - Note: This will be displayed on profile

7. **Weekend Budget** (Single Select, not displayed on profile)
   - 500 or less
   - 500-1500 (cafes & casual dining)
   - 1500+ rs (fine dining & premium)
   Note: This will be used as a filter while browsing events

## Core Features

### Home Page
- **Color Scheme**: Purple and white
- **Header**: Yaaro logo and notification bell
- **Main Header**: "Discover your Yaaro" with tagline about transforming shared interests into lasting friendships
- **Sections**:
  1. Yaaro Hangouts (active)
  2. Discover your Yaaro (coming soon)
  3. Your Number 1 social scene with pictures of people hanging out

### Discover Hangouts Page
- Displays curated events for groups of 4-6 people
- Event cards include:
  - Event image
  - Title
  - Date and time
  - Location
  - Current attendance status
  - Number of participants (from 0 onwards)
  - Available seats counter
  - Small profile circles of current attendees
- Events visible immediately after creation
- Events automatically disappear when full

### Event Joining Process
- JOIN button with confirmation dialog showing:
  - Event details
  - Approximate budget
  - Group chat notification
- Upon joining:
  - User added to attendee list
  - Automatic group chat creation
  - Seats counter update

### Yours Section
- Accessible from bottom navigation
- Shows all joined events
- Access to event group chats
- Event details and status

### Discover People Feature
- Accessible through Discover Hangouts page
- Shows profiles of nearby users
- Enables chat initiation
- Chat conversations accessible through "Yours" section
- Profile visibility based on proximity

## Navigation Structure
Four main icons in the bottom navigation:
1. Home Page
2. Discover (includes both Yaaro events and Discover People)
3. Yours (for joined events and active chats)
4. Profile (editable)

## Backend Requirements
- Event creation through backend system
- Real-time tracking of seat availability
- Event sorting by date and time

## Data Models
### Events
- Title
- Description
- Date/time
- Location
- Maximum participants (4-6)
- Budget range
- Event image
- Status (open, full, completed)

### Users
- Basic profile information
- Joined events (active and past)
- Chat access and history

## Future Features (Coming Soon)
- Mumbai Event map
- "Are you a true Mumbaikar" feature
