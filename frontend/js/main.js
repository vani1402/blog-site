const app = document.getElementById("app");

const navHome = document.getElementById("navHome");
const navWrite = document.getElementById("navWrite");
const navDashboard = document.getElementById("navDashboard");
const navLogin = document.getElementById("navLogin");
const navSignup = document.getElementById("navSignup");
const navLogout = document.getElementById("navLogout");

function refreshNav() {
  const user = getUser();
  const loggedIn = !!user;
  navWrite.classList.toggle("hidden", !loggedIn);
  navDashboard.classList.toggle("hidden", !loggedIn);
  navLogout.classList.toggle("hidden", !loggedIn);
  navLogin.classList.toggle("hidden", loggedIn);
  navSignup.classList.toggle("hidden", loggedIn);
}

navHome.onclick = renderHome;
navWrite.onclick = renderWrite;
navDashboard.onclick = renderDashboard;
navLogin.onclick = renderLogin;
navSignup.onclick = renderSignup;
navLogout.onclick = () => { clearSession(); refreshNav(); renderHome(); };

// ---------- HOME: list of published articles ----------
async function renderHome() {
  app.innerHTML = "<p>Loading articles...</p>";
  try {
    const [articles, tags] = await Promise.all([Api.getArticles(), Api.getTags()]);

    const tagButtons = tags
      .map(t => `<button class="tag" data-tag="${t.name}" style="cursor:pointer">${t.name}</button>`)
      .join(" ");

    app.innerHTML = `
      <div class="card"><strong>Filter by tag:</strong> ${tagButtons || "No tags yet"}</div>
      <div id="articleList"></div>
    `;

    document.querySelectorAll("[data-tag]").forEach(btn => {
      btn.onclick = async () => {
        const filtered = await Api.getArticles(btn.dataset.tag);
        renderArticleList(filtered);
      };
    });

    renderArticleList(articles);
  } catch (err) {
    app.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function renderArticleList(articles) {
  const list = document.getElementById("articleList");
  if (!articles.length) {
    list.innerHTML = "<p>No published articles yet.</p>";
    return;
  }
  list.innerHTML = articles
    .map(
      a => `
      <div class="card">
        <h2><a href="#" data-id="${a.id}" class="articleLink">${a.title}</a></h2>
        <div class="meta">by ${a.author_name} • ${new Date(a.created_at).toLocaleDateString()}</div>
        <p>${a.content.substring(0, 150)}${a.content.length > 150 ? "..." : ""}</p>
      </div>`
    )
    .join("");

  document.querySelectorAll(".articleLink").forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      renderArticleDetail(link.dataset.id);
    };
  });
}

// ---------- ARTICLE DETAIL + COMMENTS ----------
async function renderArticleDetail(id) {
  app.innerHTML = "<p>Loading...</p>";
  try {
    const article = await Api.getArticle(id);
    const comments = await Api.getComments(id);

    app.innerHTML = `
      <div class="card">
        <h2>${article.title}</h2>
        <div class="meta">by ${article.author_name} • ${new Date(article.created_at).toLocaleDateString()}</div>
        <div>${article.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
        <p style="margin-top:1rem; white-space:pre-wrap;">${article.content}</p>
      </div>

      <div class="card">
        <h3>Comments (${comments.length})</h3>
        <div id="commentList">
          ${comments
            .map(
              c => `<div class="comment"><div class="meta"><strong>${c.user_name}</strong> • ${new Date(c.created_at).toLocaleString()}</div><div>${c.content}</div></div>`
            )
            .join("") || "<p>No comments yet. Be the first!</p>"}
        </div>

        <form id="commentForm" style="margin-top:1rem;">
          <input type="text" id="commentName" placeholder="Your name" required />
          <textarea id="commentContent" placeholder="Write a comment..." required></textarea>
          <button type="submit" class="primary">Post Comment</button>
          <p class="error" id="commentError"></p>
        </form>
      </div>
    `;

    document.getElementById("commentForm").onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById("commentName").value;
      const content = document.getElementById("commentContent").value;
      try {
        await Api.addComment(id, name, content);
        renderArticleDetail(id); // reload with new comment
      } catch (err) {
        document.getElementById("commentError").textContent = err.message;
      }
    };
  } catch (err) {
    app.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// ---------- SIGNUP ----------
function renderSignup() {
  app.innerHTML = `
    <div class="card">
      <h2>Create an author account</h2>
      <form id="signupForm">
        <input type="text" id="suName" placeholder="Full name" required />
        <input type="email" id="suEmail" placeholder="Email" required />
        <input type="password" id="suPassword" placeholder="Password" required />
        <button type="submit" class="primary">Sign up</button>
        <p class="error" id="suError"></p>
      </form>
    </div>
  `;
  document.getElementById("signupForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { token, user } = await Api.signup(
        document.getElementById("suName").value,
        document.getElementById("suEmail").value,
        document.getElementById("suPassword").value
      );
      setSession(token, user);
      refreshNav();
      renderDashboard();
    } catch (err) {
      document.getElementById("suError").textContent = err.message;
    }
  };
}

