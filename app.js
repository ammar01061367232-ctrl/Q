const state = {
  lang: localStorage.getItem("fp_lang") || "ar",
  theme: localStorage.getItem("fp_theme") || "light",
  view: "home",
  currTab: "all",
  assTab: "all",
  revealAll: false,
  xp: Number(localStorage.getItem("fp_xp") || 0),
  doneLessons: JSON.parse(localStorage.getItem("fp_done") || "[]"),
  activeLesson: null,
  flashIdx: 0,
  posts: JSON.parse(localStorage.getItem("fp_posts") || '[{"author":"فريق المنصة","msg":"أهلاً بكم في نبض المستقبل! شاركونا أسئلتكم واستفساراتكم.","time":"الآن"}]'),
  team: JSON.parse(localStorage.getItem("fp_team") || JSON.stringify(DEFAULT_TEAM)),
  user: JSON.parse(localStorage.getItem("fp_user") || "null"),
  authMode: "login",
  quiz: { sub: "all", len: 5, list: [], idx: 0, score: 0, mistakes: [], timer: null, sec: 45 },
  pomo: { sec: 1500, interval: null }
};

function t(key) {
  return I18N[state.lang][key] || key;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add("hidden"), 2800);
}

function addXP(pts) {
  state.xp += pts;
  localStorage.setItem("fp_xp", state.xp);
  updateStats();
}

// Language & Theme
function applyI18n() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.getElementById("lang-btn").textContent = state.lang === "ar" ? "English" : "عربي";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-ph]").forEach(el => {
    el.placeholder = t(el.dataset.ph);
  });

  renderTabs();
  renderLessons();
  renderAssessments();
  renderQuizSetup();
  updateStats();
  updateAuthBtn();
}

function toggleLanguage() {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("fp_lang", state.lang);
  applyI18n();
}

function applyTheme() {
  document.body.classList.toggle("dark", state.theme === "dark");
  document.getElementById("theme-btn").textContent = state.theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  localStorage.setItem("fp_theme", state.theme);
  applyTheme();
}

// Navigation
function navigate(view) {
  state.view = view;
  document.getElementById("nav").classList.remove("open");
  document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("active", b.dataset.view === view));

  const hero = document.getElementById("hero");
  const pHeader = document.getElementById("portal-header");
  const secLessons = document.getElementById("lessons");
  const secAss = document.getElementById("assessments");

  if (view === "home") {
    hero.classList.remove("hidden");
    pHeader.classList.add("hidden");
    secLessons.classList.remove("hidden");
    secAss.classList.remove("hidden");
    state.currTab = "all";
    state.assTab = "all";
  } else if (view === "assessments") {
    hero.classList.add("hidden");
    pHeader.classList.remove("hidden");
    secLessons.classList.add("hidden");
    secAss.classList.remove("hidden");
    document.getElementById("portal-title").textContent = t("navAss");
    document.getElementById("portal-desc").textContent = state.lang === "ar" ? "تدرب على الأسئلة النموذجية مع الحلول التفصيلية." : "Practice model questions with detailed answers.";
  } else if (SUBJECTS[view]) {
    hero.classList.add("hidden");
    pHeader.classList.remove("hidden");
    secLessons.classList.remove("hidden");
    secAss.classList.remove("hidden");
    document.getElementById("portal-title").textContent = SUBJECTS[view][state.lang];
    document.getElementById("portal-desc").textContent = state.lang === "ar" ? SUBJECTS[view].descAr : SUBJECTS[view].descEn;
    state.currTab = view;
    state.assTab = view;
  }

  renderTabs();
  renderLessons();
  renderAssessments();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Stats & Counts
