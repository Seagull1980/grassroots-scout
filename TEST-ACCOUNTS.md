# Test User Accounts - The Grassroots Hub

This document contains login credentials for testing different user roles in the application.

## 🔐 Admin Accounts
- **Email**: `admin@grassrootshub.com`
- **Password**: `admin123`
- **Role**: Admin
- **Features**: Full admin panel access, user impersonation, league management

---

## 👨‍🏫 Test Coach Accounts

### Coach 1 - Michael Thompson
- **Email**: `test.coach1@example.com`
- **Password**: `coach123`
- **Club**: Riverside FC
- **Location**: Manchester

### Coach 2 - Sarah Mitchell  
- **Email**: `test.coach2@example.com`
- **Password**: `coach123`
- **Club**: City United Youth
- **Location**: London

### Coach 3 - Robert Clarke
- **Email**: `test.coach3@example.com`
- **Password**: `coach123`
- **Club**: Northside Athletic
- **Location**: Birmingham

---

## ⚽ Test Player Accounts

### Player 1 - Alex Rodriguez
- **Email**: `test.player1@example.com`
- **Password**: `player123`
- **Position**: Midfielder
- **Age Group**: U21
- **Location**: Manchester

### Player 2 - Emma Johnson
- **Email**: `test.player2@example.com`
- **Password**: `player123`
- **Position**: Forward
- **Age Group**: Open Age
- **Location**: London

### Player 3 - Daniel Wilson
- **Email**: `test.player3@example.com`
- **Password**: `player123`
- **Position**: Defender
- **Age Group**: U18
- **Location**: Liverpool

### Player 4 - Sophie Turner
- **Email**: `test.player4@example.com`
- **Password**: `player123`
- **Position**: Goalkeeper
- **Age Group**: U21
- **Location**: Birmingham

### Player 5 - Jake Martinez
- **Email**: `test.player5@example.com`
- **Password**: `player123`
- **Position**: Midfielder
- **Age Group**: Over 35
- **Location**: Leeds

---

## 👨‍👩‍👧‍👦 Test Parent/Guardian Accounts

### Parent 1 - Jennifer Adams
- **Email**: `test.parent1@example.com`
- **Password**: `parent123`
- **Child**: Oliver Adams (U14)
- **Location**: Manchester

### Parent 2 - David Brown
- **Email**: `test.parent2@example.com`
- **Password**: `parent123`
- **Child**: Lily Brown (U12)
- **Location**: London

### Parent 3 - Lisa Davis
- **Email**: `test.parent3@example.com`
- **Password**: `parent123`
- **Child**: Noah Davis (U16)
- **Location**: Liverpool

### Parent 4 - Mark Wilson
- **Email**: `test.parent4@example.com`
- **Password**: `parent123`
- **Child**: Grace Wilson (U13)
- **Location**: Birmingham

---

## 🧪 Testing Features

### Role-Based Testing
1. **Coach Role**: Test team vacancy posting, player recruitment, team management
2. **Player Role**: Test player availability posting, team search, application features  
3. **Parent/Guardian Role**: Test child player management, youth team search, parent features
4. **Admin Role**: Test user management, league administration, impersonation features

### Mobile Testing
- Use admin account to test impersonation on mobile devices
- Switch between different user roles to test mobile UI/UX
- Test location-based features with the GPS coordinates in the database

### Authentication Testing
- Test login/logout functionality across all user types
- Test password reset flows
- Test registration for new accounts

---

## 📱 Mobile Access
When testing on mobile devices, use the ngrok URL or network IP:
- **Local Network**: `http://192.168.0.44:5178/` (adjust IP as needed)
- **Ngrok Tunnel**: Use the generated ngrok URL for external access

---

## 🗄️ Database Summary
- **Total Users**: 48 (16 Coaches, 23 Players, 7 Parents, 2 Admins)
- **Team Vacancies**: 34 with location data
- **Player Availability**: 16+ with GPS coordinates  
- **Leagues**: 41 total leagues
- **Geographic Coverage**: Manchester, London, Liverpool, Birmingham, Leeds, Newcastle, Brighton

---

*Last Updated: August 27, 2025*
