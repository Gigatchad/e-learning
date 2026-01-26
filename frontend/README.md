# E-Learning Platform Frontend

This is the React frontend for the E-Learning Platform, built with Vite.

## Features

- **Modern UI/UX**: Responsive design with a premium feel using plain CSS variables and clear structure.
- **Authentication**: Full flow with Login, Register, and Profile management using JWTs (cookies).
- **Role-Based Access**: Specialized views for Students, Instructors, and Admins.
- **Course Management**: Instructors can create/edit courses, upload thumbnails, and manage curriculum with sections and lessons.
- **Learning Experience**: Video player, progress tracking, and course material viewing.
- **Discovery**: Advanced course filtering, searching, and categorization.

## Tech Stack

- **React 18**
- **Vite**
- **React Router v6**
- **Zustand** (State Management)
- **React Hook Form + Zod** (Form Validation)
- **Axios** (API Communication)
- **React Hot Toast** (Notifications)
- **React Icons**
- **React Player** (Video Playback)

## Getting Started

### Prerequisites

1.  Ensure the **Backend** is running on `http://localhost:5000`.
2.  Node.js (v18+)

### Installation

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

- `src/components`: Reusable UI components
- `src/pages`: Route page components
- `src/services`: API service layer
- `src/store`: Global state management (Auth)
- `src/index.css`: Global styles and design system

## Configuration

The application authenticates via HTTP-only cookies set by the backend. Ensure your browser allows third-party cookies if running on different domains (though the Vite proxy handles this for development).

- **Proxy**: Requests to `/api` are proxied to `http://localhost:5000` via `vite.config.js`.
