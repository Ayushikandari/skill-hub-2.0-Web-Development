# SkillHub Engineering

SkillHub Engineering is a full-stack engineering-focused learning platform built from your Template A concept. It includes role-based login/signup, separate student and teacher dashboards, seeded engineering notes and quizzes, AI-style study helpers, a manual study timer, streak tracking, and tomorrow-subject recommendations.

## What is included

- Student login/signup and teacher login/signup
- Role-based dashboards after authentication
- Seeded engineering database with subjects, notes, quizzes, and study history
- Teacher tools:
  - upload notes
  - upload optional note files
  - create quizzes manually
  - use AI helper to simplify explanations
  - view subject engagement and content coverage
- Student tools:
  - choose subject and topic
  - browse seeded notes
  - generate AI-style summaries
  - ask the explainer to simplify concepts
  - take AI-curated quizzes from the existing quiz bank
  - start and stop a study timer manually
  - track daily study time and streak
  - get tomorrow’s recommended subject based on weak areas and low study time

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Auth: JWT + bcryptjs
- File uploads: Multer
- Database: local JSON seed database generated into `data/db.json`

This keeps the project easy to run now while still matching the architecture of a real full-stack academic platform.

## Demo accounts

- Teacher: `teacher@skillhub.dev` / `teacher123`
- Student: `student@skillhub.dev` / `student123`

## Run locally

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
web/
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ server/
│  ├─ ai.js
│  ├─ analytics.js
│  ├─ auth.js
│  ├─ db.js
│  └─ seed.js
├─ storage/uploads/
├─ data/db.json
├─ server.js
└─ package.json
```

## How this matches your template

### Login and signup

- Users can create accounts as either `student` or `teacher`
- JWT-based authentication protects dashboard routes and APIs

### Teacher dashboard

- Upload notes and optional supporting files
- Choose subject and topic when adding content
- Create quizzes using the built-in quiz builder
- Ask the AI helper to explain difficult concepts in simpler words
- Track subject usage, content coverage, notes, and quizzes

### Student dashboard

- Select subject and topic from engineering-focused subjects
- Use AI summary generation from the seeded note database
- Use AI explanation support for hard topics
- Generate a quiz from pre-existing quiz data
- Start and stop a study timer manually
- View daily study time, streak, and tomorrow recommendation

## Seeded engineering content

The app starts with pre-existing content so it feels like a real product immediately:

- Engineering Mathematics
- Data Structures and Algorithms
- Database Management Systems
- Operating Systems
- Computer Networks
- Digital Logic Design

The seed also includes notes, quizzes, and sample student study sessions so the dashboards are not empty on first run.

## How to implement this further

If you want to turn this into a stronger college/project submission or production-grade app, the next upgrades should be:

1. Replace the local JSON database with MongoDB or PostgreSQL.
2. Move file uploads to Cloudinary, S3, or Firebase Storage.
3. Add real AI using OpenAI for concept explanation, summaries, and quiz generation.
4. Add assignments, submissions, and teacher review workflows.
5. Add branch/semester filters for Mechanical, Civil, ECE, and IT students too.
6. Add charts for weekly and monthly study analytics.
7. Add push/email reminders for streak protection.
8. Deploy on Render, Railway, Vercel, or a VPS.

## Suggested production architecture

- Frontend:
  - React or Next.js for larger scale
  - component-based dashboard pages
- Backend:
  - Express or NestJS
  - modular services for auth, notes, quizzes, analytics, and AI
- Database:
  - MongoDB collections or PostgreSQL tables for users, subjects, notes, quizzes, attempts, sessions
- AI:
  - prompt-backed summary generation
  - RAG over teacher notes and subject documents
  - adaptive recommendations from quiz scores + study behavior

## Key API routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/subjects`
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/quizzes`
- `POST /api/quizzes`
- `POST /api/quizzes/:quizId/submit`
- `POST /api/ai/summary`
- `POST /api/ai/explain`
- `POST /api/ai/quiz`
- `POST /api/study-sessions/start`
- `POST /api/study-sessions/stop`
- `GET /api/dashboard/student`
- `GET /api/dashboard/teacher`

## Notes

- The “AI” features are currently local intelligence built from the existing database so the app works immediately without external API keys.
- The database is created automatically on first run inside `data/db.json`.
- Uploaded files are saved inside `storage/uploads/`.

## Good next step if you want version 2

Ask for any of these and the project can be extended:

- real MongoDB version
- React or Next.js version
- OpenAI integration
- admin panel
- assignment submission system
- attendance and timetable features
- more engineering branches
