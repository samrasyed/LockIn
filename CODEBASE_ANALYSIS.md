# FocusMate - Codebase Analysis Report

## 1. PROJECT OVERVIEW
- **Purpose**: FocusMate is an AI-powered study companion designed to improve productivity. It monitors a user's webcam feed locally using computer vision to detect if they are focused, looking away, or distracted by their phone, and actively alerts them to get back to work.
- **Tech Stack**: 
  - **Frontend**: React.js, TensorFlow.js (Web ML)
  - **Backend**: Node.js, Express.js
  - **Database**: MongoDB (Mongoose ORM)
- **Project Type**: Full-stack Web Application (Client-Server Monorepo structure)

---

## 2. ARCHITECTURE & WORKFLOW
- **High-Level Architecture**:
  The application follows a standard MERN stack architecture, but with a heavy, intelligent client. The frontend acts as an edge-computing node, downloading ML models and processing webcam video frames locally in the browser. 
- **End-to-End Workflow**:
  1. User authenticates via JWT.
  2. User starts a study session (`StudySession.js`).
  3. The browser accesses the webcam and runs a `requestAnimationFrame`/timeout loop (every 250ms).
  4. TensorFlow.js models (BlazeFace & COCO-SSD) process frames to detect faces and cell phones.
  5. The frontend computes a live `focusScore` and triggers alarms (TTS voice, sound, or custom recording) if distracted.
  6. Upon ending the session, aggregated metrics (duration, distractions, final score) are POSTed to the backend.
  7. The backend calculates streak data and saves to MongoDB.
- **Design Patterns**: 
  - Layered Architecture (Routes -> Controllers -> Models).
  - Heavy use of React `useRef` to maintain mutable state across high-frequency ML loops without triggering expensive UI re-renders.

---

## 3. FOLDER & FILE STRUCTURE
- `backend/` (Node.js Server)
  - `server.js`: App bootstrap, connects to DB, configures middleware (Helmet, Rate Limiter, CORS).
  - `models/`: Contains `User.js` and `Session.js` (Mongoose Schemas).
  - `routes/`: Express routers (`auth.js`, `sessions.js`, `users.js`).
- `frontend/` (React Client)
  - `src/App.js`: Top-level router and context provider.
  - `src/pages/StudySession.js`: **The core ML loop and webcam UI.**
  - `src/pages/Dashboard.js`: User analytics and streak visualization.
  - `src/context/AuthContext.js`: Global state management for user sessions.

---

## 4. DATABASE & DATA MODELS
- **Database Type**: MongoDB (NoSQL)
- **Schemas**:
  - **`users`**: `name`, `email` (Unique), `password` (Hashed), `streak` (current, longest, lastStudyDate), `totalStats` (totalMinutes, totalSessions, avgFocusScore), `alarmSettings` (type, volume, voiceType, customText, etc).
  - **`sessions`**: `userId` (ObjectId Ref), `subject`, `duration`, `focusScore`, `timeBreakdown` (focusedTime, phoneTime, noFaceTime), `distractions` (Array of subdocs), `pomodoroSessions`, `startTime`, `endTime`.
- **Relationships**: `sessions.userId` maps to `users._id`.
- **ORM**: Mongoose.
- **Migrations**: Schemaless nature of MongoDB; no explicit migration strategy used.

---

## 5. APIs & INTERFACES
- **REST Endpoints (Express)**:
  - **Auth**: 
    - `POST /api/auth/signup`
    - `POST /api/auth/login`
    - `GET /api/auth/me` (Protected)
  - **Sessions**:
    - `POST /api/sessions/`: Saves session metrics and updates user streaks.
    - `GET /api/sessions/`: Paginated session history.
    - `GET /api/sessions/analytics`: Uses MongoDB Aggregation pipelines to return 30-day streak history and subject stats.
  - **Users**:
    - `PUT /api/users/alarm-settings`: Updates user's custom alarm preferences.
- **Authentication**: Bearer Token (JWT). Passwords hashed using `bcryptjs`.
- **External APIs**: TensorFlow models are downloaded client-side from CDNs via NPM packages.

---

## 6. KEY MODULES & COMPONENTS
- **`StudySession.js` (Frontend)**: The most complex and critical module. It handles:
  - Loading `@tensorflow-models/blazeface` and `coco-ssd` into WebGL memory.
  - Running a 250ms polling loop to analyze the `<video>` element.
  - A complex alarm system using the Web Audio API and Web Speech API (SpeechSynthesisUtterance) to yell at the user.
- **`routes/sessions.js` (Backend)**: Contains complex MongoDB `$aggregate` pipelines to calculate 30-day moving averages and subject-based time summaries.

---

## 7. STATE MANAGEMENT & DATA FLOW
- **Frontend State**: 
  - **Global**: `AuthContext` provides user data globally.
  - **Local/Performance**: High-frequency ML data (e.g., `focusScoreRef`, `liveMetricsRef`, `lastDetectionAtRef`) are stored in React `useRef` hooks rather than `useState`. This is an excellent optimization that prevents the entire React component tree from re-rendering 4 times a second during ML inference.
