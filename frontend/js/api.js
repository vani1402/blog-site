// Base URL of the backend API.
// In docker-compose we route this through Nginx as /api -> backend:5000
const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}

function setSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

async function apiRequest(path, method = "GET", body = null, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = "Bearer " + getToken();

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const Api = {
  signup: (name, email, password) => apiRequest("/auth/signup", "POST", { name, email, password }),
  login: (email, password) => apiRequest("/auth/login", "POST", { email, password }),

  getArticles: (tag) => apiRequest(`/articles${tag ? "?tag=" + encodeURIComponent(tag) : ""}`),
  getMyArticles: () => apiRequest("/articles/mine", "GET", null, true),
  getArticle: (id) => apiRequest(`/articles/${id}`),
  createArticle: (payload) => apiRequest("/articles", "POST", payload, true),
  updateArticle: (id, payload) => apiRequest(`/articles/${id}`, "PUT", payload, true),
  deleteArticle: (id) => apiRequest(`/articles/${id}`, "DELETE", null, true),

  getTags: () => apiRequest("/tags"),

  getComments: (articleId) => apiRequest(`/comments/${articleId}`),
  addComment: (articleId, user_name, content) =>
    apiRequest(`/comments/${articleId}`, "POST", { user_name, content })
};
