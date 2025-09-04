const state = {
  token: localStorage.getItem('token') || null,
  user: null,
  editingId: null,
};

const els = {
  authed: document.getElementById('authed'),
  userEmail: document.getElementById('user-email'),
  userRole: document.getElementById('user-role'),
  logoutBtn: document.getElementById('logout-btn'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginBtn: document.getElementById('login-btn'),
  regEmail: document.getElementById('reg-email'),
  regPassword: document.getElementById('reg-password'),
  registerBtn: document.getElementById('register-btn'),
  productsList: document.getElementById('products-list'),
  adminCreate: document.getElementById('admin-create'),
  name: document.getElementById('p-name'),
  desc: document.getElementById('p-desc'),
  price: document.getElementById('p-price'),
  stock: document.getElementById('p-stock'),
  createBtn: document.getElementById('create-btn'),
  updateBtn: document.getElementById('update-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
};

function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  return fetch(`/api${path}`, Object.assign({}, opts, { headers }));
}

async function parseOrText(res) {
  try { return await res.json(); } catch { return {}; }
}

async function refreshUser() {
  if (!state.token) {
    state.user = null;
    renderAuth();
    return;
  }
  try {
    const res = await api('/auth/me');
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();
    state.user = data.user;
  } catch (e) {
    state.token = null;
    localStorage.removeItem('token');
    state.user = null;
  }
  renderAuth();
}

function renderAuth() {
  if (state.user) {
    els.authed.classList.remove('hidden');
    document.getElementById('auth-forms').classList.add('hidden');
    els.userEmail.textContent = state.user.email;
    els.userRole.textContent = state.user.is_admin ? 'admin' : 'user';
    els.userRole.style.display = 'inline-block';
    // Admin controls
    if (state.user.is_admin) {
      els.adminCreate.classList.remove('hidden');
    } else {
      els.adminCreate.classList.add('hidden');
    }
  } else {
    els.authed.classList.add('hidden');
    document.getElementById('auth-forms').classList.remove('hidden');
    els.adminCreate.classList.add('hidden');
  }
}

async function loadProducts() {
  let list = [];
  els.productsList.innerHTML = '';
  try {
    const res = await api('/products');
    const data = await res.json();
    list = data.products || [];
  } catch (e) {
    // Show a lightweight message instead of failing silently
    els.productsList.textContent = 'Failed to load products.';
    return;
  }
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = 'No products yet.';
    els.productsList.appendChild(empty);
    return;
  }
  list.forEach((p) => {
    const wrap = document.createElement('div');
    wrap.className = 'product';
    const left = document.createElement('div');
    left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> - $${Number(p.price).toFixed(2)} (${p.stock})</div>
      <div class="meta">${escapeHtml(p.description || '')}</div>`;
    wrap.appendChild(left);
    const right = document.createElement('div');
    right.className = 'row-actions';
    if (state.user?.is_admin) {
      const edit = document.createElement('button');
      edit.textContent = 'Edit';
      edit.onclick = () => startEdit(p);
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.style.background = 'var(--danger)';
      del.onclick = () => deleteProduct(p.id);
      right.append(edit, del);
    }
    wrap.appendChild(right);
    els.productsList.appendChild(wrap);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]+/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

async function login() {
  const email = els.loginEmail.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  const data = await parseOrText(res);
  if (!res.ok) return alert(data.message || 'Login failed');
  state.token = data.token;
  localStorage.setItem('token', state.token);
  await refreshUser();
  await loadProducts();
}

async function register() {
  const email = els.regEmail.value.trim().toLowerCase();
  const password = els.regPassword.value;
  const res = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
  const data = await parseOrText(res);
  if (!res.ok) return alert(data.message || 'Registration failed');
  state.token = data.token;
  localStorage.setItem('token', state.token);
  await refreshUser();
  await loadProducts();
}

function logout() {
  state.token = null;
  localStorage.removeItem('token');
  state.user = null;
  renderAuth();
  loadProducts();
}

function clearForm() {
  els.name.value = '';
  els.desc.value = '';
  els.price.value = '';
  els.stock.value = '';
}

function startEdit(p) {
  state.editingId = p.id;
  els.name.value = p.name;
  els.desc.value = p.description || '';
  els.price.value = p.price;
  els.stock.value = p.stock;
  els.createBtn.classList.add('hidden');
  els.updateBtn.classList.remove('hidden');
  els.cancelEditBtn.classList.remove('hidden');
}

function cancelEdit() {
  state.editingId = null;
  clearForm();
  els.createBtn.classList.remove('hidden');
  els.updateBtn.classList.add('hidden');
  els.cancelEditBtn.classList.add('hidden');
}

async function createProduct() {
  const body = {
    name: els.name.value.trim(),
    description: els.desc.value.trim(),
    price: Number(els.price.value || 0),
    stock: Number(els.stock.value || 0),
  };
  const res = await api('/products', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) return alert('Create failed');
  clearForm();
  await loadProducts();
}

async function updateProduct() {
  if (!state.editingId) return;
  const body = {
    name: els.name.value.trim(),
    description: els.desc.value.trim(),
    price: Number(els.price.value || 0),
    stock: Number(els.stock.value || 0),
  };
  const res = await api(`/products/${state.editingId}`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) return alert('Update failed');
  cancelEdit();
  await loadProducts();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const res = await api(`/products/${id}`, { method: 'DELETE' });
  if (!res.ok) return alert('Delete failed');
  await loadProducts();
}

// Events
els.loginBtn.onclick = login;
els.registerBtn.onclick = register;
els.logoutBtn.onclick = logout;
els.createBtn.onclick = createProduct;
els.updateBtn.onclick = updateProduct;
els.cancelEditBtn.onclick = cancelEdit;

(async function init() {
  await refreshUser();
  await loadProducts();
})();
