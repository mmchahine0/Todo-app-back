# Todo App

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Technologies](#technologies)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Deployment](#deployment)
  - [Frontend (Vercel)](#frontend-vercel)
  - [Backend and Database (Render)](#backend-and-database-render)

## Description

This project is an advanced, full-stack to-do application designed for robust functionality, security, and scalability. It integrates modern web technologies to provide a seamless user experience with real-time collaboration and secure data management.

## Features

- **User Authentication and Authorization**: Secure user management with JWT, refresh tokens (HTTP cookies), and role-based access control.
- **Email Integration**: OTP verification and password reset via Google API.
- **Real-time Collaboration**: WebSocket functionality for real-time updates and notifications.
- **Performance Optimization**: Redis caching, code splitting, and optimized front-end build with Vite.
- **Data Security**: Rate limiting and comprehensive data validation.
- **State Management**: Redux with persist and encryption, and React Query for efficient data fetching.
- **Responsive Design**: Tailwind CSS and Shadcn components for a polished UI.
- **SEO Optimization**: Lighthouse checks and best practices.
- **Containerization**: Docker for consistent environments.
- **Database Management**: Prisma with PostgreSQL.

## Technologies

### Front-end

- React
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Query
- Redux (with persist and encryption)
- Vite

### Back-end

- Node.js
- Express.js
- Prisma
- PostgreSQL
- Redis
- WebSockets

### Deployment

- **Vercel** (Front-end)
- **Render** (Back-end and Database)
- **Docker**

## Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (>= 18)
- [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (Optional, for local containerization)
- [PostgreSQL](https://www.postgresql.org/) (Local or remote)
- [Redis](https://redis.io/) (Local or remote)
- [Google API Credentials](https://console.cloud.google.com/)

### Installation

Clone the repository:

```bash
git clone [repository URL]
cd [repository directory]
```

Install dependencies:

```bash
yarn install
```

### Environment Variables

Create `.env` files in both the client and server directories with the following variables:

#### Server (`.env`):

```env
DATABASE_URL="db"
JWT_REFRESH_SECRET="anysecretkey"
JWT_SECRET="anysecretkey"
CORS_ORIGIN="corsport"
PORT="port"
REDIS_URL="redis"

GMAIL_CLIENT_ID=""
GMAIL_CLIENT_SECRET=""
GMAIL_REFRESH_TOKEN=""
GMAIL_EMAIL=""
```

#### Client (`.env`):

```env
VITE_REDUX_ENCRYPTION_KEY="anysecretkey"
VITE_API_BASE_URL="backendapi"
VITE_SOCKET_URL="socket"
```

### Running the Application

#### Start the back-end:

```bash
cd server
yarn dev
```

#### Start the front-end:

```bash
cd ../client
yarn dev
```

## Deployment

### Frontend (Vercel)

1. Create a [Vercel](https://vercel.com/) account and connect your GitHub repository.
2. Configure environment variables in Vercel settings.
3. Deploy the project.

### Backend and Database (Render)

1. Create a [Render](https://render.com/) account and connect your GitHub repository.
2. Create a PostgreSQL database instance on Render.
3. Create a Redis instance on Render.
4. Create a Web Service for the back-end, configuring environment variables and connecting to the database.
5. Deploy the project.