function updateStats() {
  document.getElementById("xp-display").textContent = `${state.xp} XP`;
  document.getElementById("st-lessons").textContent = LESSONS.length;
  document.getElementById("st-ass").textContent = ASSESSMENTS.length;
  document.getElementById("st-quiz").textContent = QUESTIONS.length;

  const pct = Math.round((state.doneLessons.length / LESSONS.length) * 100);
  document.getElementById("progress-text").textContent = `${pct}%`;
  document.getElementById("progress-bar").style.width = `${pct}%`;

  const suffix = state.lang === "ar" ? " دروس" : " Lessons";
  ["arabic", "english", "history", "prog"].forEach(s => {
    const count = LESSONS.filter(l => l.sub === s).length;
    document.getElementById(`cnt-${s}`).textContent = count + suffix;
  });
  document.getElementById("cnt-ass").textContent = ASSESSMENTS.length + (state.lang === "ar" ? " تقييم" : " Items");
}

// Tabs, Lessons & Assessments
function renderTabs() {
  const keys = ["all", "arabic", "english", "history", "prog"];
  document.getElementById("curr-tabs").innerHTML = keys.map(k =>
    `<button class="${state.currTab === k ? "active" : ""}" onclick="state.currTab='${k}';renderTabs();renderLessons()">${k === "all" ? t("all") : SUBJECTS[k][state.lang]}</button>`
  ).join("");

  document.getElementById("ass-tabs").innerHTML = keys.map(k =>
    `<button class="${state.assTab === k ? "active" : ""}" onclick="state.assTab='${k}';renderTabs();renderAssessments()">${k === "all" ? t("all") : SUBJECTS[k][state.lang]}</button>`
  ).join("");
}

function renderLessons() {
  const q = document.getElementById("lesson-search").value.trim().toLowerCase();
  const list = LESSONS.filter(l =>
    (state.currTab === "all" || l.sub === state.currTab) &&
    (!q || l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q))
  );

  document.getElementById("lessons-grid").innerHTML = list.map(l => {
    const isDone = state.doneLessons.includes(l.id);
    return `
      <div class="card lesson-card ${isDone ? "done" : ""}">
        <div>
          <div class="row"><span class="pill">${SUBJECTS[l.sub][state.lang]}</span><small class="muted">${l.unit}</small></div>
          <h3 style="margin:10px 0 6px">${l.title}</h3>
          <p class="muted" style="font-size:0.9rem">${l.summary}</p>
        </div>
        <button class="btn-primary small" onclick="openLesson('${l.id}')">${isDone ? t("completed") : t("readLesson")}</button>
      </div>`;
  }).join("");
}

function openLesson(id) {
  const l = LESSONS.find(x => x.id === id);
  if (!l) return;
  state.activeLesson = l;
  document.getElementById("m-unit").textContent = `${SUBJECTS[l.sub][state.lang]} • ${l.unit}`;
  document.getElementById("m-title").textContent = l.title;
  document.getElementById("m-body").innerHTML = l.content;
  const isDone = state.doneLessons.includes(l.id);
  document.getElementById("m-done").textContent = isDone ? t("completed") : t("markDone");
  document.getElementById("lesson-modal").classList.remove("hidden");
}

function closeLesson() {
  document.getElementById("lesson-modal").classList.add("hidden");
}

function completeLesson() {
  if (!state.activeLesson) return;
  const id = state.activeLesson.id;
  if (!state.doneLessons.includes(id)) {
    state.doneLessons.push(id);
    localStorage.setItem("fp_done", JSON.stringify(state.doneLessons));
    addXP(20);
    toast("+20 XP!");
  }
  document.getElementById("m-done").textContent = t("completed");
  renderLessons();
}

function jumpQuiz() {
  if (state.activeLesson) state.quiz.sub = state.activeLesson.sub;
  closeLesson();
  renderQuizSetup();
  document.getElementById("quiz-hub").scrollIntoView({ behavior: "smooth" });
}

