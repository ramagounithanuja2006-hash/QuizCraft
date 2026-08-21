/* ============================================================
   QuizCraft — Online Quiz Maker
   Vanilla JS single-page app with localStorage persistence.
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   Storage layer (localStorage)
   ------------------------------------------------------------ */
const LS = {
  users: 'qc_users',
  quizzes: 'qc_quizzes',
  attempts: 'qc_attempts',
  session: 'qc_session',
  seeded: 'qc_seeded_v1'
};

const DB = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const val = JSON.parse(raw);
      return val === null ? fallback : val;
    } catch (e) {
      return fallback;
    }
  },
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* cyrb53 — demo-grade, client-side-only password hashing.
   (A real product must hash passwords server-side with bcrypt/argon2.) */
function hashPassword(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? ' hr ago' : ' hrs ago');
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  return formatDate(ts);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------
   Categories
   ------------------------------------------------------------ */
const CATEGORIES = ['General', 'Science', 'Math', 'History', 'Tech', 'Sports', 'Other'];
const CATEGORY_COLORS = {
  General: '#6366f1', Science: '#10b981', Math: '#f59e0b',
  History: '#f43f5e', Tech: '#06b6d4', Sports: '#f97316', Other: '#64748b'
};

function catBadge(cat) {
  const c = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
  return '<span class="badge" style="--badge-color:' + c + '">' + esc(cat || 'Other') + '</span>';
}

/* ------------------------------------------------------------
   State
   ------------------------------------------------------------ */
const state = {
  view: 'home',
  user: null,                 // logged-in user object or null
  authMode: 'login',          // 'login' | 'register'
  postLogin: null,            // where to go after logging in
  editingQuizId: null,        // quiz being edited in the creator
  take: null,                 // { quiz, index, answers[] } while taking
  results: null,              // { quiz, attempt } for results screen
  browse: { search: '', category: 'all' }
};

const getUsers    = () => DB.read(LS.users, []);
const getQuizzes  = () => DB.read(LS.quizzes, []);
const getAttempts = () => DB.read(LS.attempts, []);
const getQuiz     = id => getQuizzes().find(q => q.id === id) || null;
const usernameOf  = uidv => { const u = getUsers().find(x => x.id === uidv); return u ? u.username : 'Unknown'; };
const attemptCount = quizId => getAttempts().filter(a => a.quizId === quizId).length;

/* ------------------------------------------------------------
   Seed sample content on first run
   ------------------------------------------------------------ */
