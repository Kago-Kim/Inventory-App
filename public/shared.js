let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

function api(path, options = {}) {
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  });
}

function showMessage(elementId, text, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'success' ? '#16a34a' : '#dc2626';
}

function clearMessage(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = '';
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Redirects to login if there's no token, or to the wrong role's page.
function requireRole(role) {
  if (!token) {
    window.location.href = 'index.html';
    return;
  }
  if (currentUser.role !== role) {
    window.location.href = currentUser.role === 'owner' ? 'owner.html' : 'employee.html';
  }
}

function redirectIfLoggedIn() {
  if (token) {
    window.location.href = currentUser.role === 'owner' ? 'owner.html' : 'employee.html';
  }
}
