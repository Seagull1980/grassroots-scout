<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# The Grassroots Hub - Copilot Instructions

This is a React TypeScript application for connecting football players with grassroots teams. The application uses Material UI for the user interface and follows modern React patterns.

## Project Context

- **Purpose**: Connect football players with grassroots football teams
- **Users**: Coaches, Players, and Parents/Guardians (for under 16 players)
- **Core Features**: User authentication, team vacancy posting, player availability posting, search/filtering, alert system

## Tech Stack & Conventions

- **Framework**: React 18 with TypeScript
- **UI Library**: Material UI (MUI) v5
- **Routing**: React Router DOM v6
- **State Management**: React Context API for authentication
- **Build Tool**: Vite
- **Styling**: Material UI theme system with custom theme

## Code Style Guidelines

1. **Components**: Use functional components with TypeScript
2. **Naming**: Use PascalCase for components, camelCase for variables and functions
3. **File Structure**: Organize files by feature (pages, components, contexts, types)
4. **Material UI**: Use the theme system for consistent styling
5. **TypeScript**: Define proper interfaces for all data structures

## Key Features to Maintain

1. **Authentication System**: 
   - Three user roles: Coach, Player, Parent/Guardian
   - Context-based state management
   - Protected routes

2. **Search & Filtering**:
   - Filter by league, age group, position, location
   - Separate tabs for team vacancies and player availability

3. **User Dashboard**:
   - Role-specific content and actions
   - Stats and recent activity

4. **Responsive Design**:
   - Mobile-first approach using Material UI Grid system
   - Consistent spacing and typography

## When Making Changes

- Follow the existing component structure and patterns
- Use Material UI components consistently
- Maintain TypeScript types for all props and data
- Keep the theme consistent across all components
- Test user flows for all three user roles
- Ensure responsive design works on mobile and desktop

## Common Patterns Used

- React Context for global state (authentication)
- Custom hooks for reusable logic
- Material UI theming for consistent design
- Grid system for responsive layouts
- Form validation with user feedback