function renderAssessments() {
  const list = ASSESSMENTS.filter(a => state.assTab === "all" || a.sub === state.assTab);
  document.getElementById("reveal-all").textContent = state.revealAll ? t("hideAll") : t("revealAll");

  document.getElementById("ass-grid").innerHTML = list.map(a => `
    <div class="card">
      <span class="pill">${SUBJECTS[a.sub][state.lang]}</span>
      <h4 style="margin:10px 0">${a.q}</h4>
      <button class="btn-soft" onclick="this.nextElementSibling.classList.toggle('hidden')">${t("showAns")}</button>
      <div class="feedback ${state.revealAll ? "" : "hidden"}">${a.a}</div>
    </div>
  `).join("");
}

function toggleRevealAll() {
  state.revealAll = !state.revealAll;
  renderAssessments();
}

// YouTube Player
function loadYT() {
  const url = document.getElementById("yt-url").value.trim();
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return toast(state.lang === "ar" ? "رابط يوتيوب غير صحيح" : "Invalid YouTube URL");
  document.getElementById("yt").src = `https://www.youtube.com/embed/${match[1]}`;
}

// Quiz Engine
function renderQuizSetup() {
  const subs = ["all", "arabic", "english", "history", "prog"];
  document.getElementById("qsub-list").innerHTML = subs.map(s =>
    `<button class="choice-btn ${state.quiz.sub === s ? "selected" : ""}" onclick="state.quiz.sub='${s}';renderQuizSetup()">${s === "all" ? t("all") : SUBJECTS[s][state.lang]}</button>`
  ).join("");

  document.getElementById("qlen-list").innerHTML = [3, 5, 7].map(n =>
    `<button class="btn-soft ${state.quiz.len === n ? "btn-primary" : ""}" onclick="state.quiz.len=${n};renderQuizSetup()">${n}</button>`
  ).join("");
}

function startQuiz() {
  let pool = QUESTIONS.filter(q => state.quiz.sub === "all" || q.sub === state.quiz.sub);
  pool = pool.sort(() => Math.random() - 0.5).slice(0, state.quiz.len);
  if (!pool.length) return;

  state.quiz.list = pool;
  state.quiz.idx = 0;
  state.quiz.score = 0;
  state.quiz.mistakes = [];

  document.getElementById("quiz-setup").classList.add("hidden");
  document.getElementById("quiz-result").classList.add("hidden");
  document.getElementById("quiz-active").classList.remove("hidden");
  showQuestion();
}

function showQuestion() {
  clearInterval(state.quiz.timer);
  const q = state.quiz.list[state.quiz.idx];
  document.getElementById("q-counter").textContent = `${state.quiz.idx + 1} / ${state.quiz.list.length}`;
  document.getElementById("q-text").textContent = q.q;
  document.getElementById("q-feedback").classList.add("hidden");
  document.getElementById("q-next").classList.add("hidden");

  document.getElementById("q-options").innerHTML = q.opts.map((opt, i) =>
    `<button class="choice-btn" onclick="answerQ(${i}, this)">${opt}</button>`
  ).join("");

  const timerEl = document.getElementById("q-timer");
  if (document.getElementById("timed").checked) {
    state.quiz.sec = 45;
    timerEl.classList.remove("hidden");
    timerEl.textContent = `${state.quiz.sec}s`;
    state.quiz.timer = setInterval(() => {
      state.quiz.sec--;
      timerEl.textContent = `${state.quiz.sec}s`;
      if (state.quiz.sec <= 0) {
        clearInterval(state.quiz.timer);
        answerQ(-1, null);
      }
    }, 1000);
  } else {
    timerEl.classList.add("hidden");
  }
}

function answerQ(choice, btn) {
  clearInterval(state.quiz.timer);
  const q = state.quiz.list[state.quiz.idx];
  const buttons = document.querySelectorAll("#q-options button");
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.ans) b.classList.add("correct");
  });

  if (choice === q.ans) {
    state.quiz.score++;
    addXP(10);
  } else {
    if (btn) btn.classList.add("wrong");
    state.quiz.mistakes.push({ q: q.q, right: q.opts[q.ans] });
  }

  const fb = document.getElementById("q-feedback");
  fb.textContent = q.exp;
  fb.classList.remove("hidden");
  document.getElementById("q-next").classList.remove("hidden");
}

