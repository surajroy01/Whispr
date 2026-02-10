# ChatApp - Real-time Messaging Application

A modern, dark-themed real-time chat application inspired by WhatsApp/Slack, built with Node.js, Express, MongoDB, Socket.IO, and vanilla JavaScript.

![ChatApp](https://img.shields.io/badge/Chat-App-8b5cf6)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3 (Flexbox + Grid), Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-time** | Socket.IO |
| **Authentication** | JWT + bcrypt |

## Features

- **User Authentication** - Register, login with JWT
- **Profile Management** - Edit username, bio, profile picture
- **Friend System** - Search users, send/accept/decline friend requests
- **Private Messaging** - Real-time 1-to-1 chat (friends only)
- **Group Chat** - Create groups, add members, real-time group messaging
- **Emoji Support** - Inline emoji picker
- **GIF Support** - Search and send GIFs via GIPHY API
- **Typing Indicators** - See when others are typing
- **Online Status** - Online/offline presence
- **Mobile Responsive** - Mobile-first design

## Project Structure

```
Chat Application/
├── backend/
│   ├── config/         # DB config
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Auth, upload
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API routes
│   ├── sockets/        # Socket.IO handlers
│   ├── uploads/        # Profile pictures
│   ├── server.js       # Entry point
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js           # Main app logic
│   │   └── services/
│   │       ├── api.js       # HTTP API client
│   │       └── socket.js    # Socket.IO client
│   └── index.html
└── README.md
```

## Setup Instructions

### Prerequisites

- **Node.js** v18+ (for native fetch)
- **MongoDB** (local or MongoDB Atlas)
- **GIPHY API Key** (optional, for GIF search - get one at [developers.giphy.com](https://developers.giphy.com/))

### Step 1: Clone & Install

```bash
cd "Chat Application"
cd backend
npm install
```

### Step 2: Environment Configuration

Create `.env` in the `backend` folder (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chat_app
JWT_SECRET=your_super_secret_jwt_key_change_in_production
GIPHY_API_KEY=your_giphy_api_key
```

- **MONGODB_URI**: Use `mongodb://localhost:27017/chat_app` for local MongoDB, or your Atlas connection string
- **JWT_SECRET**: Generate a strong random string for production
- **GIPHY_API_KEY**: Optional; without it, GIF search will show an error

### Step 3: Start MongoDB

Ensure MongoDB is running locally, or use a cloud instance:

```bash
# Local MongoDB (if installed)
mongod
```

### Step 4: Run the Application

```bash
cd backend
npm run dev
```

The server runs on **http://localhost:5000**. The frontend is served by the backend, so open:

**http://localhost:5000**

### Step 5: Create Test Users

1. Click **Register** and create 2+ accounts
2. Search for each other in **Friends** → **Add Friend**
3. Accept friend requests
4. Start chatting!

---

## API Routes

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |

### Users (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get profile |
| PUT | `/api/users/me` | Update profile |
| GET | `/api/users/search?q=` | Search users |
| GET | `/api/users/:id` | Get user by ID |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | Get friends list |
| GET | `/api/friends/requests` | Get pending requests |
| POST | `/api/friends/request` | Send friend request |
| PUT | `/api/friends/:id/accept` | Accept request |
| PUT | `/api/friends/:id/decline` | Decline request |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:userId` | Get conversation |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | Get user's groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/:id` | Get group |
| PUT | `/api/groups/:id` | Update group |
| POST | `/api/groups/:id/members` | Add members |
| DELETE | `/api/groups/:id/members/:memberId` | Remove/leave |
| GET | `/api/groups/:id/messages` | Get messages |

### GIPHY
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/giphy/search?q=&limit=` | Search GIFs |

---

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_chat` | `{ userId }` | Join private chat room |
| `leave_chat` | `{ userId }` | Leave private chat |
| `send_message` | `{ receiverId, content, type?, gifUrl? }` | Send message |
| `typing_start` | `{ receiverId }` | Start typing |
| `typing_stop` | `{ receiverId }` | Stop typing |
| `join_group` | `{ groupId }` | Join group room |
| `leave_group` | `{ groupId }` | Leave group room |
| `send_group_message` | `{ groupId, content, type?, gifUrl? }` | Send group message |
| `group_typing_start` | `{ groupId }` | Group typing start |
| `group_typing_stop` | `{ groupId }` | Group typing stop |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `message` | message object | New private message |
| `message_delivered` | `{ messageId, deliveredAt }` | Message delivered |
| `group_message` | message object | New group message |
| `typing` | `{ userId }` | User typing |
| `stop_typing` | `{ userId }` | User stopped typing |
| `user_online` | `{ userId }` | User came online |
| `user_offline` | `{ userId }` | User went offline |

---

## MongoDB Schemas

### User
- username, email, password (hashed)
- bio, profilePicture
- isOnline, lastSeen, socketId

### Friend
- requester, recipient (ref User)
- status: pending | accepted | declined

### Message (private)
- sender, receiver, content
- type: text | emoji | gif
- gifUrl, isDelivered, deliveredAt

### Group
- name, description
- admin, members[]

### GroupMessage
- group, sender, content
- type: text | emoji | gif
- gifUrl

---

## Design

- **Theme**: Dark mode with purple (`#8b5cf6`) accent
- **Typography**: DM Sans
- **Layout**: Flexbox + CSS Grid
- **Responsive**: Mobile-first, breakpoint at 768px

---

## Production Notes

1. Set strong `JWT_SECRET` and keep it secret
2. Use MongoDB Atlas or managed MongoDB
3. Add rate limiting (e.g. `express-rate-limit`)
4. Store uploads in cloud storage (S3, Cloudinary)
5. Enable HTTPS
6. Set `FRONTEND_URL` in `.env` if frontend is hosted separately

---

## License

MIT
