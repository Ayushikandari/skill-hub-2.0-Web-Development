const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { marked } = require("marked"); // ✅ ADDED

const { initDb, readDb, writeDb, UPLOAD_DIR } = require("./server/db");
const { createToken, authRequired, requireRole, sanitizeUser } = require("./server/auth");
const { buildStudentDashboard, buildTeacherDashboard } = require("./server/analytics");
const { buildSummary, buildExplanation, buildAdaptiveQuiz } = require("./server/ai");
const { dateKey } = require("./server/seed");

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });
let attachedNotesCache = null;
let attachedNotesCachedAt = 0;

app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/storage", express.static(path.join(__dirname, "storage")));
app.use("/library", express.static(path.join(__dirname, "data")));
app.use(express.static(path.join(__dirname, "public")));

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clampMinutes(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(Math.round(parsed), 720);
}

function serializeNote(db, note) {
  const subject = db.subjects.find((entry) => entry.id === note.subjectId);
  const author = db.users.find((entry) => entry.id === note.authorId);

  return {
    ...note,
    subjectName: subject ? subject.name : "Unknown Subject",
    authorName: author ? author.name : "Unknown Author"
  };
}

///////////////////////////
// ✅ NEW: LOAD BOOKNOTES
///////////////////////////
function loadBookNotes() {
  if (attachedNotesCache && Date.now() - attachedNotesCachedAt < 15000) {
    return attachedNotesCache;
  }

  const dataRoot = path.join(__dirname, "data");
  const noteRoots = [
    { folderName: "Btech-FY-main", source: "BTech FY" },
    { folderName: "Computer-Networks-Notes-master", source: "Computer Networks" },
    { folderName: "Database-Management-Systems-Lecture-Notes-main", source: "DBMS" },
    { folderName: "DSA-Program-And-Notes-main", source: "DSA" },
    { folderName: "Software-Engineering-Notes-main", source: "Software Engineering" }
  ];
  const textExtensions = new Set([".md", ".txt", ".py", ".c", ".sql"]);
  const previewableImageExtensions = new Set([".jpg", ".jpeg", ".png"]);
  const allowedExtensions = new Set([
    ".md",
    ".pdf",
    ".docx",
    ".pptx",
    ".ppt",
    ".txt",
    ".jpg",
    ".jpeg",
    ".png",
    ".py",
    ".c",
    ".sql",
    ".dwg"
  ]);
  const notes = [];

  function stripHtml(html) {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  function inferSubject(relativePath) {
    const normalized = relativePath.toLowerCase();
    if (normalized.includes("computer-network") || normalized.includes("network")) return "Computer Networks";
    if (normalized.includes("database-management") || normalized.includes("dbms") || normalized.includes("veritaban")) {
      return "Database Management Systems";
    }
    if (normalized.includes("dsa-program") || normalized.includes("dynamic programming") || normalized.includes("graph") || normalized.includes("array") || normalized.includes("tree")) {
      return "Data Structures and Algorithms";
    }
    if (normalized.includes("software-engineering")) return "Software Engineering";
    if (normalized.includes("mathematics") || normalized.includes("math")) return "Engineering Mathematics";
    if (normalized.includes("physics")) return "Engineering Physics";
    if (normalized.includes("chemistry")) return "Engineering Chemistry";
    if (normalized.includes("programming") || normalized.includes("python") || normalized.includes("c programming")) return "Programming Fundamentals";
    if (normalized.includes("electrical")) return "Basic Electrical Engineering";
    if (normalized.includes("mechanical")) return "Engineering Mechanics";
    if (normalized.includes("design-pattern") || normalized.includes("clean-architecture") || normalized.includes("system-design")) return "Software Engineering";
    return "General Engineering";
  }

  function toFileUrl(relativePath) {
    return `/library/${relativePath
      .replaceAll("\\", "/")
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;
  }

  function buildPreview(ext, relativePath, title) {
    const parts = relativePath.split(/[\\/]/).filter(Boolean);
    const location = parts.slice(1, -1).join(" / ");
    return `${ext.slice(1).toUpperCase()} resource: ${title}${location ? ` · ${location}` : ""}`;
  }

  function readFolder(rootFolder, currentFolder, source) {
    const files = fs.readdirSync(currentFolder);

    files.forEach((file) => {
      const filePath = path.join(currentFolder, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        readFolder(rootFolder, filePath, source);
        return;
      }

      const extension = path.extname(file).toLowerCase();
      if (!allowedExtensions.has(extension)) {
        return;
      }

      const relativePath = path.relative(dataRoot, filePath);
      const relativeFolder = path.dirname(path.relative(rootFolder, filePath)).replaceAll("\\", "/");
      const title = path.basename(file, extension);
      const note = {
        id: createId("booknote"),
        title,
        subject: inferSubject(relativePath),
        category: relativeFolder === "." ? source : relativeFolder.split("/")[0],
        source,
        sourcePath: relativePath.replaceAll("\\", "/"),
        fileType: extension.slice(1).toUpperCase(),
        fileUrl: toFileUrl(relativePath)
      };

      if (textExtensions.has(extension)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const contentHtml = extension === ".md" ? marked.parse(content) : `<pre>${content}</pre>`;
        const contentText = stripHtml(contentHtml);
        notes.push({
          ...note,
          contentHtml,
          contentText,
          preview: contentText.slice(0, 260)
        });
        return;
      }

      if (previewableImageExtensions.has(extension)) {
        notes.push({
          ...note,
          contentHtml: `<img src="${toFileUrl(relativePath)}" alt="${title}" />`,
          contentText: "",
          preview: buildPreview(extension, relativePath.replaceAll("\\", "/"), title)
        });
        return;
      }

      notes.push({
        ...note,
        contentHtml: "",
        contentText: "",
        preview: buildPreview(extension, relativePath.replaceAll("\\", "/"), title)
      });
    });
  }

  noteRoots.forEach(({ folderName, source }) => {
    const rootFolder = path.join(dataRoot, folderName);
    if (fs.existsSync(rootFolder)) {
      readFolder(rootFolder, rootFolder, source);
    }
  });

  attachedNotesCache = notes;
  attachedNotesCachedAt = Date.now();
  return notes;
}

///////////////////////////
// ROUTES
///////////////////////////

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, role, branch } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!name || !normalizedEmail || !password || !["student", "teacher"].includes(role)) {
    return res.status(400).json({ error: "Name, email, password, and role are required." });
  }

  const db = readDb();
  if (db.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ error: "Account already exists." });
  }

  const user = {
    id: createId("user"),
    name,
    email: normalizedEmail,
    role,
    branch: branch || "Engineering",
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeDb(db);

  res.status(201).json({
    token: createToken(user),
    user: sanitizeUser(user)
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({
    token: createToken(user),
    user: sanitizeUser(user)
  });
});

app.get("/api/me", authRequired, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get("/api/subjects", authRequired, (_req, res) => {
  const db = readDb();
  res.json({
    subjects: db.subjects.map((subject) => ({
      ...subject,
      noteCount: db.notes.filter((note) => note.subjectId === subject.id).length,
      quizCount: db.quizzes.filter((quiz) => quiz.subjectId === subject.id).length
    }))
  });
});

app.get("/api/notes", authRequired, (req, res) => {
  const { subjectId, topic } = req.query;
  const db = readDb();
  const notes = db.notes
    .filter((note) => {
      const subjectMatch = subjectId ? note.subjectId === subjectId : true;
      const topicMatch = topic
        ? note.topic.toLowerCase().includes(String(topic).toLowerCase()) ||
          note.title.toLowerCase().includes(String(topic).toLowerCase())
        : true;
      return subjectMatch && topicMatch;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((note) => serializeNote(db, note));

  res.json({ notes });
});

app.post("/api/notes", authRequired, requireRole("teacher"), upload.single("attachment"), (req, res) => {
  const { subjectId, title, topic, content, difficulty, tags } = req.body;
  const db = readDb();

  if (!subjectId || !title || !topic || !content) {
    return res.status(400).json({ error: "Subject, title, topic, and content are required." });
  }

  const note = {
    id: createId("note"),
    subjectId,
    title: String(title).trim(),
    topic: String(topic).trim(),
    content: String(content).trim(),
    difficulty: difficulty || "Medium",
    tags: String(tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    authorId: req.user.id,
    createdAt: new Date().toISOString(),
    fileUrl: req.file ? `/storage/uploads/${req.file.filename}` : null,
    originalFilename: req.file ? req.file.originalname : null
  };

  db.notes.unshift(note);
  writeDb(db);

  return res.status(201).json({
    message: "Note uploaded successfully.",
    note: serializeNote(db, note)
  });
});

app.get("/api/booknotes", authRequired, (req, res) => {
  try {
    const query = String(req.query.q || "").trim().toLowerCase();
    const category = String(req.query.category || "").trim().toLowerCase();
    const source = String(req.query.source || "").trim().toLowerCase();
    const notes = loadBookNotes().filter((note) => {
      const haystack = `${note.title} ${note.subject} ${note.category} ${note.source} ${note.sourcePath} ${note.contentText}`.toLowerCase();
      const matchesQuery = query ? haystack.includes(query) : true;
      const matchesCategory = category ? note.category.toLowerCase() === category : true;
      const matchesSource = source ? note.source.toLowerCase() === source : true;
      return matchesQuery && matchesCategory && matchesSource;
    });
    res.json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load attached notes." });
  }
});

app.get("/api/quizzes", authRequired, (req, res) => {
  const { subjectId, topic } = req.query;
  const db = readDb();

  res.json({
    quizzes: db.quizzes
      .filter((quiz) => {
        const subjectMatch = subjectId ? quiz.subjectId === subjectId : true;
        const topicMatch = topic ? quiz.topic.toLowerCase().includes(String(topic).toLowerCase()) : true;
        return subjectMatch && topicMatch;
      })
      .map((quiz) => ({
        id: quiz.id,
        subjectId: quiz.subjectId,
        topic: quiz.topic,
        title: quiz.title,
        createdAt: quiz.createdAt,
        questionCount: quiz.questions.length
      }))
  });
});

app.post("/api/quizzes", authRequired, requireRole("teacher"), (req, res) => {
  const { subjectId, topic, title, questions } = req.body;
  const db = readDb();

  if (!subjectId || !topic || !title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Subject, topic, title, and at least one question are required." });
  }

  const normalizedQuestions = questions.map((question, index) => ({
    id: createId(`question${index + 1}`),
    prompt: String(question.prompt || "").trim(),
    options: Array.isArray(question.options)
      ? question.options.map((option) => String(option).trim()).filter(Boolean)
      : [],
    answerIndex: Number(question.answerIndex),
    explanation: String(question.explanation || "").trim()
  }));

  const invalidQuestion = normalizedQuestions.find(
    (question) =>
      !question.prompt ||
      question.options.length < 2 ||
      !Number.isInteger(question.answerIndex) ||
      question.answerIndex < 0 ||
      question.answerIndex >= question.options.length
  );

  if (invalidQuestion) {
    return res.status(400).json({ error: "Each question needs a prompt, options, and a valid answer index." });
  }

  const quiz = {
    id: createId("quiz"),
    subjectId,
    topic: String(topic).trim(),
    title: String(title).trim(),
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    questions: normalizedQuestions
  };

  db.quizzes.unshift(quiz);
  writeDb(db);

  return res.status(201).json({
    message: "Quiz created successfully.",
    quiz: {
      id: quiz.id,
      title: quiz.title,
      topic: quiz.topic,
      questionCount: quiz.questions.length
    }
  });
});

app.post("/api/quizzes/:quizId/submit", authRequired, (req, res) => {
  const { quizId } = req.params;
  const { answers } = req.body;
  const db = readDb();
  const quiz = db.quizzes.find((entry) => entry.id === quizId);

  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found." });
  }

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: "Answers must be an array." });
  }

  let correct = 0;
  const feedback = quiz.questions.map((question, index) => {
    const selectedIndex = Number(answers[index]);
    const isCorrect = selectedIndex === question.answerIndex;

    if (isCorrect) {
      correct += 1;
    }

    return {
      prompt: question.prompt,
      correctOption: question.options[question.answerIndex],
      selectedOption: Number.isInteger(selectedIndex) ? question.options[selectedIndex] : null,
      isCorrect,
      explanation: question.explanation
    };
  });

  const score = Math.round((correct / Math.max(quiz.questions.length, 1)) * 100);
  db.quizAttempts.push({
    id: createId("attempt"),
    quizId: quiz.id,
    userId: req.user.id,
    score,
    subjectId: quiz.subjectId,
    date: dateKey(0),
    answers
  });
  writeDb(db);

  return res.json({ score, feedback });
});

///////////////////////////
// EXISTING NOTES API
///////////////////////////


///////////////////////////
// ✅ NEW BOOKNOTES API
///////////////////////////


///////////////////////////
// QUIZ + AI + DASHBOARD (UNCHANGED)
///////////////////////////

app.post("/api/ai/summary", authRequired, (req, res) => {
  const db = readDb();
  res.json({ summary: buildSummary(db, req.body.subjectId, req.body.topic) });
});

app.post("/api/ai/explain", authRequired, (req, res) => {
  const db = readDb();
  res.json({
    explanation: buildExplanation(db, req.body.subjectId, req.body.topic, req.body.question)
  });
});

app.post("/api/ai/quiz", authRequired, (req, res) => {
  const db = readDb();
  const result = buildAdaptiveQuiz(db, req.body.subjectId, req.body.topic, loadBookNotes());

  if (result.quiz && result.quiz.generatedByAI) {
    const generatedQuiz = {
      id: createId("quiz"),
      subjectId: result.quiz.subjectId,
      topic: result.quiz.topic,
      title: result.quiz.title,
      createdBy: "ai_system",
      createdAt: new Date().toISOString(),
      questions: result.quiz.questions.map((question, index) => ({
        id: createId(`question${index + 1}`),
        prompt: question.prompt,
        options: question.options,
        answerIndex: question.answerIndex,
        explanation: question.explanation
      }))
    };

    db.quizzes.unshift(generatedQuiz);
    writeDb(db);

    return res.json({
      generatedReason: result.generatedReason,
      quiz: {
        id: generatedQuiz.id,
        subjectId: generatedQuiz.subjectId,
        topic: generatedQuiz.topic,
        title: generatedQuiz.title,
        generatedByAI: true,
        questions: generatedQuiz.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          options: question.options
        }))
      }
    });
  }

  res.json(result);
});

app.post("/api/study-sessions/start", authRequired, requireRole("student"), (req, res) => {
  const { subjectId, topic } = req.body;
  const db = readDb();
  const existingActive = db.studySessions.find(
    (session) => session.userId === req.user.id && session.status === "active"
  );

  if (existingActive) {
    return res.status(409).json({ error: "A study timer is already running.", activeSession: existingActive });
  }

  if (!subjectId || !topic) {
    return res.status(400).json({ error: "Subject and topic are required to start the timer." });
  }

  const session = {
    id: createId("session"),
    userId: req.user.id,
    subjectId,
    topic,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMinutes: 0,
    date: dateKey(0),
    status: "active"
  };

  db.studySessions.push(session);
  writeDb(db);

  res.status(201).json({
    message: "Study timer started.",
    session
  });
});

app.post("/api/study-sessions/stop", authRequired, requireRole("student"), (req, res) => {
  const db = readDb();
  const session = db.studySessions.find(
    (entry) => entry.userId === req.user.id && entry.status === "active"
  );

  if (!session) {
    return res.status(404).json({ error: "No active study session found." });
  }

  session.status = "completed";
  session.endedAt = new Date().toISOString();
  session.durationMinutes = clampMinutes(req.body.durationMinutes);
  writeDb(db);

  res.json({
    message: "Study session saved.",
    session
  });
});

app.get("/api/dashboard/student", authRequired, requireRole("student"), (req, res) => {
  const db = readDb();
  res.json(buildStudentDashboard(db, req.user));
});

app.get("/api/dashboard/teacher", authRequired, requireRole("teacher"), (req, res) => {
  const db = readDb();
  res.json(buildTeacherDashboard(db, req.user));
});

///////////////////////////

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
