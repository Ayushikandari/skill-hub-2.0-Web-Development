const state = {
  token: localStorage.getItem("skillhub_token") || "",
  user: null,
  subjects: [],
  dashboard: null,
  notes: [],
  attachedNotes: [],
  aiQuiz: null,
  activeTimer: null,
  selectedSubjectId: "",
  selectedTopic: "",
  attachedQuery: "",
  attachedSource: "all",
  teacherQuestionCount: 1
};

const authView = document.querySelector("#auth-view");
const dashboardView = document.querySelector("#dashboard-view");
const authMessage = document.querySelector("#auth-message");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const loginTab = document.querySelector("#login-tab");
const signupTab = document.querySelector("#signup-tab");
const logoutButton = document.querySelector("#logout-button");
const welcomeTitle = document.querySelector("#welcome-title");
const userPill = document.querySelector("#user-pill");
const dashboardContent = document.querySelector("#dashboard-content");

let timerInterval = null;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
}

function formatMinutes(minutes) {
  const total = Number(minutes || 0);
  if (total >= 60) {
    const hours = Math.floor(total / 60);
    const remainder = total % 60;
    return `${hours}h ${remainder}m`;
  }
  return `${total}m`;
}

function setAuthTab(mode) {
  const isLogin = mode === "login";
  loginTab.classList.toggle("active", isLogin);
  signupTab.classList.toggle("active", !isLogin);
  loginForm.classList.toggle("hidden", !isLogin);
  signupForm.classList.toggle("hidden", isLogin);
  setAuthMessage("");
}

function setAuthMessage(message, type = "") {
  authMessage.textContent = message || "";
  authMessage.className = `status-text ${type}`.trim();
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = "app-toast";
  node.textContent = message;
  node.style.position = "fixed";
  node.style.right = "20px";
  node.style.bottom = "20px";
  node.style.padding = "14px 18px";
  node.style.borderRadius = "16px";
  node.style.background = type === "error" ? "rgba(127,29,29,0.94)" : "rgba(6,95,70,0.94)";
  node.style.color = "#fff";
  node.style.border = "1px solid rgba(255,255,255,0.15)";
  node.style.boxShadow = "0 18px 50px rgba(0,0,0,0.28)";
  node.style.zIndex = "1200";
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2600);
}

