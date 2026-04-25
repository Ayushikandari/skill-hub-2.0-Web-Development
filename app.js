const state = {
  token: localStorage.getItem("skillhub_token") || "",
  user: null,
  subjects: [],
  notes: [],
  selectedSubjectId: "",
  selectedTopic: ""
};

const authView = document.getElementById("auth-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const logoutButton = document.getElementById("logout-button");
const welcomeTitle = document.getElementById("welcome-title");
const userPill = document.getElementById("user-pill");

function showAuth() {
  authView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
}

function showDashboard() {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: state.token ? `Bearer ${state.token}` : ""
    }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");

  return data;
}

/* ======================
   LOAD BOOK NOTES
====================== */
async function loadBookNotes() {
  try {
    const res = await fetch("/api/booknotes");
    const data = await res.json();

    return data.notes.map(n => ({
      title: n.title,
      subjectName: n.subject,
      content: n.content
    }));
  } catch {
    return [];
  }
}

/* ======================
   LOAD NOTES (MERGED)
====================== */
async function loadNotes() {
  if (!state.selectedSubjectId) return;

  try {
    const dbNotes = await api(
      `/api/notes?subjectId=${state.selectedSubjectId}`
    );

    const bookNotes = await loadBookNotes();

    state.notes = [...dbNotes.notes, ...bookNotes];

  } catch {
    state.notes = [];
  }

  renderNotes();
}

/* ======================
   RENDER NOTES
====================== */
function renderNotes() {
  const container = document.getElementById("student-notes-list");

  if (!state.notes.length) {
    container.innerHTML = "<p>No notes found</p>";
    return;
  }

  container.innerHTML = state.notes.map(n => `
    <div class="note">
      <h4>${n.title}</h4>
      <small>${n.subjectName}</small>
      <div>${n.content}</div>
    </div>
  `).join("");
}

/* ======================
   AUTH
====================== */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(loginForm);

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });

    state.token = data.token;
    localStorage.setItem("skillhub_token", state.token);

    loadApp();

  } catch (err) {
    alert(err.message);
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(signupForm);

  try {
    const data = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role")
      })
    });

    state.token = data.token;
    localStorage.setItem("skillhub_token", state.token);

    loadApp();

  } catch (err) {
    alert(err.message);
  }
});

logoutButton.addEventListener("click", () => {
  state.token = "";
  localStorage.removeItem("skillhub_token");
  showAuth();
});

/* ======================
   INIT APP
====================== */
async function loadApp() {
  showDashboard();

  const me = await api("/api/me");
  state.user = me.user;

  welcomeTitle.textContent = `${state.user.name}'s Dashboard`;
  userPill.textContent = state.user.role;

  const subjects = await api("/api/subjects");
  state.subjects = subjects.subjects;

  state.selectedSubjectId = state.subjects[0]?.id || "";

  await loadNotes();
}

/* ======================
   START
====================== */
if (state.token) {
  loadApp();
} else {
  showAuth();
}