- **Data Privacy Flow**: Video frames NEVER leave the browser. They are processed in WebGL memory, and only text/number aggregates (duration, score) are sent to the Node.js backend.

---

## 8. DEPENDENCIES & LIBRARIES
- **Backend**: 
  - `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`.
  - `helmet`, `express-rate-limit`: (Security best practices).
- **Frontend**: 
  - `@tensorflow/tfjs`, `@tensorflow-models/blazeface`, `@tensorflow-models/coco-ssd`: Core computer vision libraries.
  - `chart.js`, `react-chartjs-2`: Used in Dashboard for analytics.
  - `@react-three/fiber`, `framer-motion`: For advanced UI animations and 3D elements.
- **Risky Packages**: Relying on client-side WebGL via TensorFlow.js can cause memory leaks on low-end devices if not garbage collected properly.

---

## 9. CONFIGURATION & ENVIRONMENT
- **Environment Variables**:
  - `PORT`: Server port.
  - `MONGODB_URI`: Connection string for the database.
  - `JWT_SECRET`: Used to sign authentication tokens.
- **Proxy**: The frontend `package.json` uses `"proxy": "http://localhost:5000"`, allowing the React dev server to forward `/api` requests to the Node server seamlessly.

---

## 10. TESTING STRATEGY
- **Test Types Present**: None observed.
- **Frameworks**: None configured (missing Jest, Mocha, or Cypress).
- **Test Coverage**: 0%.
- **Missing**: The algorithmic scoring in `computeTimeBasedFocusScore` and the backend streak calculation logic desperately need unit tests, as edge cases (like timezone differences in dates) will cause streak bugs.

---

## 11. SECURITY ANALYSIS
- **Authentication**: Handled correctly. JWT is used for stateless sessions, and passwords are not stored in plaintext.
- **Security Headers**: `app.use(helmet())` is utilized on the backend, which protects against XSS and clickjacking.
- **Rate Limiting**: Applied to `/api/` to prevent brute force attacks on login/signup endpoints.
- **Privacy Design**: Excellent. By running ML models entirely in the client browser, no PII (Personally Identifiable Information) in the form of video or images is ever transmitted to the server.

---

## 12. PERFORMANCE & SCALABILITY
- **Bottlenecks**: 
  - The ML detection loop in `StudySession.js` runs synchronously in the main JavaScript thread (even though `estimateFaces` is awaited). On slower machines, this could cause the UI to stutter.
- **Database Efficiency**: The `/analytics` endpoint runs heavy `$group` operations over the `sessions` collection. As user data grows, this will require a compound index on `{ userId: 1, createdAt: -1 }`.
- **Optimization**: WebGL backend is used for TensorFlow (`await tf.setBackend('webgl')`), which is hardware accelerated and highly efficient.

---

## 13. TOPICS TO STUDY (Learning Guide)
- **TensorFlow.js in the Browser** (Advanced): Learn how WebGL hardware acceleration powers ML in the browser. Study garbage collection in TF.js (`tf.dispose()`).
- **React Performance Hooks** (Intermediate): Understand why `useRef` was used instead of `useState` in `StudySession.js` to manage the ML loop without causing re-renders.
- **MongoDB Aggregation Pipelines** (Advanced): Study `$match`, `$group`, and `$project` to understand how the Dashboard analytics are generated.
- **Web Audio & Speech API** (Beginner): Review how alarms and text-to-speech are triggered programmatically.

---

## 14. WORKING PROCEDURE (How to Run & Contribute)
- **Database**: Ensure MongoDB is running locally (`mongodb://localhost:27017/focusmate`).
- **Run Backend**: 
  - `cd backend`
  - `npm install`
  - `npm run dev` (Starts Nodemon on port 5000)
- **Run Frontend**: 
  - `cd frontend`
  - `npm install`
  - `npm start` (Starts React server on port 3000)
- **Workflow**: Create an account, allow webcam permissions, and test the phone detection feature by holding up a cell phone.

---

## 15. CODE QUALITY & IMPROVEMENT SUGGESTIONS
- **Code Smells**: `StudySession.js` is a massive "God Component" spanning over 900 lines. It handles UI, ML detection, Audio/Speech management, and API calls.
- **Refactoring Opportunities**: 
  - Extract ML logic into a custom hook: `useFocusDetection()`.
  - Extract the complex alarm/audio logic into `useAlarm()`.
- **Missing Abstractions**: Backend error handling relies on basic try/catch blocks; a global ErrorHandler middleware would clean up the route files.
- **Top Priorities**: Refactoring `StudySession.js` into smaller hooks to improve maintainability, and adding Web Worker support for TensorFlow.js to move ML inference off the main UI thread.