function nextQ() {
  state.quiz.idx++;
  if (state.quiz.idx < state.quiz.list.length) showQuestion();
  else finishQuiz();
}

function finishQuiz() {
  document.getElementById("quiz-active").classList.add("hidden");
  document.getElementById("quiz-result").classList.remove("hidden");
  const total = state.quiz.list.length;
  document.getElementById("score-title").textContent = `${state.quiz.score} / ${total}`;
  document.getElementById("score-msg").textContent = state.lang === "ar"
    ? `أحسنت! حصلت على ${state.quiz.score * 10} نقطة XP إضافية.`
    : `Well done! You earned ${state.quiz.score * 10} bonus XP.`;

  document.getElementById("mistakes").innerHTML = state.quiz.mistakes.map(m =>
    `<div class="card"><b>${m.q}</b><br><span style="color:#16a34a">✓ ${m.right}</span></div>`
  ).join("");
}

function resetQuiz() {
  clearInterval(state.quiz.timer);
  document.getElementById("quiz-active").classList.add("hidden");
  document.getElementById("quiz-result").classList.add("hidden");
  document.getElementById("quiz-setup").classList.remove("hidden");
}

// Labs: Python, I'rab, Flashcards, Pomodoro
function loadPreset() {
  const p = PY_PRESETS[document.getElementById("py-select").value];
  document.getElementById("py-code").value = p.code;
  document.getElementById("py-out").textContent = ">>> Ready";
}

function runPy() {
  const p = PY_PRESETS[document.getElementById("py-select").value];
  document.getElementById("py-out").textContent = p.out;
}

function irab(idx) {
  document.getElementById("irab-out").innerHTML = IRAB_DATA[idx];
}

function renderFlash() {
  const card = FLASHCARDS[state.flashIdx];
  document.getElementById("flash").classList.remove("flipped");
  document.getElementById("f-front").textContent = card.f;
  document.getElementById("f-back").textContent = card.b;
  document.getElementById("f-count").textContent = `${state.flashIdx + 1} / ${FLASHCARDS.length}`;
}

function flash(dir) {
  state.flashIdx = (state.flashIdx + dir + FLASHCARDS.length) % FLASHCARDS.length;
  renderFlash();
}

function updatePomoUI() {
  const m = String(Math.floor(state.pomo.sec / 60)).padStart(2, "0");
  const s = String(state.pomo.sec % 60).padStart(2, "0");
  document.getElementById("pomo").textContent = `${m}:${s}`;
}

function pomoStart() {
  if (state.pomo.interval) return;
  state.pomo.interval = setInterval(() => {
    if (state.pomo.sec > 0) {
      state.pomo.sec--;
      updatePomoUI();
    } else {
      pomoPause();
      addXP(25);
      toast("Pomodoro Complete! +25 XP");
    }
  }, 1000);
}

function pomoPause() {
  clearInterval(state.pomo.interval);
  state.pomo.interval = null;
}

function pomoReset() {
  pomoPause();
  state.pomo.sec = 1500;
  updatePomoUI();
}

// Community, Team & Support
function renderPosts() {
  document.getElementById("posts").innerHTML = state.posts.map(p => `
    <div class="post-item">
      <div class="row"><b>${p.author}</b><small class="muted">${p.time}</small></div>
      <p style="margin-top:4px">${p.msg}</p>
    </div>
  `).join("");
}

