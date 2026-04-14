# VI Compt PRO

Production-ready, scalable accounting software with AI-powered insights, real-time analytics, and enterprise-grade reliability.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (v9 or higher recommended)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   - Copy `.env.example` to `.env`.
   - Fill in the required environment variables (e.g., Firebase configuration).

## Development

To run the application in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Production

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Deployment

This application is designed to be deployed in a Node.js environment. Ensure the `PORT` environment variable is set to `3000` if necessary, though the platform typically handles this.
