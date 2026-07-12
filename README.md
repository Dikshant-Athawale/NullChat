# NullChat

NullChat is a real-time chat application featuring a modern React frontend and a Node.js/Express backend with WebSockets.

## Project Structure

This is a monorepo setup containing both the client and server applications:
- `/client` - The frontend React application built with Vite.
- `/server` - The backend Express server handling API requests and WebSocket connections.
- `/shared` - Shared resources or types (if applicable).

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm or yarn

## Getting Started

### 1. Backend Setup

Open a terminal and navigate to the `server` directory:

```bash
cd server
npm install
```

Configure your environment variables by creating a `.env` file in the `server` directory.

Run the server in development mode:

```bash
npm run dev
```

### 2. Frontend Setup

Open a new terminal and navigate to the `client` directory:

```bash
cd client
npm install
```

Run the frontend development server:

```bash
npm run dev
```

## Technologies Used

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, WebSockets
