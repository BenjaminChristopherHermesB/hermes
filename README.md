# Hermes The Quizzer ⚡

A modern MCQ practice platform built with React.js and Express.js, featuring Material Design Expressive purple theme.

## Features

- **Authentication**: JWT-based with refresh tokens, rate limiting, one-account-per-IP
- **Quiz Engine**: Priority-based question selection (unattempted → wrong → correct), timed/untimed modes, progress bar
- **Review Mode**: Post-quiz review with explanations and correct answers
- **Admin Dashboard**: User management (promote/demote/reset), subject CRUD, JSON import/export with merge
- **Responsive Design**: Mobile-first approach, works on all screen sizes
- **Theme Toggle**: Dark/light mode persisted per user

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js + Vite |
| Backend | Express.js |
| Database | PostgreSQL (Neon) |
| Auth | JWT + bcrypt |
| Hosting | Vercel |

## Quick Start

```bash
# Backend
cd server && npm install && node api/index.js

# Frontend (separate terminal)
cd client && npm install && npm run dev
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full step-by-step instructions.

## Project Structure

```
hermes/
├── client/          # React.js frontend
├── server/          # Express.js backend
├── sql/             # Database schema & seed scripts
├── examples/        # Example subject JSON files
└── DEPLOYMENT.md    # Deployment guide
```

## JSON Format

Upload subjects via the admin panel using this structure:

```json
{
  "subject": "Data Structures",
  "questions": [
    {
      "question": "What is the time complexity of binary search?",
      "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      "correct_answer": "O(log n)",
      "explanation": "Binary search halves the search space each step.",
      "module": 2
    }
  ]
}
```