async function api(path, options = {}) {
  const config = { ...options };
  config.headers = { ...(config.headers || {}) };

  if (state.token) {
    config.headers.Authorization = `Bearer ${state.token}`;
  }

  if (config.body && !(config.body instanceof FormData) && !config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(path, config);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function showAuth() {
  dashboardView.classList.add("hidden");
  authView.classList.remove("hidden");
}

function showDashboard() {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
}

function getSelectedSubject() {
  return state.subjects.find((subject) => subject.id === state.selectedSubjectId) || state.subjects[0];
}

function ensureSelections() {
  if (!state.selectedSubjectId && state.subjects[0]) {
    state.selectedSubjectId = state.subjects[0].id;
  }
  const subject = getSelectedSubject();
  if (!subject) {
    state.selectedTopic = "";
    return;
  }
  if (!subject.topics.includes(state.selectedTopic)) {
    state.selectedTopic = subject.topics[0] || "";
  }
}

function subjectOptionsMarkup() {
  return state.subjects
    .map(
      (subject) =>
        `<option value="${subject.id}" ${state.selectedSubjectId === subject.id ? "selected" : ""}>${escapeHtml(subject.name)}</option>`
    )
    .join("");
}

function topicOptionsMarkup(subject) {
  return (subject?.topics || [])
    .map(
      (topic) =>
        `<option value="${escapeHtml(topic)}" ${state.selectedTopic === topic ? "selected" : ""}>${escapeHtml(topic)}</option>`
    )
    .join("");
}

function normalizeAttachedNote(note) {
  return {
    id: note.id,
    title: note.title,
    subjectName: note.subject || note.category || "Attached Notes",
    topic: note.category || note.subject || "Attached Notes",
    preview: note.preview || note.contentText || "",
    contentHtml: note.contentHtml || "",
    content: note.contentText || "",
    source: note.source || "Attached Notes",
    sourcePath: note.sourcePath || "",
    fileType: note.fileType || "",
    fileUrl: note.fileUrl || "",
    filePath: note.filePath || "",
    isAttached: true
  };
}

function renderNoteBody(note) {
  if (note.contentHtml) {
    return note.contentHtml;
  }
  if (note.fileUrl) {
    return `
      <div class="status-box">
        <strong>${escapeHtml(note.fileType || "FILE")} resource</strong>
        <p class="tiny-copy">This attached note is stored as a downloadable/openable file. Use the button below to open it directly.</p>
        <p class="tiny-copy">${escapeHtml(note.sourcePath || "")}</p>
      </div>
    `;
  }
  return `<pre class="note-pre">${escapeHtml(note.content || "")}</pre>`;
}

function openNoteViewer(note) {
  const existing = document.querySelector(".note-modal-shell");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.className = "note-modal-shell";
  modal.innerHTML = `
    <div class="note-modal-backdrop" data-close-note="true"></div>
    <section class="note-modal glass-card">
      <div class="resource-head">
        <div>
          <span class="eyebrow">${escapeHtml(note.source || "SkillHub Notes")}</span>
          <h3>${escapeHtml(note.title)}</h3>
          <p class="note-meta">${escapeHtml(note.subjectName || "")}${note.topic ? ` · ${escapeHtml(note.topic)}` : ""}</p>
          ${note.sourcePath ? `<p class="tiny-copy">${escapeHtml(note.sourcePath)}</p>` : ""}
        </div>
        <button class="secondary-button" type="button" data-close-note="true">Close</button>
      </div>
      <div class="note-modal-body">${renderNoteBody(note)}</div>
      ${note.fileUrl ? `<a class="primary-button note-open-link" href="${note.fileUrl}" target="_blank" rel="noreferrer">Open ${escapeHtml(note.fileType || "file")}</a>` : ""}
    </section>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target.dataset.closeNote === "true") {
      modal.remove();
    }
  });
}

async function authenticate(path, body) {
  const payload = await api(path, { method: "POST", body });
  state.token = payload.token;
  state.user = payload.user;
  localStorage.setItem("skillhub_token", state.token);
  await loadApp();
}

async function loadAttachedNotes() {
  const result = await api("/api/booknotes");
  state.attachedNotes = result.notes
    .map(normalizeAttachedNote)
    .sort((left, right) => {
      const sourceCompare = String(left.source).localeCompare(String(right.source));
      return sourceCompare || String(left.title).localeCompare(String(right.title));
    });
}

async function loadSubjectNotes() {
  if (!state.selectedSubjectId) return;
  const result = await api(
    `/api/notes?subjectId=${encodeURIComponent(state.selectedSubjectId)}&topic=${encodeURIComponent(state.selectedTopic)}`
  );
  state.notes = result.notes.map((note) => ({
    ...note,
    preview: note.content.slice(0, 220)
  }));
}

function renderNoteCards(notes, emptyMessage) {
  if (!notes.length) {
    return `<div class="status-box"><p class="muted">${escapeHtml(emptyMessage)}</p></div>`;
  }

  return notes
    .map(
      (note) => `
        <article class="note-card">
          <div class="resource-head">
            <div>
              <h4>${escapeHtml(note.title)}</h4>
              <p class="note-meta">${escapeHtml(note.subjectName || "")}${note.topic ? ` · ${escapeHtml(note.topic)}` : ""}${note.fileType ? ` · ${escapeHtml(note.fileType)}` : ""}</p>
            </div>
            <button class="ghost-button note-open-button" type="button" data-note-id="${escapeHtml(note.id)}" data-note-source="${note.isAttached ? "attached" : "db"}">View notes</button>
          </div>
          <p class="note-content">${escapeHtml(note.preview || "")}${(note.preview || "").length >= 220 ? "..." : ""}</p>
        </article>
      `
    )
    .join("");
}

function getAttachedSourceOptions() {
  return [...new Set(state.attachedNotes.map((note) => note.source).filter(Boolean))];
}

function getFilteredAttachedNotes(subjectName = "") {
  const query = state.attachedQuery.trim().toLowerCase();
  const subjectNeedle = String(subjectName || "").toLowerCase();
  const baseFiltered = state.attachedNotes.filter((note) => {
    const haystack = `${note.title} ${note.subjectName} ${note.topic} ${note.source} ${note.sourcePath} ${note.preview}`.toLowerCase();
    const matchesQuery = query ? haystack.includes(query) : true;
    const matchesSource = state.attachedSource === "all" ? true : note.source === state.attachedSource;
    return matchesQuery && matchesSource;
  });

  if (!subjectNeedle) {
    return baseFiltered;
  }

  const subjectMatched = baseFiltered.filter((note) => {
    const haystack = `${note.title} ${note.subjectName} ${note.topic} ${note.sourcePath} ${note.preview}`.toLowerCase();
    return (
      haystack.includes(subjectNeedle) ||
      (subjectNeedle.includes("mathematics") && haystack.includes("applied-mathematics")) ||
      (subjectNeedle.includes("engineering mathematics") && haystack.includes("mathematics"))
    );
  });

  return subjectMatched.length ? subjectMatched : baseFiltered;
}

function renderWeeklyChart(weeklyMinutes) {
  return weeklyMinutes
    .map((entry) => {
      const height = Math.max(16, Math.min(150, entry.minutes * 2.2));
      return `
        <div class="chart-bar">
          <div class="tiny-label">${entry.minutes}m</div>
          <div class="chart-stick" style="height:${height}px;"></div>
          <div class="chart-label">${escapeHtml(entry.date.slice(5))}</div>
        </div>
      `;
    })
    .join("");
}

function renderSubjectCards(subjects) {
  return subjects
    .map((subject) => {
      const progress = Math.min(100, Math.round((subject.minutes / (subject.recommendedHours * 60)) * 100));
      return `
        <article class="subject-card" style="--accent-fill:${subject.accent};">
          <div class="pill">${escapeHtml(subject.code)}</div>
          <h4>${escapeHtml(subject.name)}</h4>
          <p class="note-meta">${formatMinutes(subject.minutes)} studied · ${subject.averageScore ?? "--"}% average quiz score</p>
          <div class="bar-track">
            <div class="bar-fill" style="width:${progress}%; background:${subject.accent};"></div>
          </div>
          <p class="tiny-copy">${progress}% of weekly suggested hours covered</p>
        </article>
      `;
    })
    .join("");
}

function renderAiQuiz() {
  if (!state.aiQuiz?.quiz) {
    return `<div class="status-box"><p class="muted">Generate an AI practice quiz from your selected subject and topic.</p></div>`;
  }

  return `
    <div class="quiz-card">
      <div class="resource-head">
        <div>
          <h4>${escapeHtml(state.aiQuiz.quiz.title)}</h4>
          <p class="note-meta">${escapeHtml(state.aiQuiz.generatedReason || "")}</p>
        </div>
        <span class="pill">${state.aiQuiz.quiz.questions.length} questions</span>
      </div>
      <form id="student-quiz-form" class="stack">
        ${state.aiQuiz.quiz.questions
          .map(
            (question, index) => `
              <div class="question-builder">
                <strong>Q${index + 1}. ${escapeHtml(question.prompt)}</strong>
                <div class="stack">
                  ${question.options
                    .map(
                      (option, optionIndex) => `
                        <label>
                          <input type="radio" name="question-${index}" value="${optionIndex}" />
                          ${escapeHtml(option)}
                        </label>
                      `
                    )
                    .join("")}
                </div>
              </div>
            `
          )
          .join("")}
        <button class="primary-button" type="submit">Submit quiz</button>
      </form>
      <div id="quiz-feedback" class="feedback-list"></div>
    </div>
  `;
}

function renderQuestionBuilders() {
  const container = document.querySelector("#quiz-builder-questions");
  if (!container) return;

  container.innerHTML = Array.from({ length: Math.max(1, state.teacherQuestionCount) }, (_, index) => `
    <section class="question-builder">
      <strong>Question ${index + 1}</strong>
      <input name="prompt-${index}" placeholder="Question prompt" required />
      <div class="option-grid">
        <input name="option-${index}-0" placeholder="Option 1" required />
        <input name="option-${index}-1" placeholder="Option 2" required />
        <input name="option-${index}-2" placeholder="Option 3" />
        <input name="option-${index}-3" placeholder="Option 4" />
      </div>
      <input name="answerIndex-${index}" type="number" min="0" max="3" placeholder="Correct option index (0-3)" required />
      <textarea name="explanation-${index}" placeholder="Short explanation for the answer"></textarea>
    </section>
  `).join("");
}

function renderStudentDashboard() {
  const dashboard = state.dashboard;
  const subject = getSelectedSubject();
  const attachedPreview = getFilteredAttachedNotes(subject?.name).slice(0, 12);
  const sourceOptions = getAttachedSourceOptions();

  dashboardContent.innerHTML = `
    <div class="dashboard-grid">
      <section class="panel span-8">
        <div class="section-title">
          <div>
            <span class="eyebrow">Student Dashboard</span>
            <h3>${escapeHtml(dashboard.greeting)}</h3>
            <p>Use the timer, revise notes, open attached notes, and keep your study streak moving.</p>
          </div>
          <div class="pill">Tomorrow: ${escapeHtml(dashboard.recommendation.subjectName)}</div>
        </div>
        <div class="metrics-row">
          <article class="metric-card"><span class="metric-label">Today studied</span><strong>${dashboard.snapshot.todayMinutes}m</strong><span class="tiny-label">manual timer + saved sessions</span></article>
          <article class="metric-card"><span class="metric-label">Streak</span><strong>${dashboard.snapshot.streakDays} days</strong><span class="tiny-label">Snapstreak-style consistency</span></article>
          <article class="metric-card"><span class="metric-label">Quiz confidence</span><strong>${dashboard.snapshot.averageQuizScore}%</strong><span class="tiny-label">self-check average</span></article>
          <article class="metric-card"><span class="metric-label">Weekly total</span><strong>${formatMinutes(dashboard.snapshot.totalMinutes)}</strong><span class="tiny-label">towards 300 minutes</span></article>
        </div>
      </section>

      <section class="panel span-4">
        <div class="section-title">
          <div>
            <span class="eyebrow">Tomorrow Planner</span>
            <h3>${escapeHtml(dashboard.recommendation.subjectName)}</h3>
          </div>
        </div>
        <div class="status-box">
          <p>${escapeHtml(dashboard.recommendation.reason)}</p>
          <p class="tiny-copy">${escapeHtml(dashboard.recommendation.plan)}</p>
        </div>
        <div class="chart">${renderWeeklyChart(dashboard.weeklyMinutes)}</div>
      </section>

      <section class="panel span-7">
        <div class="section-title">
          <div>
            <span class="eyebrow">AI Study Lab</span>
            <h3>Choose subject, topic, and notes</h3>
          </div>
        </div>
        <div class="flow-grid">
          <div class="stack">
            <div class="toolbar">
              <select id="student-subject-select">${subjectOptionsMarkup()}</select>
              <select id="student-topic-select">${topicOptionsMarkup(subject)}</select>
            </div>
            <div class="inline-actions">
              <button id="generate-summary" class="primary-button" type="button">AI Summary</button>
              <button id="ask-explainer" class="secondary-button" type="button">Explain Topic</button>
              <button id="generate-quiz" class="secondary-button" type="button">AI Quiz</button>
            </div>
            <label>
              Ask AI to explain something
              <textarea id="student-question" placeholder="Why does Round Robin improve fairness?"></textarea>
            </label>
            <div id="ai-output" class="stack"></div>
          </div>
          <div class="stack">
            <h4>Subject notes</h4>
            <div id="student-notes-list" class="list-stack">${renderNoteCards(state.notes, "No subject notes found for this topic yet.")}</div>
          </div>
        </div>
      </section>

      <section class="panel span-5">
        <div class="section-title">
          <div>
            <span class="eyebrow">Manual Study Timer</span>
            <h3>Focus sprint tracker</h3>
          </div>
        </div>
        <div class="timer-shell">
          <div class="timer-clock" id="timer-clock">00:00:00</div>
          <p id="timer-status" class="muted">Pick a subject and start the study timer when you begin revising.</p>
          <div class="timer-actions">
            <button id="start-timer" class="primary-button" type="button">Start timer</button>
            <button id="stop-timer" class="secondary-button" type="button">Stop and save</button>
          </div>
          <div class="status-box">
            <strong>Today’s target completion</strong>
            <p class="tiny-copy">${dashboard.snapshot.targetCompletion}% of a 90-minute deep-work target completed.</p>
          </div>
        </div>
      </section>

      <section class="panel span-6">
        <div class="section-title">
          <div>
            <span class="eyebrow">Adaptive Quiz</span>
            <h3>Check what you actually know</h3>
          </div>
        </div>
        <div id="quiz-zone">${renderAiQuiz()}</div>
      </section>

      <section class="panel span-6">
        <div class="section-title">
          <div>
            <span class="eyebrow">Subject Coverage</span>
            <h3>Engineering progress tracker</h3>
          </div>
        </div>
        <div class="subject-grid">${renderSubjectCards(dashboard.subjects)}</div>
      </section>

      <section class="panel span-12">
        <div class="section-title">
          <div>
            <span class="eyebrow">Attached Notes Library</span>
            <h3>Click any note to open the full attached content</h3>
          </div>
          <div class="pill">${attachedPreview.length} matching resources</div>
        </div>
        <div class="toolbar">
          <input id="attached-note-search" type="text" placeholder="Search attached notes, semesters, modules, files..." value="${escapeHtml(state.attachedQuery)}" />
          <select id="attached-note-source">
            <option value="all" ${state.attachedSource === "all" ? "selected" : ""}>All sources</option>
            ${sourceOptions
              .map(
                (source) =>
                  `<option value="${escapeHtml(source)}" ${state.attachedSource === source ? "selected" : ""}>${escapeHtml(source)}</option>`
              )
              .join("")}
          </select>
        </div>
        <div id="attached-notes-list" class="cards-grid">${renderNoteCards(attachedPreview, "No attached notes found for this filter.")}</div>
      </section>
    </div>
  `;

  renderNoteButtons();
  bindStudentEvents();
  mountTimer();
}

function renderTeacherDashboard() {
  const dashboard = state.dashboard;
  const sourceOptions = getAttachedSourceOptions();
  const attachedPreview = getFilteredAttachedNotes().slice(0, 16);

  dashboardContent.innerHTML = `
    <div class="dashboard-grid">
      <section class="panel span-12">
        <div class="section-title">
          <div>
            <span class="eyebrow">Teacher Dashboard</span>
            <h3>${escapeHtml(dashboard.greeting)}</h3>
            <p>Upload notes, create quizzes, use the AI helper, and review the attached note library.</p>
          </div>
        </div>
        <div class="metrics-row">
          <article class="metric-card"><span class="metric-label">Uploaded notes</span><strong>${dashboard.metrics.uploadedNotes}</strong><span class="tiny-label">seeded + teacher-created</span></article>
          <article class="metric-card"><span class="metric-label">Created quizzes</span><strong>${dashboard.metrics.createdQuizzes}</strong><span class="tiny-label">question banks published</span></article>
          <article class="metric-card"><span class="metric-label">Active learners</span><strong>${dashboard.metrics.activeLearners}</strong><span class="tiny-label">last 7 days</span></article>
          <article class="metric-card"><span class="metric-label">Coverage</span><strong>${dashboard.metrics.contentCoverage}%</strong><span class="tiny-label">subjects with notes</span></article>
        </div>
      </section>

      <section class="panel span-7">
        <div class="section-title"><div><span class="eyebrow">Notes Studio</span><h3>Upload engineering notes</h3></div></div>
        <form id="teacher-note-form" class="form-grid">
          <label>Subject<select name="subjectId">${subjectOptionsMarkup()}</select></label>
          <label>Topic<input name="topic" placeholder="Dynamic Programming" required /></label>
          <label class="full">Title<input name="title" placeholder="Mid-semester revision note" required /></label>
          <label>Difficulty<select name="difficulty"><option>Easy</option><option selected>Medium</option><option>High</option></select></label>
          <label>Tags<input name="tags" placeholder="revision, unit-2, algorithm" /></label>
          <label class="full">Note content<textarea name="content" placeholder="Paste the note content here..." required></textarea></label>
          <label class="full">Optional file upload<input type="file" name="attachment" /></label>
          <button class="primary-button full" type="submit">Upload note</button>
        </form>
      </section>

      <section class="panel span-5">
        <div class="section-title"><div><span class="eyebrow">AI Helper</span><h3>Explain a difficult concept</h3></div></div>
        <div class="stack">
          <select id="teacher-ai-subject">${subjectOptionsMarkup()}</select>
          <input id="teacher-ai-topic" placeholder="CPU Scheduling Algorithms" />
          <textarea id="teacher-ai-question" placeholder="Explain this simply for second-year students"></textarea>
          <button id="teacher-ai-button" class="secondary-button" type="button">Generate explanation</button>
          <div id="teacher-ai-output" class="stack"></div>
        </div>
      </section>

      <section class="panel span-7">
        <div class="section-title">
          <div><span class="eyebrow">Quiz Builder</span><h3>Create a question set for students</h3></div>
          <button id="add-question" class="ghost-button" type="button">Add question</button>
        </div>
        <form id="teacher-quiz-form" class="stack">
          <div class="form-grid">
            <label>Subject<select name="subjectId">${subjectOptionsMarkup()}</select></label>
            <label>Topic<input name="topic" placeholder="Normalization" required /></label>
            <label class="full">Quiz title<input name="title" placeholder="Unit 3 Rapid Check" required /></label>
          </div>
          <div id="quiz-builder-questions" class="quiz-builder-questions"></div>
          <button class="primary-button" type="submit">Publish quiz</button>
        </form>
      </section>

      <section class="panel span-5">
        <div class="section-title"><div><span class="eyebrow">Subject Analytics</span><h3>Study engagement by subject</h3></div></div>
        <div class="stack">
          ${dashboard.subjectPerformance
            .map(
              (subject) => `
                <div class="timeline-card">
                  <div class="resource-head">
                    <strong>${escapeHtml(subject.name)}</strong>
                    <span class="pill">${subject.studyMinutes}m studied</span>
                  </div>
                  <p class="tiny-copy">${subject.notesCount} notes · ${subject.quizzesCount} quizzes</p>
                  <div class="bar-track">
                    <div class="bar-fill" style="width:${Math.min(100, subject.studyMinutes)}%; background:${subject.accent};"></div>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="panel span-12">
        <div class="section-title">
          <div><span class="eyebrow">Attached Notes Library</span><h3>Open the attached note collection</h3></div>
          <div class="pill">${attachedPreview.length} matching resources</div>
        </div>
        <div class="toolbar">
          <input id="attached-note-search" type="text" placeholder="Search attached notes, semesters, modules, files..." value="${escapeHtml(state.attachedQuery)}" />
          <select id="attached-note-source">
            <option value="all" ${state.attachedSource === "all" ? "selected" : ""}>All sources</option>
            ${sourceOptions
              .map(
                (source) =>
                  `<option value="${escapeHtml(source)}" ${state.attachedSource === source ? "selected" : ""}>${escapeHtml(source)}</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="cards-grid">${renderNoteCards(attachedPreview, "No attached notes found.")}</div>
      </section>
    </div>
  `;

  renderQuestionBuilders();
  renderNoteButtons();
  bindTeacherEvents();
}

function renderSummary(summary) {
  const container = document.querySelector("#ai-output");
  if (!container) return;
  container.innerHTML = `
    <div class="status-box">
      <strong>${escapeHtml(summary.headline)}</strong>
      <div class="chip-row">${summary.bullets.map((bullet) => `<span class="chip">${escapeHtml(bullet)}</span>`).join("")}</div>
      ${summary.nextStep ? `<p class="tiny-copy">${escapeHtml(summary.nextStep)}</p>` : ""}
    </div>
    <div class="flashcards">
      ${summary.flashcards
        .map(
          (card) => `
            <article class="flashcard">
              <strong>${escapeHtml(card.front)}</strong>
              <p class="tiny-copy">${escapeHtml(card.back)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderExplanation(targetId, explanation) {
  const container = document.querySelector(targetId);
  if (!container) return;
  container.innerHTML = `
    <div class="status-box">
      <strong>${escapeHtml(explanation.title)}</strong>
      <p class="note-content">${escapeHtml(explanation.explanation)}</p>
      <div class="chip-row">${explanation.examples.map((example) => `<span class="chip">${escapeHtml(example)}</span>`).join("")}</div>
      <p class="tiny-copy">${escapeHtml(explanation.practice)}</p>
    </div>
  `;
}

function renderNoteButtons() {
  document.querySelectorAll(".note-open-button").forEach((button) => {
    button.addEventListener("click", () => {
      const source = button.dataset.noteSource;
      const noteId = button.dataset.noteId;
      const notePool = source === "attached" ? state.attachedNotes : state.notes;
      const note = notePool.find((entry) => entry.id === noteId);
      if (note) {
        openNoteViewer(note);
      }
    });
  });
}

function bindAttachedFilterControls() {
  document.querySelector("#attached-note-search")?.addEventListener("input", async (event) => {
    state.attachedQuery = event.target.value;
    await refreshDashboard();
  });

  document.querySelector("#attached-note-source")?.addEventListener("change", async (event) => {
    state.attachedSource = event.target.value;
    await refreshDashboard();
  });
}

function bindStudentQuizForm() {
  document.querySelector("#student-quiz-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.aiQuiz?.quiz) return;
    const formData = new FormData(event.currentTarget);
    const answers = state.aiQuiz.quiz.questions.map((_, index) => formData.get(`question-${index}`));
    if (answers.some((answer) => answer === null)) {
      toast("Answer every question before submitting.", "error");
      return;
    }
    const result = await api(`/api/quizzes/${state.aiQuiz.quiz.id}/submit`, {
      method: "POST",
      body: { answers: answers.map((answer) => Number(answer)) }
    });
    document.querySelector("#quiz-feedback").innerHTML = `
      <div class="feedback-card"><h4>Score: ${result.score}%</h4><p class="tiny-copy">Use the explanations below to improve quickly.</p></div>
      ${result.feedback
        .map(
          (item) => `
            <article class="feedback-card">
              <h4>${escapeHtml(item.prompt)}</h4>
              <p class="feedback-copy">${item.isCorrect ? "Correct" : "Needs revision"} · Correct answer: ${escapeHtml(item.correctOption)}</p>
              <p class="tiny-copy">${escapeHtml(item.explanation)}</p>
            </article>
          `
        )
        .join("")}
    `;
    await refreshDashboard();
  });
}

function mountTimer() {
  clearInterval(timerInterval);
  const clock = document.querySelector("#timer-clock");
  const status = document.querySelector("#timer-status");
  if (!clock || !status) return;

  const render = () => {
    if (!state.activeTimer) {
      clock.textContent = "00:00:00";
      status.textContent = "Pick a subject and start the study timer when you begin revising.";
      return;
    }
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.activeTimer.startedAt).getTime()) / 1000));
    const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    clock.textContent = `${hours}:${minutes}:${seconds}`;
    status.textContent = `Tracking ${state.activeTimer.topic} in ${getSelectedSubject()?.name || "your subject"}.`;
  };

  render();
  if (state.activeTimer) {
    timerInterval = setInterval(render, 1000);
  }
}

function bindStudentEvents() {
  document.querySelector("#student-subject-select")?.addEventListener("change", async (event) => {
    state.selectedSubjectId = event.target.value;
    ensureSelections();
    await refreshDashboard();
  });

  document.querySelector("#student-topic-select")?.addEventListener("change", async (event) => {
    state.selectedTopic = event.target.value;
    await refreshDashboard();
  });

  document.querySelector("#generate-summary")?.addEventListener("click", async () => {
    const result = await api("/api/ai/summary", {
      method: "POST",
      body: { subjectId: state.selectedSubjectId, topic: state.selectedTopic }
    });
    renderSummary(result.summary);
  });

  document.querySelector("#ask-explainer")?.addEventListener("click", async () => {
    const question = document.querySelector("#student-question")?.value || "";
    const result = await api("/api/ai/explain", {
      method: "POST",
      body: { subjectId: state.selectedSubjectId, topic: state.selectedTopic, question }
    });
    renderExplanation("#ai-output", result.explanation);
  });

  document.querySelector("#generate-quiz")?.addEventListener("click", async () => {
    state.aiQuiz = await api("/api/ai/quiz", {
      method: "POST",
      body: { subjectId: state.selectedSubjectId, topic: state.selectedTopic }
    });
    document.querySelector("#quiz-zone").innerHTML = renderAiQuiz();
    bindStudentQuizForm();
  });

  document.querySelector("#start-timer")?.addEventListener("click", async () => {
    if (state.activeTimer) {
      toast("A study timer is already running.", "error");
      return;
    }
    const result = await api("/api/study-sessions/start", {
      method: "POST",
      body: { subjectId: state.selectedSubjectId, topic: state.selectedTopic }
    });
    state.activeTimer = result.session;
    mountTimer();
    toast("Study timer started.");
  });

  document.querySelector("#stop-timer")?.addEventListener("click", async () => {
    if (!state.activeTimer) {
      toast("No active timer is running.", "error");
      return;
    }
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - new Date(state.activeTimer.startedAt).getTime()) / 60000));
    await api("/api/study-sessions/stop", {
      method: "POST",
      body: { durationMinutes: elapsedMinutes }
    });
    state.activeTimer = null;
    clearInterval(timerInterval);
    await refreshDashboard();
    toast("Study session saved.");
  });

  bindStudentQuizForm();
  bindAttachedFilterControls();
}

function bindTeacherEvents() {
  document.querySelector("#teacher-note-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await api("/api/notes", { method: "POST", body: formData });
    event.currentTarget.reset();
    toast("Note uploaded successfully.");
    await refreshDashboard();
  });

  document.querySelector("#teacher-ai-button")?.addEventListener("click", async () => {
    const subjectId = document.querySelector("#teacher-ai-subject")?.value;
    const topic = document.querySelector("#teacher-ai-topic")?.value || "";
    const question = document.querySelector("#teacher-ai-question")?.value || "";
    const result = await api("/api/ai/explain", {
      method: "POST",
      body: { subjectId, topic, question }
    });
    renderExplanation("#teacher-ai-output", result.explanation);
  });

  document.querySelector("#add-question")?.addEventListener("click", () => {
    state.teacherQuestionCount += 1;
    renderQuestionBuilders();
  });

  document.querySelector("#teacher-quiz-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const questions = Array.from({ length: state.teacherQuestionCount }, (_, index) => ({
      prompt: formData.get(`prompt-${index}`),
      options: [0, 1, 2, 3].map((optionIndex) => formData.get(`option-${index}-${optionIndex}`)).filter(Boolean),
      answerIndex: Number(formData.get(`answerIndex-${index}`)),
      explanation: formData.get(`explanation-${index}`)
    }));
    await api("/api/quizzes", {
      method: "POST",
      body: {
        subjectId: formData.get("subjectId"),
        topic: formData.get("topic"),
        title: formData.get("title"),
        questions
      }
    });
    state.teacherQuestionCount = 1;
    event.currentTarget.reset();
    renderQuestionBuilders();
    toast("Quiz published.");
    await refreshDashboard();
  });

  bindAttachedFilterControls();
}

async function refreshDashboard() {
  state.dashboard = await api(`/api/dashboard/${state.user.role}`);
  if (state.user.role === "student") {
    ensureSelections();
    state.activeTimer = state.dashboard.activeSession || null;
    await loadSubjectNotes();
    renderStudentDashboard();
  } else {
    renderTeacherDashboard();
  }
}

async function loadApp() {
  showDashboard();
  const me = await api("/api/me");
  state.user = me.user;
  state.subjects = (await api("/api/subjects")).subjects;
  ensureSelections();
  await loadAttachedNotes();
  welcomeTitle.textContent = `${state.user.role === "teacher" ? "Teacher" : "Student"} workspace`;
  userPill.textContent = `${state.user.name} · ${state.user.role}`;
  await refreshDashboard();
}

loginTab.addEventListener("click", () => setAuthTab("login"));
signupTab.addEventListener("click", () => setAuthTab("signup"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const formData = new FormData(loginForm);
    await authenticate("/api/auth/login", {
      email: formData.get("email"),
      password: formData.get("password")
    });
  } catch (error) {
    setAuthMessage(error.message, "error");
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const formData = new FormData(signupForm);
    await authenticate("/api/auth/signup", {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
      branch: formData.get("branch")
    });
  } catch (error) {
    setAuthMessage(error.message, "error");
  }
});

logoutButton.addEventListener("click", () => {
  state.token = "";
  state.user = null;
  state.aiQuiz = null;
  state.activeTimer = null;
  clearInterval(timerInterval);
  localStorage.removeItem("skillhub_token");
  showAuth();
  setAuthTab("login");
});

(async function init() {
  setAuthTab("login");
  if (!state.token) {
    showAuth();
    return;
  }
  try {
    await loadApp();
  } catch (_error) {
    state.token = "";
    localStorage.removeItem("skillhub_token");
    showAuth();
  }
})();
