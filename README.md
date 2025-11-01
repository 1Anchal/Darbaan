# Darbaan Smart Attendance System

A comprehensive smart attendance management and crowd management system that uses Bluetooth Low Energy (BLE) technology for automatic presence detection.

## Features

- **Smart Attendance Tracking**: Automatic BLE-based attendance detection
- **Crowd Management**: Real-time monitoring of campus locations
- **Role-based Access**: Support for students, faculty, and admin users
- **Comprehensive Reporting**: Detailed analytics and export capabilities
- **Real-time Dashboard**: Live updates and notifications

## Architecture

This is a monorepo containing:
- **Backend**: Node.js/Express API with TypeScript
- **Frontend**: React application with Material-UI

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database
- Redis server
- InfluxDB (for time-series data)

## Quick Start

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd darbaan-attendance-system
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Backend
   cp packages/backend/.env.example packages/backend/.env
   # Frontend
   cp packages/frontend/.env.example packages/frontend/.env
   ```

3. **Start development servers**:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API server on http://localhost:3001
   - Frontend React app on http://localhost:3000

## Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
darbaan-attendance-system/
├── packages/
│   ├── backend/          # Node.js API server
│   │   ├── src/
│   │   ├── prisma/       # Database schema
│   │   └── package.json
│   └── frontend/         # React application
│       ├── src/
│       ├── public/
│       └── package.json
├── package.json          # Root package.json
└── README.md
```

## Technology Stack

### Backend
- Node.js with Express.js
- TypeScript
- PostgreSQL with Prisma ORM
- Redis for caching
- InfluxDB for time-series data
- Socket.io for real-time communication
- JWT authentication

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- React Router for navigation
- Axios for API calls
- Socket.io client for real-time updates

### BLE Infrastructure
- Raspberry Pi Model B (4GB RAM)
- Noble.js for BLE scanning
- MQTT for device communication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.