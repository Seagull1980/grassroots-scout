# The Grassroots Hub

A modern web application connecting football players with grassroots teams across the community.

## Features

- **User Authentication**: Three user roles - Coach, Player, and Parent/Guardian
- **Team Vacancies**: Coaches can post open positions in their teams
- **Player Availability**: Players and parents can advertise availability
- **Smart Search**: Filter by league, age group, position, and location
- **Alert System**: Get notified when opportunities match your criteria
- **Modern UI**: Built with Material UI for a fresh, professional look

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **UI Library**: Material UI (MUI)
- **Routing**: React Router DOM
- **Build Tool**: Vite
- **Styling**: Emotion (CSS-in-JS)

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Navbar.tsx      # Main navigation component
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state management
├── pages/              # Page components
│   ├── HomePage.tsx    # Landing page
│   ├── LoginPage.tsx   # User login
│   ├── RegisterPage.tsx # User registration
│   ├── DashboardPage.tsx # User dashboard
│   ├── PostAdvertPage.tsx # Create adverts
│   ├── SearchPage.tsx  # Search and browse
│   └── ProfilePage.tsx # User profile and settings
├── theme/              # Material UI theme configuration
│   └── theme.ts        # Custom theme settings
├── types/              # TypeScript type definitions
│   └── index.ts        # Application types
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## User Roles

### Coach
- Post team vacancies
- Search for available players
- Manage team recruitment

### Player
- Post availability advertisements
- Search for team opportunities
- Connect with coaches

### Parent/Guardian
- Manage young player profiles (under 16)
- Post availability for their children
- Search for suitable teams

## Key Features

### Authentication System
- Role-based registration and login
- Persistent sessions with localStorage
- Protected routes for authenticated users

### Search & Filtering
- Filter by league name, age group, and playing position
- Location-based search
- Separate views for team vacancies and player availability

### Alert System
- Create custom alerts based on search criteria
- Toggle alerts on/off
- Manage multiple alert preferences

### User Dashboard
- Quick stats overview
- Recent activity feed
- Quick action buttons
- Personalized content based on user role

## Future Enhancements

- Real-time messaging between users
- Advanced matching algorithm
- Email notifications for alerts
- Mobile application
- Payment integration for premium features
- Team and player rating system
- Match scheduling integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