function addPost() {
  const author = document.getElementById("c-author").value.trim() || (state.lang === "ar" ? "طالب" : "Student");
  const msg = document.getElementById("c-msg").value.trim();
  if (!msg) return;
  state.posts.unshift({ author, msg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
  localStorage.setItem("fp_posts", JSON.stringify(state.posts));
  document.getElementById("c-msg").value = "";
  renderPosts();
}

function renderTeam() {
  document.getElementById("team-grid").innerHTML = state.team.map(m => `
    <div class="card team-card">
      <div class="avatar">${m.name.trim()[0]}</div>
      <h4>${m.name}</h4>
      <small class="muted">${m.role}</small>
    </div>
  `).join("");
}

function openTeam() {
  document.getElementById("team-inputs").innerHTML = state.team.map((m, i) => `
    <div class="row-gap" style="margin-bottom:10px">
      <input type="text" id="tn-${i}" value="${m.name}">
      <input type="text" id="tr-${i}" value="${m.role}">
    </div>
  `).join("");
  document.getElementById("team-modal").classList.remove("hidden");
}

function closeTeam() {
  document.getElementById("team-modal").classList.add("hidden");
}

function saveTeam() {
  state.team = state.team.map((_, i) => ({
    name: document.getElementById(`tn-${i}`).value.trim() || DEFAULT_TEAM[i].name,
    role: document.getElementById(`tr-${i}`).value.trim() || DEFAULT_TEAM[i].role
  }));
  localStorage.setItem("fp_team", JSON.stringify(state.team));
  renderTeam();
  closeTeam();
  toast(state.lang === "ar" ? "تم حفظ بيانات الفريق" : "Team updated");
}

function copyPhone() {
  navigator.clipboard?.writeText("01061367232");
  toast(state.lang === "ar" ? "تم نسخ الرقم" : "Phone copied");
}

function sendSupport(e) {
  e.preventDefault();
  e.target.reset();
  toast(state.lang === "ar" ? "تم تسجيل رسالتك محلياً بنجاح" : "Message logged locally");
}

// Local Auth
function updateAuthBtn() {
  document.getElementById("auth-btn").textContent = state.user ? state.user.name.split(" ")[0] : t("login");
}

function openAuth() {
  const form = document.getElementById("auth-form");
  const prof = document.getElementById("auth-profile");
  if (state.user) {
    form.classList.add("hidden");
    prof.classList.remove("hidden");
    document.getElementById("auth-title").textContent = state.user.name;
    document.getElementById("p-name").textContent = state.user.name;
    document.getElementById("p-email").textContent = state.user.email;
    document.getElementById("p-xp").textContent = `${state.xp} XP`;
  } else {
    form.classList.remove("hidden");
    prof.classList.add("hidden");
    renderAuthForm();
  }
  document.getElementById("auth-modal").classList.remove("hidden");
}

function closeAuth() {
  document.getElementById("auth-modal").classList.add("hidden");
}

function renderAuthForm() {
  const isReg = state.authMode === "register";
  document.getElementById("auth-title").textContent = isReg ? (state.lang === "ar" ? "إنشاء حساب" : "Register") : t("login");
  document.getElementById("a-name").classList.toggle("hidden", !isReg);
  document.getElementById("a-submit").textContent = isReg ? (state.lang === "ar" ? "تسجيل" : "Sign Up") : t("login");
  document.getElementById("a-switch").textContent = isReg
    ? (state.lang === "ar" ? "لديك حساب بالفعل؟ تسجيل الدخول" : "Already have an account? Login")
    : (state.lang === "ar" ? "ليس لديك حساب؟ إنشاء حساب جديد" : "No account? Create one");
}

function switchAuth() {
  state.authMode = state.authMode === "login" ? "register" : "login";
  renderAuthForm();
}

function submitAuth(e) {
  e.preventDefault();
  const email = document.getElementById("a-email").value.trim();
  const name = document.getElementById("a-name").value.trim() || email.split("@")[0];
  state.user = { name, email };
  localStorage.setItem("fp_user", JSON.stringify(state.user));
  updateAuthBtn();
  closeAuth();
  toast(state.lang === "ar" ? `مرحباً، ${name}!` : `Welcome, ${name}!`);
}

function logout() {
  state.user = null;
  localStorage.removeItem("fp_user");
  updateAuthBtn();
  closeAuth();
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  applyI18n();
  loadPreset();
  irab(0);
  renderFlash();
  updatePomoUI();
  renderPosts();
  renderTeam();
});