function seedIfNeeded() {
  if (DB.read(LS.seeded, false)) return;

  const users = getUsers();
  if (!users.some(u => u.id === 'demo-user')) {
    users.push({
      id: 'demo-user',
      username: 'quizmaster',
      email: 'demo@quizcraft.app',
      passHash: hashPassword('demo123'),
      createdAt: Date.now()
    });
    DB.write(LS.users, users);
  }

  if (getQuizzes().length === 0) {
    const q = (text, options, correct) => ({ text, options, correct });
    const mk = (title, description, category, questions, daysAgo) => ({
      id: uid() + daysAgo,
      title, description, category, questions,
      createdBy: 'demo-user',
      createdAt: Date.now() - daysAgo * 86400000
    });

    DB.write(LS.quizzes, [
      mk('General Knowledge Challenge', 'Test how much you know about the world around you — geography, art, money and more!', 'General', [
        q('What is the capital of France?', ['London', 'Berlin', 'Paris', 'Madrid'], 2),
        q('Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Saturn'], 1),
        q('Which is the largest ocean on Earth?', ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'], 3),
        q('Who painted the Mona Lisa?', ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Claude Monet'], 2),
        q('What is the currency of Japan?', ['Won', 'Yuan', 'Yen', 'Ringgit'], 2)
      ], 5),
      mk('Science Fundamentals', 'Atoms, light, gravity and green plants — the building blocks of science in five questions.', 'Science', [
        q('What is the chemical symbol for water?', ['O2', 'H2O', 'CO2', 'NaCl'], 1),
        q('Which gas do plants absorb from the atmosphere?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2),
        q('Approximately how fast does light travel?', ['300 km/s', '3,000 km/s', '300,000 km/s', '30,000 km/s'], 2),
        q('What is the centre of an atom called?', ['Electron', 'Proton', 'Neutron', 'Nucleus'], 3),
        q('Which force pulls objects towards the Earth?', ['Friction', 'Magnetism', 'Gravity', 'Inertia'], 2)
      ], 3),
      mk('Quick Maths Warm-up', 'Five quick arithmetic and geometry questions to get your brain ticking.', 'Math', [
        q('What is 7 × 8?', ['54', '56', '63', '48'], 1),
        q('What is the square root of 144?', ['10', '11', '12', '14'], 2),
        q('What is the value of π to two decimal places?', ['3.12', '3.14', '3.16', '3.18'], 1),
        q('What is 15% of 200?', ['20', '25', '30', '35'], 2),
        q('How many sides does a hexagon have?', ['5', '6', '7', '8'], 1)
      ], 2),
      mk('Web Dev Basics', 'A quick check of core web development knowledge: HTML, CSS, JavaScript and hardware.', 'Tech', [
        q('What does HTML stand for?', ['HyperText Markup Language', 'Home Tool Markup Language', 'Hyperlinks and Text Management Language', 'HighText Machine Language'], 0),
        q('Which language is primarily used to style web pages?', ['HTML', 'CSS', 'Python', 'SQL'], 1),
        q('Which company originally created JavaScript?', ['Microsoft', 'Apple', 'Netscape', 'Sun Microsystems'], 2),
        q('What does CPU stand for?', ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Utility'], 0),
        q('Which HTML tag creates a hyperlink?', ['<link>', '<a>', '<href>', '<url>'], 1)
      ], 1)
    ]);
  }

  DB.write(LS.seeded, true);
}

/* ------------------------------------------------------------
   Toast + Modal
   ------------------------------------------------------------ */
let toastTimer = null;
function toast(msg, type) {
  const el = $('#toast');
  el.className = 'toast show ' + (type || 'info');
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function closeModal() {
  const root = $('#modalRoot');
  root.innerHTML = '';
}
function openModal(html) {
  $('#modalRoot').innerHTML =
    '<div class="modal-backdrop" id="modalBackdrop"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
  $('#modalBackdrop').addEventListener('click', e => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
}
function confirmModal(opts) {
  openModal(
    '<h3>' + esc(opts.title) + '</h3>' +
    '<p>' + esc(opts.message) + '</p>' +
    '<div class="modal-actions">' +
      '<button class="btn btn-ghost" id="modalCancel">Cancel</button>' +
      '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" id="modalOk">' + esc(opts.confirmText || 'Confirm') + '</button>' +
    '</div>'
  );
  $('#modalCancel').onclick = closeModal;
  $('#modalOk').onclick = () => { closeModal(); opts.onConfirm(); };
}

/* ------------------------------------------------------------
   Router
   ------------------------------------------------------------ */
const GUARDED = { create: true, dashboard: true };

function navigate(view) {
  if (GUARDED[view] && !state.user) {
    state.postLogin = view;
    state.authMode = 'login';
    toast('Please log in to continue', 'info');
    view = 'auth';
  }
  state.view = view;
  closeModal();
  closeMobileMenu();
  render();
  if (window.scrollTo) { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* noop */ } }
}

function render() {
  const views = {
    home: viewHome,
    auth: viewAuth,
    create: viewCreate,
    browse: viewBrowse,
    take: viewTake,
    results: viewResults,
    dashboard: viewDashboard
  };
  const fn = views[state.view] || viewHome;
  $('#app').innerHTML = '<div class="view">' + fn() + '</div>';
  const binds = {
    home: bindHome, auth: bindAuth, create: bindCreate, browse: bindBrowse,
    take: bindTake, results: bindResults, dashboard: bindDashboard
  };
  if (binds[state.view]) binds[state.view]();
  updateNav();
}

/* ------------------------------------------------------------
   Navbar
   ------------------------------------------------------------ */
function updateNav() {
  $$('.nav-links .auth-only').forEach(a => a.classList.toggle('hidden', !state.user));
  $$('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.nav === state.view));

  const na = $('#navActions');
  if (state.user) {
    na.innerHTML =
      '<span class="user-chip" title="' + esc(state.user.email) + '">👤 ' + esc(state.user.username) + '</span>' +
      '<button class="btn btn-outline btn-sm" id="logoutBtn">Log out</button>';
    $('#logoutBtn').onclick = logout;
  } else {
    na.innerHTML =
      '<button class="btn btn-ghost btn-sm" id="loginNavBtn">Log in</button>' +
      '<button class="btn btn-primary btn-sm" id="signupNavBtn">Sign up</button>';
    $('#loginNavBtn').onclick = () => { state.authMode = 'login'; navigate('auth'); };
    $('#signupNavBtn').onclick = () => { state.authMode = 'register'; navigate('auth'); };
  }
}

function closeMobileMenu() {
  $('#navMenu').classList.remove('open');
  $('#menuToggle').setAttribute('aria-expanded', 'false');
}

/* ------------------------------------------------------------
   AUTH
   ------------------------------------------------------------ */
function register(username, email, password) {
  const users = getUsers();
  users.push({ id: uid(), username, email, passHash: hashPassword(password), createdAt: Date.now() });
  DB.write(LS.users, users);
}

function login(user) {
  DB.write(LS.session, user.id);
  state.user = user;
}

function logout() {
  DB.write(LS.session, null);
  state.user = null;
  state.editingQuizId = null;
  toast('You have been logged out', 'info');
  navigate('home');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function viewAuth() {
  const isLogin = state.authMode === 'login';
  return '' +
  '<div class="auth-wrap">' +
    '<div class="card auth-card">' +
      '<div class="auth-logo">🧠</div>' +
      '<h1>' + (isLogin ? 'Welcome back!' : 'Create your account') + '</h1>' +
      '<p class="sub">' + (isLogin ? 'Log in to create quizzes and track your scores.' : 'Join QuizCraft to build quizzes and keep score history.') + '</p>' +
      '<div class="auth-tabs">' +
        '<button id="tabLogin" class="' + (isLogin ? 'active' : '') + '">Log in</button>' +
        '<button id="tabRegister" class="' + (!isLogin ? 'active' : '') + '">Sign up</button>' +
      '</div>' +

      '<form id="loginForm" class="auth-form' + (isLogin ? '' : ' hidden') + '" novalidate>' +
        '<label class="field">Email or username' +
          '<input type="text" id="loginId" autocomplete="username" placeholder="you@example.com">' +
        '</label>' +
        '<label class="field">Password' +
          '<input type="password" id="loginPassword" autocomplete="current-password" placeholder="••••••••">' +
        '</label>' +
        '<button type="submit" class="btn btn-primary btn-block btn-lg">Log in</button>' +
        '<div class="demo-note">Demo account — <strong>demo@quizcraft.app</strong> / <strong>demo123</strong></div>' +
      '</form>' +

      '<form id="registerForm" class="auth-form' + (!isLogin ? '' : ' hidden') + '" novalidate>' +
        '<label class="field">Username' +
          '<input type="text" id="regUsername" autocomplete="username" placeholder="e.g. quizninja" maxlength="24">' +
        '</label>' +
        '<label class="field">Email' +
          '<input type="email" id="regEmail" autocomplete="email" placeholder="you@example.com">' +
        '</label>' +
        '<label class="field">Password <span class="hint">(min 6 characters)</span>' +
          '<input type="password" id="regPassword" autocomplete="new-password" placeholder="••••••••">' +
        '</label>' +
        '<label class="field">Confirm password' +
          '<input type="password" id="regConfirm" autocomplete="new-password" placeholder="••••••••">' +
        '</label>' +
        '<button type="submit" class="btn btn-primary btn-block btn-lg">Create account</button>' +
      '</form>' +
    '</div>' +
  '</div>';
}

function bindAuth() {
  $('#tabLogin').onclick = () => { state.authMode = 'login'; render(); };
  $('#tabRegister').onclick = () => { state.authMode = 'register'; render(); };

  $('#loginForm').onsubmit = e => {
    e.preventDefault();
    const idv = $('#loginId').value.trim();
    const pw = $('#loginPassword').value;
    if (!idv || !pw) return toast('Enter your credentials', 'error');

    const users = getUsers();
    const user = users.find(u =>
      u.email.toLowerCase() === idv.toLowerCase() ||
      u.username.toLowerCase() === idv.toLowerCase()
    );
    if (!user || user.passHash !== hashPassword(pw)) {
      return toast('Invalid credentials. Please try again.', 'error');
    }
    login(user);
    toast('Welcome back, ' + user.username + '! 🎉', 'success');
    const dest = state.postLogin || 'home';
    state.postLogin = null;
    navigate(dest);
  };

  $('#registerForm').onsubmit = e => {
    e.preventDefault();
    const username = $('#regUsername').value.trim();
    const email = $('#regEmail').value.trim();
    const pw = $('#regPassword').value;
    const confirmPw = $('#regConfirm').value;

    if (username.length < 3) return toast('Username must be at least 3 characters', 'error');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return toast('Username: letters, numbers and _ only', 'error');
    if (!EMAIL_RE.test(email)) return toast('Enter a valid email address', 'error');
    if (pw.length < 6) return toast('Password must be at least 6 characters', 'error');
    if (pw !== confirmPw) return toast('Passwords do not match', 'error');

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return toast('That email is already registered', 'error');
    }
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return toast('That username is taken', 'error');
    }

    register(username, email, pw);
    const user = getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    login(user);
    toast('Account created — welcome, ' + username + '! 🎉', 'success');
    const dest = state.postLogin || 'home';
    state.postLogin = null;
    navigate(dest);
  };
}

/* ------------------------------------------------------------
   HOME
   ------------------------------------------------------------ */
function viewHome() {
  const quizzes = getQuizzes();
  const attempts = getAttempts();
  const totalQuestions = quizzes.reduce((n, q) => n + q.questions.length, 0);
  const popular = quizzes.slice()
    .sort((a, b) => attemptCount(b.id) - attemptCount(a.id) || b.createdAt - a.createdAt)
    .slice(0, 3);

  const myAttempts = state.user ? attempts.filter(a => a.userId === state.user.id) : [];
  const bestScore = myAttempts.length ? Math.max.apply(null, myAttempts.map(a => a.percent)) : null;

  return '' +
  '<section class="hero">' +
    '<span class="hero-eyebrow">Online Quiz Maker</span>' +
    '<h1>' + (state.user
      ? 'Hey ' + esc(state.user.username) + '! Ready to quiz? 🚀'
      : 'Create quizzes. Challenge friends. Learn faster.') + '</h1>' +
    '<p>' + (state.user
      ? (myAttempts.length
          ? 'You have completed ' + myAttempts.length + ' attempt' + (myAttempts.length === 1 ? '' : 's') +
            ' with a best score of ' + bestScore + '%. Keep it up!'
          : 'Build your own quiz in minutes, or browse the library and take your first quiz today.')
      : 'Build custom multiple-choice quizzes in minutes, share them with others, and get instant scores with detailed answer feedback.') + '</p>' +
    '<div class="hero-cta">' +
      '<button class="btn btn-hero-light btn-lg" data-nav="create">✏️ Create a Quiz</button>' +
      '<button class="btn btn-hero-ghost btn-lg" data-nav="browse">🎯 Take a Quiz</button>' +
    '</div>' +
  '</section>' +

  '<section class="stats-strip">' +
    '<div class="stat-card"><div class="num">' + quizzes.length + '</div><div class="lbl">Quizzes</div></div>' +
    '<div class="stat-card"><div class="num">' + totalQuestions + '</div><div class="lbl">Questions</div></div>' +
    '<div class="stat-card"><div class="num">' + attempts.length + '</div><div class="lbl">Attempts</div></div>' +
    '<div class="stat-card"><div class="num">' + getUsers().length + '</div><div class="lbl">Members</div></div>' +
  '</section>' +

  '<section class="section">' +
    '<h2 class="section-title">How it works</h2>' +
    '<p class="section-sub">Three simple steps to quiz mastery.</p>' +
    '<div class="steps-grid">' +
      '<div class="step-card"><div class="step-emoji">📝</div><h3>Create a quiz</h3>' +
        '<p>Add questions, four answer options each, and mark the correct answer. Done in minutes.</p>' +
        '<span class="step-num">STEP 1</span></div>' +
      '<div class="step-card"><div class="step-emoji">👥</div><h3>Share it</h3>' +
        '<p>Every quiz you publish appears in the public library for other users to discover and take.</p>' +
        '<span class="step-num">STEP 2</span></div>' +
      '<div class="step-card"><div class="step-emoji">📊</div><h3>Get instant feedback</h3>' +
        '<p>Takers see their score immediately with a full answer review; you track every attempt.</p>' +
        '<span class="step-num">STEP 3</span></div>' +
    '</div>' +
  '</section>' +

  (popular.length ?
  '<section class="section">' +
    '<h2 class="section-title">Popular quizzes</h2>' +
    '<p class="section-sub">Jump straight into the most-attempted quizzes.</p>' +
    '<div class="quiz-grid">' + popular.map(quizCardHTML).join('') + '</div>' +
  '</section>' : '');
}

function bindHome() { /* interactions handled by global delegation */ }

/* ------------------------------------------------------------
   Quiz card (shared by Home & Browse)
   ------------------------------------------------------------ */
function quizCardHTML(quiz) {
  const count = attemptCount(quiz.id);
  const mine = state.user && state.user.id === quiz.createdBy;
  return '' +
  '<article class="quiz-card">' +
    '<div class="quiz-card-top">' + catBadge(quiz.category) +
      '<span class="qcount">' + quiz.questions.length + ' Q' + (quiz.questions.length === 1 ? '' : 's') + '</span></div>' +
    '<h3>' + esc(quiz.title) + '</h3>' +
    '<p class="desc">' + esc(quiz.description || 'No description provided.') + '</p>' +
    '<div class="quiz-meta">' +
      '<span>👤 ' + esc(usernameOf(quiz.createdBy)) + '</span>' +
      '<span>▶ ' + count + ' attempt' + (count === 1 ? '' : 's') + '</span>' +
      '<span>🕒 ' + timeAgo(quiz.createdAt) + '</span>' +
    '</div>' +
    '<div class="card-actions">' +
      '<button class="btn btn-primary btn-sm" data-take="' + quiz.id + '">Take Quiz →</button>' +
      (mine ? '<button class="btn btn-ghost btn-sm" data-edit="' + quiz.id + '">Edit</button>' : '') +
    '</div>' +
  '</article>';
}

/* ------------------------------------------------------------
   BROWSE
   ------------------------------------------------------------ */
function viewBrowse() {
  return '' +
  '<div class="page-head">' +
    '<h1>Browse quizzes</h1>' +
    '<p>Pick a quiz and get your score instantly — no sign-up needed to play.</p>' +
  '</div>' +
  '<div class="filters-bar">' +
    '<div class="search-wrap">' +
      '<span class="search-icon">🔍</span>' +
      '<input type="text" id="searchInput" placeholder="Search quizzes…" value="' + esc(state.browse.search) + '">' +
    '</div>' +
    '<select id="categoryFilter">' +
      '<option value="all"' + (state.browse.category === 'all' ? ' selected' : '') + '>All categories</option>' +
      CATEGORIES.map(c =>
        '<option value="' + c + '"' + (state.browse.category === c ? ' selected' : '') + '>' + c + '</option>'
      ).join('') +
    '</select>' +
  '</div>' +
  '<div id="quizGridWrap">' + browseGridHTML() + '</div>';
}

function browseGridHTML() {
  const term = state.browse.search.toLowerCase();
  const cat = state.browse.category;
  const list = getQuizzes()
    .filter(q =>
      (cat === 'all' || q.category === cat) &&
      (!term || q.title.toLowerCase().includes(term) || (q.description || '').toLowerCase().includes(term))
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!list.length) {
    return '<div class="empty-state"><div class="big">🔭</div>' +
      '<h3>No quizzes found</h3><p>Try a different search or category — or be the first to create one!</p>' +
      '<button class="btn btn-primary" data-nav="create">✏️ Create a Quiz</button></div>';
  }
  return '<div class="quiz-grid">' + list.map(quizCardHTML).join('') + '</div>';
}

function bindBrowse() {
  const search = $('#searchInput');
  const filter = $('#categoryFilter');
  search.addEventListener('input', () => {
    state.browse.search = search.value;
    $('#quizGridWrap').innerHTML = browseGridHTML();
  });
  filter.addEventListener('change', () => {
    state.browse.category = filter.value;
    $('#quizGridWrap').innerHTML = browseGridHTML();
  });
}

/* ------------------------------------------------------------
   CREATE / EDIT QUIZ
   ------------------------------------------------------------ */
function questionCardHTML(q, i) {
  const opts = q ? q.options : ['', '', '', ''];
  const correct = q ? q.correct : -1;
  const group = 'correct-' + uid();
  return '' +
  '<div class="card question-card">' +
    '<div class="q-head"><h3>Question <span class="q-num">' + (i + 1) + '</span></h3>' +
      '<button type="button" class="icon-btn remove-q" title="Remove question">🗑️</button></div>' +
    '<input type="text" class="q-text" placeholder="Type your question here…" maxlength="300" value="' + esc(q ? q.text : '') + '">' +
    '<div class="options-editor">' +
      opts.map((opt, j) =>
        '<div class="opt-edit-row">' +
          '<input type="radio" class="q-correct" name="' + group + '" value="' + j + '"' +
            (j === correct ? ' checked' : '') + ' title="Mark as the correct answer">' +
          '<input type="text" class="q-opt" placeholder="Option ' + (j + 1) + '" maxlength="200" value="' + esc(opt) + '">' +
        '</div>'
      ).join('') +
    '</div>' +
    '<p class="hint" style="margin-top:10px">💡 Click the circle next to the correct answer.</p>' +
  '</div>';
}

function viewCreate() {
  if (!state.user) return '';
  const editing = state.editingQuizId ? getQuiz(state.editingQuizId) : null;

  return '' +
  '<div class="page-narrow">' +
    '<div class="page-head">' +
      '<h1>' + (editing ? 'Edit quiz' : 'Create a new quiz') + '</h1>' +
      '<p>' + (editing ? 'Update your quiz and save the changes.' : 'Add a title, then build as many multiple-choice questions as you like.') + '</p>' +
    '</div>' +
    '<form id="quizForm" novalidate>' +
      '<div class="card form-card">' +
        '<label class="field">Quiz title *' +
          '<input type="text" id="quizTitle" maxlength="90" placeholder="e.g. World Capitals Showdown" value="' + esc(editing ? editing.title : '') + '">' +
        '</label>' +
        '<label class="field">Description' +
          '<textarea id="quizDesc" maxlength="300" placeholder="What is this quiz about?">' + esc(editing ? (editing.description || '') : '') + '</textarea>' +
        '</label>' +
        '<label class="field">Category' +
          '<select id="quizCategory">' +
            CATEGORIES.map(c =>
              '<option value="' + c + '"' + (editing && editing.category === c ? ' selected' : '') + '>' + c + '</option>'
            ).join('') +
          '</select>' +
        '</label>' +
      '</div>' +
      '<div id="questionsWrap">' +
        (editing
          ? editing.questions.map((q, i) => questionCardHTML(q, i)).join('')
          : questionCardHTML(null, 0)) +
      '</div>' +
      '<button type="button" class="btn btn-outline" id="addQuestionBtn">＋ Add another question</button>' +
      '<div class="form-actions">' +
        '<button type="button" class="btn btn-ghost" id="cancelCreate">Cancel</button>' +
        '<button type="submit" class="btn btn-primary btn-lg">' + (editing ? '💾 Save changes' : '🚀 Publish quiz') + '</button>' +
      '</div>' +
    '</form>' +
  '</div>';
}

function renumberQuestions() {
  $$('#questionsWrap .question-card .q-num').forEach((el, i) => { el.textContent = i + 1; });
}

function bindCreate() {
  $('#addQuestionBtn').onclick = () => {
    $('#questionsWrap').insertAdjacentHTML('beforeend', questionCardHTML(null, $$('#questionsWrap .question-card').length));
    renumberQuestions();
    const cards = $$('#questionsWrap .question-card');
    const last = cards[cards.length - 1];
    if (last.scrollIntoView) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('.q-text', last).focus();
  };

  $('#questionsWrap').addEventListener('click', e => {
    const btn = e.target.closest('.remove-q');
    if (!btn) return;
    const cards = $$('#questionsWrap .question-card');
    if (cards.length <= 1) return toast('A quiz needs at least one question', 'error');
    btn.closest('.question-card').remove();
    renumberQuestions();
  });

  $('#cancelCreate').onclick = () => {
    state.editingQuizId = null;
    navigate(state.user ? 'dashboard' : 'home');
  };

  $('#quizForm').onsubmit = e => {
    e.preventDefault();
    const title = $('#quizTitle').value.trim();
    const description = $('#quizDesc').value.trim();
    const category = $('#quizCategory').value;
    const cards = $$('#questionsWrap .question-card');

    if (title.length < 3) {
      $('#quizTitle').classList.add('input-error');
      $('#quizTitle').focus();
      return toast('Give your quiz a title (min 3 characters)', 'error');
    }
    $('#quizTitle').classList.remove('input-error');
    if (!cards.length) return toast('Add at least one question', 'error');

    const questions = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const text = $('.q-text', card).value.trim();
      const options = $$('.q-opt', card).map(inp => inp.value.trim());
      const chosen = $('.q-correct:checked', card);

      const scrollTo = () => { if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      if (!text) { scrollTo(); return toast('Question ' + (i + 1) + ' is missing its text', 'error'); }
      if (options.some(o => !o)) { scrollTo(); return toast('Question ' + (i + 1) + ': fill in all 4 options', 'error'); }
      if (new Set(options.map(o => o.toLowerCase())).size !== options.length) {
        scrollTo(); return toast('Question ' + (i + 1) + ': options must be different from each other', 'error');
      }
      if (!chosen) { scrollTo(); return toast('Question ' + (i + 1) + ': mark the correct answer', 'error'); }

      questions.push({ text, options, correct: Number(chosen.value) });
    }

    const quizzes = getQuizzes();

    if (state.editingQuizId) {
      const idx = quizzes.findIndex(q => q.id === state.editingQuizId);
      if (idx === -1) { state.editingQuizId = null; return toast('Quiz not found', 'error'); }
      quizzes[idx] = Object.assign({}, quizzes[idx], { title, description, category, questions });
      DB.write(LS.quizzes, quizzes);
      state.editingQuizId = null;
      toast('Quiz updated! ✅', 'success');
    } else {
      quizzes.push({
        id: uid(), title, description, category, questions,
        createdBy: state.user.id, createdAt: Date.now()
      });
      DB.write(LS.quizzes, quizzes);
      toast('Quiz published! 🎉', 'success');
    }
    navigate('dashboard');
  };
}

function editQuiz(id) {
  const quiz = getQuiz(id);
  if (!quiz) return toast('Quiz not found', 'error');
  if (!state.user || quiz.createdBy !== state.user.id) return toast('You can only edit your own quizzes', 'error');
  state.editingQuizId = id;
  navigate('create');
}

/* ------------------------------------------------------------
   TAKE QUIZ
   ------------------------------------------------------------ */
function startQuiz(id) {
  const quiz = getQuiz(id);
  if (!quiz) return toast('Quiz not found', 'error');
  if (!quiz.questions.length) return toast('This quiz has no questions yet', 'error');
  state.take = { quiz, index: 0, answers: new Array(quiz.questions.length).fill(null) };
  navigate('take');
}

function viewTake() {
  const t = state.take;
  if (!t) return '<div class="empty-state"><div class="big">🤔</div><h3>No quiz in progress</h3><p>Pick one from the library.</p><button class="btn btn-primary" data-nav="browse">Browse quizzes</button></div>';

  const quiz = t.quiz;
  const total = quiz.questions.length;
  const i = t.index;
  const q = quiz.questions[i];
  const answered = t.answers.filter(a => a !== null).length;
  const isLast = i === total - 1;

  return '' +
  '<div class="page-narrow">' +
    '<div class="take-top">' +
      '<div>' + catBadge(quiz.category) + '<h2>' + esc(quiz.title) + '</h2></div>' +
      '<button class="btn btn-ghost btn-sm" id="quitQuiz">✕ Quit</button>' +
    '</div>' +
    '<div class="progress"><div class="progress-fill" style="width:' + Math.round((answered / total) * 100) + '%"></div></div>' +
    '<div class="take-meta">Question ' + (i + 1) + ' of ' + total + ' &nbsp;•&nbsp; Answered ' + answered + '/' + total + '</div>' +

    '<div class="card take-card">' +
      '<h3 class="take-q">' + esc(q.text) + '</h3>' +
      '<div class="take-options">' +
        q.options.map((opt, j) =>
          '<button type="button" class="option-btn' + (t.answers[i] === j ? ' selected' : '') + '" data-opt="' + j + '">' +
            '<span class="opt-letter">' + 'ABCD'[j] + '</span><span>' + esc(opt) + '</span>' +
          '</button>'
        ).join('') +
      '</div>' +
    '</div>' +

    '<div class="take-nav">' +
      '<button class="btn btn-outline" id="prevQ"' + (i === 0 ? ' disabled' : '') + '>← Previous</button>' +
      (isLast
        ? '<button class="btn btn-primary btn-lg" id="submitQuiz">Submit Quiz ✓</button>'
        : '<button class="btn btn-primary" id="nextQ">Next →</button>') +
    '</div>' +

    '<div class="dots">' +
      quiz.questions.map((_, j) =>
        '<button type="button" class="dot' + (t.answers[j] !== null ? ' done' : '') + (j === i ? ' active' : '') + '" data-jump="' + j + '">' + (j + 1) + '</button>'
      ).join('') +
    '</div>' +
  '</div>';
}

function bindTake() {
  const t = state.take;
  if (!t) return;

  $$('.option-btn').forEach(btn => {
    btn.onclick = () => {
      t.answers[t.index] = Number(btn.dataset.opt);
      render(); // re-render to show selection + progress
    };
  });

  const prev = $('#prevQ');
  if (prev) prev.onclick = () => { if (t.index > 0) { t.index--; render(); } };

  const next = $('#nextQ');
  if (next) next.onclick = () => { if (t.index < t.quiz.questions.length - 1) { t.index++; render(); } };

  $$('.dot').forEach(dot => {
    dot.onclick = () => { t.index = Number(dot.dataset.jump); render(); };
  });

  $('#quitQuiz').onclick = () => {
    confirmModal({
      title: 'Quit quiz?',
      message: 'Your progress in "' + t.quiz.title + '" will be lost.',
      confirmText: 'Quit quiz',
      danger: true,
      onConfirm: () => { state.take = null; navigate('browse'); }
    });
  };

  const submit = $('#submitQuiz');
  if (submit) submit.onclick = submitQuiz;
}

function submitQuiz() {
  const t = state.take;
  if (!t) return;

  const finish = () => {
    const score = t.quiz.questions.reduce((s, q, i) => s + (t.answers[i] === q.correct ? 1 : 0), 0);
    const total = t.quiz.questions.length;
    const attempt = {
      id: uid(),
      quizId: t.quiz.id,
      userId: state.user ? state.user.id : 'guest',
      score, total,
      percent: total ? Math.round((score / total) * 100) : 0,
      answers: t.answers.slice(),
      takenAt: Date.now()
    };
    const attempts = getAttempts();
    attempts.push(attempt);
    DB.write(LS.attempts, attempts);

    state.results = { quiz: t.quiz, attempt };
    state.take = null;
    navigate('results');
  };

  const unanswered = t.answers.filter(a => a === null).length;
  if (unanswered > 0) {
    confirmModal({
      title: 'Unanswered questions',
      message: 'You have ' + unanswered + ' unanswered question' + (unanswered === 1 ? '' : 's') +
               ' — they will be marked wrong. Submit anyway?',
      confirmText: 'Submit anyway',
      onConfirm: finish
    });
  } else {
    finish();
  }
}

/* ------------------------------------------------------------
   RESULTS
   ------------------------------------------------------------ */
function viewResults() {
  const r = state.results;
  if (!r) return '<div class="empty-state"><div class="big">📭</div><h3>No results to show</h3><p>Take a quiz first!</p><button class="btn btn-primary" data-nav="browse">Browse quizzes</button></div>';

  const quiz = r.quiz, attempt = r.attempt;
  const pct = attempt.percent;
  const verdict =
    pct >= 80 ? '🏆 Outstanding!' :
    pct >= 60 ? '🎉 Great job!' :
    pct >= 40 ? '👍 Not bad — keep going!' : '💪 Keep practicing!';

  const ringColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const C = 439.8; // 2 * PI * r(70)
  const offset = C * (1 - pct / 100);

  return '' +
  '<div class="page-narrow">' +
    '<div class="card results-hero">' +
      catBadge(quiz.category) +
      '<div class="score-ring">' +
        '<svg viewBox="0 0 160 160">' +
          '<circle class="ring-bg" cx="80" cy="80" r="70"></circle>' +
          '<circle class="ring-fill" id="ringFill" cx="80" cy="80" r="70" style="stroke:' + ringColor + '"></circle>' +
        '</svg>' +
        '<div class="ring-text"><span class="pct" style="color:' + ringColor + '">' + pct + '%</span>' +
        '<span class="frac">' + attempt.score + ' / ' + attempt.total + ' correct</span></div>' +
      '</div>' +
      '<div class="verdict">' + verdict + '</div>' +
      '<p class="sub">' + esc(quiz.title) + ' — completed ' + timeAgo(attempt.takenAt) + '</p>' +
      '<div class="results-actions">' +
        '<button class="btn btn-primary" data-take="' + quiz.id + '">🔁 Retake quiz</button>' +
        '<button class="btn btn-outline" data-nav="browse">Browse more quizzes</button>' +
        (state.user ? '<button class="btn btn-ghost" data-nav="dashboard">My dashboard</button>' : '') +
      '</div>' +
      (state.user ? '' :
        '<div class="guest-note">👤 You played as a guest — <a data-nav="auth"><strong>log in or sign up</strong></a> to save your score history and create your own quizzes.</div>') +
    '</div>' +

    '<h2 class="review-title">📋 Answer review</h2>' +
    quiz.questions.map((q, i) => reviewCardHTML(q, i, attempt.answers[i])).join('') +

    '<div class="results-actions">' +
      '<button class="btn btn-primary" data-take="' + quiz.id + '">🔁 Retake quiz</button>' +
      '<button class="btn btn-outline" data-nav="browse">Browse more quizzes</button>' +
    '</div>' +
  '</div>';
}

function reviewCardHTML(q, i, userAns) {
  const correct = q.correct;
  const isRight = userAns === correct;
  return '' +
  '<div class="card review-card">' +
    '<div class="rq"><span class="rq-num">Q' + (i + 1) + '.</span><span>' + esc(q.text) + '</span></div>' +
    '<div class="review-options">' +
      q.options.map((opt, j) => {
        let cls = 'dim', mark = '<span class="ro-mark">' + 'ABCD'[j] + '</span>';
        if (j === correct) { cls = 'correct'; mark = '<span class="ro-mark">✓</span>'; }
        else if (j === userAns) { cls = 'wrong'; mark = '<span class="ro-mark">✗</span>'; }
        return '<div class="review-opt ' + cls + '">' + mark +
               '<span>' + esc(opt) + '</span>' +
               (j === userAns && j !== correct ? '<span class="small muted" style="margin-left:auto">your answer</span>' : '') +
               (j === correct ? '<span class="small" style="margin-left:auto;font-weight:700">correct answer</span>' :
                 (j === userAns ? '' : '')) +
               '</div>';
      }).join('') +
    '</div>' +
    (userAns === null
      ? '<p class="review-flag bad">⚠ Not answered — counted as wrong</p>'
      : isRight
        ? '<p class="review-flag ok">✓ You answered correctly</p>'
        : '<p class="review-flag bad">✗ You answered: "' + esc(q.options[userAns]) + '"</p>') +
  '</div>';
}

function bindResults() {
  const ring = $('#ringFill');
  if (ring) {
    const pct = state.results ? state.results.attempt.percent : 0;
    const C = 439.8;
    // animate the ring from empty to the value (deferred two frames so the transition plays)
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : fn => setTimeout(fn, 16);
    raf(() => raf(() => { ring.style.strokeDashoffset = String(C * (1 - pct / 100)); }));
  }
}

/* ------------------------------------------------------------
   DASHBOARD
   ------------------------------------------------------------ */
function deleteQuiz(id) {
  const quiz = getQuiz(id);
  if (!quiz) return toast('Quiz not found', 'error');
  if (!state.user || quiz.createdBy !== state.user.id) return toast('You can only delete your own quizzes', 'error');

  confirmModal({
    title: 'Delete quiz?',
    message: '"' + quiz.title + '" and all its attempt records will be permanently deleted.',
    confirmText: 'Delete',
    danger: true,
    onConfirm: () => {
      DB.write(LS.quizzes, getQuizzes().filter(q => q.id !== id));
      DB.write(LS.attempts, getAttempts().filter(a => a.quizId !== id));
      toast('Quiz deleted', 'info');
      render();
    }
  });
}

function scoreChipClass(pct) { return pct >= 80 ? 'hi' : pct >= 50 ? 'mid' : 'lo'; }

function viewDashboard() {
  if (!state.user) return '';
  const quizzes = getQuizzes().filter(q => q.createdBy === state.user.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  const allAttempts = getAttempts();
  const myAttempts = allAttempts.filter(a => a.userId === state.user.id)
    .sort((a, b) => b.takenAt - a.takenAt);
  const attemptsOnMine = allAttempts.filter(a => quizzes.some(q => q.id === a.quizId));
  const avgScore = myAttempts.length
    ? Math.round(myAttempts.reduce((s, a) => s + a.percent, 0) / myAttempts.length) : 0;

  return '' +
  '<div class="page-head">' +
    '<h1>Welcome, ' + esc(state.user.username) + ' 👋</h1>' +
    '<p>Manage your quizzes and track your progress.</p>' +
  '</div>' +

  '<div class="dash-stats">' +
    '<div class="stat-card"><div class="num">' + quizzes.length + '</div><div class="lbl">Quizzes created</div></div>' +
    '<div class="stat-card"><div class="num">' + attemptsOnMine.length + '</div><div class="lbl">Attempts on my quizzes</div></div>' +
    '<div class="stat-card"><div class="num">' + myAttempts.length + '</div><div class="lbl">Quizzes I took</div></div>' +
    '<div class="stat-card"><div class="num">' + (myAttempts.length ? avgScore + '%' : '—') + '</div><div class="lbl">My average score</div></div>' +
  '</div>' +

  '<h2 class="dash-section-title">📚 My quizzes' +
    '<button class="btn btn-primary btn-sm" data-nav="create">＋ New quiz</button></h2>' +
  (quizzes.length ? quizzes.map(q => {
      const cnt = attemptCount(q.id);
      const atts = allAttempts.filter(a => a.quizId === q.id);
      const avg = atts.length ? Math.round(atts.reduce((s, a) => s + a.percent, 0) / atts.length) : null;
      return '' +
      '<div class="quiz-row">' +
        '<div class="qr-main">' +
          '<h3>' + esc(q.title) + '</h3>' +
          '<div class="qr-meta">' +
            '<span>' + catBadge(q.category) + '</span>' +
            '<span>' + q.questions.length + ' questions</span>' +
            '<span>▶ ' + cnt + ' attempt' + (cnt === 1 ? '' : 's') + '</span>' +
            (avg !== null ? '<span>avg score ' + avg + '%</span>' : '') +
            '<span>created ' + timeAgo(q.createdAt) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="qr-actions">' +
          '<button class="btn btn-primary btn-sm" data-take="' + q.id + '">Take</button>' +
          '<button class="btn btn-outline btn-sm" data-edit="' + q.id + '">Edit</button>' +
          '<button class="btn btn-ghost btn-sm" data-del="' + q.id + '">🗑️</button>' +
        '</div>' +
      '</div>';
    }).join('')
    : '<div class="empty-state"><div class="big">✍️</div><h3>No quizzes yet</h3>' +
      '<p>Create your first quiz and share it with the community.</p>' +
      '<button class="btn btn-primary" data-nav="create">Create a quiz</button></div>') +

  '<h2 class="dash-section-title">🎯 My attempt history</h2>' +
  (myAttempts.length ? myAttempts.slice(0, 20).map(a => {
      const quiz = getQuiz(a.quizId);
      return '' +
      '<div class="quiz-row">' +
        '<span class="score-chip ' + scoreChipClass(a.percent) + '">' + a.percent + '%</span>' +
        '<div class="qr-main">' +
          '<h3>' + esc(quiz ? quiz.title : '(quiz deleted)') + '</h3>' +
          '<div class="qr-meta">' +
            '<span>' + a.score + ' / ' + a.total + ' correct</span>' +
            '<span>🕒 ' + timeAgo(a.takenAt) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="qr-actions">' +
          (quiz ? '<button class="btn btn-outline btn-sm" data-take="' + quiz.id + '">Retake</button>' : '') +
        '</div>' +
      '</div>';
    }).join('')
    : '<div class="empty-state"><div class="big">🎯</div><h3>No attempts yet</h3>' +
      '<p>Take a quiz and your scores will show up here.</p>' +
      '<button class="btn btn-primary" data-nav="browse">Browse quizzes</button></div>');
}

function bindDashboard() { /* interactions handled by global delegation */ }

/* ------------------------------------------------------------
   Global event delegation (nav, take, edit, delete buttons…)
   ------------------------------------------------------------ */
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    e.preventDefault();
    if (nav.dataset.nav === 'create') state.editingQuizId = null;
    if (nav.dataset.nav === 'auth' && !state.user) state.authMode = 'register';
    navigate(nav.dataset.nav);
    return;
  }
  const take = e.target.closest('[data-take]');
  if (take) { startQuiz(take.dataset.take); return; }
  const edit = e.target.closest('[data-edit]');
  if (edit) { editQuiz(edit.dataset.edit); return; }
  const del = e.target.closest('[data-del]');
  if (del) { deleteQuiz(del.dataset.del); return; }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

$('#menuToggle').addEventListener('click', () => {
  const menu = $('#navMenu');
  const open = menu.classList.toggle('open');
  $('#menuToggle').setAttribute('aria-expanded', String(open));
});

/* ------------------------------------------------------------
   Init
   ------------------------------------------------------------ */
function init() {
  seedIfNeeded();
  const sid = DB.read(LS.session, null);
  state.user = sid ? (getUsers().find(u => u.id === sid) || null) : null;
  render();
}

init();
