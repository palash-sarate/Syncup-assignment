# Realtime Coaching Feed Application ⚡️

Welcome to the **Realtime Coaching Feed Application**, a high-performance, premium, and fully responsive platform built to deliver instantaneous coaching content to clients. This application demonstrates advanced engineering practices including Redis caching, WebSocket synchronization, clean database designs, and top-tier UI aesthetics.

---

## 🚀 Key Features & Highlights

### 1. Realtime Synchronization & Event Safety
- **Socket.IO Engine**: Realtime updates delivered instantly via persistent WebSocket connections.
- **Auto-Reconnect**: Seamless connection recovery with intelligent backoff logic and status reporting on the frontend (Connected, Disconnected, Reconnecting).
- **Duplicate Prevention**: Client-side event deduplication using a unique `messageId` tracking system to prevent racing conditions between REST API fetches and websocket pushes.

### 2. High-Performance Caching
- **Redis Caching**: `GET /feed` requests are cached directly in Redis to avoid database bottlenecks and deliver sub-millisecond response times.
- **Cache Invalidation (Write-Through)**: Cache is automatically purged upon creation of new feeds (`POST /feed`), ensuring users always see the latest guidance.
- **Graceful Fallbacks**: Smart failover to local memory or direct database queries if Redis becomes unavailable.

### 3. Sleek Premium Design & UX
- **Harmonious Color Palette**: Dark slate and futuristic charcoal backgrounds overlaid with glassmorphism panels (`backdrop-blur`) and tailored HSL accent glows (emerald greens for goals, cobalt blues for tips, gold for videos).
- **Modern Typography**: Inter and Outfit Google Fonts for high contrast and extreme readability.
- **Micro-Animations & Visual Cues**: Transition entry effects for new cards, active indicator glows, responsive hover effects, and premium skeleton screens during initial load.
- **Loading & Error Management**: Robust error boundaries, toast notifications, empty feed illustrations, and manual retry triggers.

---

## 🛠️ API Specifications

### 1. Retrieve Coaching Feed
* **Endpoint**: `GET /api/feed`
* **Headers**: `Accept: application/json`
* **Response**: `200 OK`
* **Response Body**:
  ```json
  [
    {
      "_id": "64efc123abc456789def0123",
      "title": "Stay Hydrated!",
      "content": "Make sure to drink at least 3.5 liters of water today to keep your muscles functioning at peak performance.",
      "type": "text",
      "coachName": "Coach Sarah",
      "mediaUrl": "",
      "messageId": "msg_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "createdAt": "2026-05-18T12:00:00.000Z"
    }
  ]
  ```

### 2. Publish New Feed Item
* **Endpoint**: `POST /api/feed`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "title": "Lower Body Blast - Technique",
    "content": "Watch the correct posture for squats to avoid lower back strain. Drive through your heels!",
    "type": "video",
    "coachName": "Coach Sarah",
    "mediaUrl": "https://www.youtube.com/watch?v=squat_guide"
  }
  ```
* **Response**: `201 Created`
* **Response Body**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64efc123abc456789def0124",
      "title": "Lower Body Blast - Technique",
      "content": "Watch the correct posture for squats to avoid lower back strain. Drive through your heels!",
      "type": "video",
      "coachName": "Coach Sarah",
      "mediaUrl": "https://www.youtube.com/watch?v=squat_guide",
      "messageId": "msg_f3b9c240-5a3d-4eb8-bb4e-7a1a2b3c4d5e",
      "createdAt": "2026-05-18T12:05:00.000Z"
    }
  }
}
  ```

---

## 🔐 Identity & Access Control (Keycloak OIDC & RBAC)

The application stack utilizes **Keycloak** (integrated via OIDC protocol and Direct-Grant authentication) to enforce secure role-based access control (RBAC):
- **Coachee (Client)**: Users assigned the `client` role are granted access to the Client Dashboard (`client-app`) to browse feeds, view active coach catalogs, and toggle subscriptions. Email verification (`emailVerified: true`) is strictly mapped as an identity claim required to activate core dashboard subscriptions.
- **Coach**: Users assigned the `coach` role can authenticate into the Coach Management Portal (`coach-app`) to publish new feeds, manage publisher status, and review active client metrics.
- **API Gateways**: The backend Express OIDC middleware intercepts and validates incoming JWT bearer tokens, verifying signatures, scopes, and user roles dynamically.

---

## 💡 Subscriptions & Personalized Feed Orchestration

1. **Reactive Subscription Toggling**: Clients can follow/unfollow coaches on the fly using a high-fidelity toggle button. This updates the MongoDB `subscriptions` schema and propagates the change in real-time.
2. **Personalized Feed Aggregation**: The `GET /api/feed` endpoint resolves the authenticated client's active subscriptions and constructs a customized content feed displaying only items published by their subscribed coaches.
3. **Websocket Feed Broadcasting**: When a coach publishes content on the Coach Portal, a websocket event is cast to active socket connections. The client-app dedupes, filters, and displays the content instantly if the client is subscribed to that coach, ensuring real-time interactivity.

---

## 📁 Repository Structure

```
├── backend/
│   ├── config/             # Database and cache connections
│   ├── controllers/        # Express handlers with Keycloak RBAC and Redis caching
│   ├── models/             # Mongoose Schemas (Feed, Coach, Subscription)
│   ├── routes/             # Express API routes
│   └── server.js           # Express + WebSocket server entry point
├── client-app/             # Next.js Client Dashboard for coachees
├── coach-app/              # Next.js Coach Management Portal for publishers
├── keycloak/               # Keycloak Realm export and local container setup
├── docker-compose.yml      # Multi-container orchestration (Mongo, Redis, Keycloak)
├── startup.py              # Automated full-stack launch script
├── README.md               # Feature specifications (This file)
└── scalability_plan.md     # Production scalability guide
```

---

## ⚡ Quick Start

For a reliable setup across different environments, it is highly recommended to use the automated python startup utility.

### Option A: The Recommended Automated Setup (Python Startup Script)

The root folder contains a premium `startup.py` script that automatically checks dependencies, launches the Docker daemon, spins up all necessary databases/auth containers, installs dependencies using correct flags, runs database seeds, and starts all web servers concurrently:

1. **Verify Prerequisites**:
   - Ensure you have **Python 3**, **Docker Desktop**, and **Node.js (v18+)** installed.
2. **Run Startup Utility**:
   ```bash
   python startup.py
   ```
3. **Access Portals**:
   - **Client Portal**: `http://localhost:3000` (Login as `coachee` / `coachee`)
   - **Coach Portal**: `http://localhost:3001` (Login as `coach` / `coach123`)

---

### Option B: Manual Setup

If you prefer to configure the environment steps manually:

#### 1. Spin up Databases & Keycloak
Ensure Docker is active, then launch container services in the background:
```bash
docker-compose up -d
```

#### 2. Install Project Dependencies
Navigate to each repository folder and install dependencies:
```bash
# In backend/
npm install

# In client-app/
npm install --legacy-peer-deps

# In coach-app/
npm install --legacy-peer-deps
```

#### 3. Seed Database & Keycloak Users
Run the backend seeding script to populate Mongo database collections and register Keycloak OIDC users:
```bash
cd backend
node scripts/seed.js
```

#### 4. Launch Services
Start the dev servers across terminal sessions:
- **Backend API**: `npm run dev` in `backend/` (runs on `http://localhost:5000`)
- **Client App**: `npm run dev` in `client-app/` (runs on `http://localhost:3000`)
- **Coach App**: `npm run dev` in `coach-app/` (runs on `http://localhost:3001`)
