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
  ]
  ```

---

## 📁 Repository Structure

```
├── backend/
│   ├── config/             # Database and cache connections
│   ├── controllers/        # Express handlers with Redis orchestration
│   ├── models/             # Mongoose Schemas
│   ├── routes/             # Express API routes
│   ├── server.js           # Server initialization
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js Pages (Feed Dashboard, Admin Panel)
│   │   ├── components/     # High-fidelity UI Cards, Skeletons, Navbar
│   │   └── hooks/          # React useSocket hooks with deduplication
│   └── package.json
├── docker-compose.yml      # Run MongoDB & Redis with one command
├── README.md               # Feature specs (This file)
└── scalability_plan.md     # Production scalability guide
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB & Redis (or Docker)

### Run with Docker Compose
To spin up MongoDB and Redis in the background:
```bash
docker-compose up -d
```

### Install Dependencies
Navigate to both `backend/` and `frontend/` folders and run:
```bash
npm install
```

### Start Servers
- **Backend**: `npm run dev` (starts server on `http://localhost:5000`)
- **Frontend**: `npm run dev` (starts client on `http://localhost:3000`)
