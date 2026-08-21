# 🧠 QuizCraft — Online Quiz Maker

A complete quiz platform where users can **create** multiple-choice quizzes, **share** them in a public library, and **take** quizzes built by others — with **instant scoring** and a full answer review.

Built with **vanilla HTML, CSS & JavaScript** — no frameworks, no build step.

---

## ✨ Features

| Requirement | Implementation |
|---|---|
| 🏠 **Home Page** | Hero with welcome message + "Create a Quiz" / "Take a Quiz" CTAs, live stats, how-it-works, popular quizzes |
| 📝 **Quiz Creation** | Dynamic form: title, description, category + unlimited questions with 4 options each, radio-marked correct answer, full validation |
| 🎯 **Quiz Taking** | One question at a time, progress bar, prev/next + question-dot navigation, unanswered-question warning on submit |
| 📊 **Quiz Results** | Animated score ring (%), verdict message, per-question review showing correct answers vs. your answers, retake |
| 📚 **Quiz Listing** | Browsable card library with **live search** and **category filter**, question count, author & attempt stats |
| 🔐 **User Authentication** | Register / login / logout with hashed passwords, session persistence, guarded routes, demo account |
| 📱 **Mobile Responsiveness** | Hamburger nav, responsive grids, mobile-optimized forms & buttons (breakpoints at 920 px / 640 px) |

### Bonus features
- 👤 **Personal dashboard** — quizzes you created (attempt counts, avg score), your attempt history with score chips
- ✏️ **Edit & 🗑 delete** your quizzes (attempts cascade-delete)
- 🙋 **Guest mode** — anyone can take quizzes; logging in saves score history
- 🌱 4 ready-made sample quizzes on first run
- 🚫 XSS-safe rendering (all user input is escaped)
- 🔔 Toast notifications & confirmation modals

---

## 🚀 Running the app

**Option 1 — zero install:** open `quizcraft-standalone.html` in any browser (single file, everything inlined).

**Option 2 — project folder:** serve the folder so `css/` and `js/` load:

```bash
cd quiz-app
python3 -m http.server 8000
# → http://localhost:8000
```

## 🔑 Demo account

```
Email:    demo@quizcraft.app
Password: demo123
```

---

## 🗂 Project structure

```
quiz-app/
├── index.html                  # App shell (navbar, footer, #app root)
├── css/
│   └── style.css               # Design system + all views + responsive rules
├── js/
│   └── app.js                  # SPA: router, views, auth, quiz logic (vanilla JS)
├── quizcraft-standalone.html   # Single-file build (CSS+JS inlined) — share/open anywhere
└── README.md
```

## 🧠 How it works (technical notes)

- **Architecture:** single-page app — views (`home`, `browse`, `create`, `take`, `results`, `dashboard`, `auth`) are rendered as template strings into `#app`; a tiny router guards `create`/`dashboard` behind login.
- **Persistence:** `localStorage` — keys `qc_users`, `qc_quizzes`, `qc_attempts`, `qc_session`. No backend needed; data survives page reloads on the same browser.
- **Auth:** passwords are hashed client-side (cyrb53) before storage and sessions store only the user id.
  > ⚠️ This is demo-grade security — a production app must authenticate server-side (bcrypt/argon2 + HTTPS).
- **Scoring:** answers are compared against the stored correct index; unanswered questions count as wrong; percentage drives the animated SVG score ring.
- **Safety:** every piece of user content passes through an `esc()` HTML-escaper before rendering.

## ✅ Tested

- 25 unit tests (storage, hashing, seeding, scoring, escaping, cascade deletes)
- 57 end-to-end DOM tests (guest flow, auth, create/edit/delete, taking, results, dashboard)

All passing. ✅