// ---------- LOGIN ----------
function renderLogin() {
  app.innerHTML = `
    <div class="card">
      <h2>Login</h2>
      <form id="loginForm">
        <input type="email" id="liEmail" placeholder="Email" required />
        <input type="password" id="liPassword" placeholder="Password" required />
        <button type="submit" class="primary">Login</button>
        <p class="error" id="liError"></p>
      </form>
    </div>
  `;
  document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { token, user } = await Api.login(
        document.getElementById("liEmail").value,
        document.getElementById("liPassword").value
      );
      setSession(token, user);
      refreshNav();
      renderDashboard();
    } catch (err) {
      document.getElementById("liError").textContent = err.message;
    }
  };
}

// ---------- WRITE (create article) ----------
function renderWrite() {
  app.innerHTML = `
    <div class="card">
      <h2>Write a new article</h2>
      <form id="writeForm">
        <input type="text" id="waTitle" placeholder="Title" required />
        <textarea id="waContent" placeholder="Write your article..." required></textarea>
        <input type="text" id="waTags" placeholder="Tags (comma separated, e.g. tech, tutorial)" />
        <select id="waStatus">
          <option value="draft">Save as draft</option>
          <option value="published">Publish now</option>
        </select>
        <button type="submit" class="primary">Save</button>
        <p class="error" id="waError"></p>
        <p class="success" id="waSuccess"></p>
      </form>
    </div>
  `;
  document.getElementById("writeForm").onsubmit = async (e) => {
    e.preventDefault();
    const tags = document.getElementById("waTags").value
      .split(",").map(t => t.trim()).filter(Boolean);
    try {
      await Api.createArticle({
        title: document.getElementById("waTitle").value,
        content: document.getElementById("waContent").value,
        status: document.getElementById("waStatus").value,
        tags
      });
      document.getElementById("waSuccess").textContent = "Article saved!";
      e.target.reset();
    } catch (err) {
      document.getElementById("waError").textContent = err.message;
    }
  };
}

// ---------- DASHBOARD (author's own articles) ----------
async function renderDashboard() {
  app.innerHTML = "<p>Loading your articles...</p>";
  try {
    const articles = await Api.getMyArticles();
    if (!articles.length) {
      app.innerHTML = `<div class="card"><p>You haven't written anything yet.</p></div>`;
      return;
    }
    app.innerHTML = articles
      .map(
        a => `
        <div class="card">
          <h2>${a.title} <span class="status-badge ${a.status}">${a.status}</span></h2>
          <div class="meta">${new Date(a.created_at).toLocaleDateString()}</div>
          <p>${a.content.substring(0, 120)}...</p>
          <button class="primary" data-action="publish" data-id="${a.id}" data-status="${a.status}">
            ${a.status === "draft" ? "Publish" : "Unpublish"}
          </button>
          <button data-action="delete" data-id="${a.id}">Delete</button>
        </div>`
      )
      .join("");

    document.querySelectorAll("[data-action='publish']").forEach(btn => {
      btn.onclick = async () => {
        const newStatus = btn.dataset.status === "draft" ? "published" : "draft";
        await Api.updateArticle(btn.dataset.id, { status: newStatus });
        renderDashboard();
      };
    });
    document.querySelectorAll("[data-action='delete']").forEach(btn => {
      btn.onclick = async () => {
        if (confirm("Delete this article?")) {
          await Api.deleteArticle(btn.dataset.id);
          renderDashboard();
        }
      };
    });
  } catch (err) {
    app.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// ---------- INIT ----------
refreshNav();
renderHome();
