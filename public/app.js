(function(){
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const storage = {
    get token() { return localStorage.getItem('slh_token') || ''; },
    set token(v) { localStorage.setItem('slh_token', v || ''); },
    get base() { return localStorage.getItem('slh_base') || ''; },
    set base(v) { localStorage.setItem('slh_base', v || ''); }
  };

  const getBase = () => (storage.base || window.location.origin);

  function setOutput(id, data) {
    const out = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const el = document.getElementById(id);
    if (el) el.textContent = out;
  }

  function setAuthUI(user) {
    const span = $('#user-info');
    const btn = $('#btn-logout');
    if (user) {
      span.textContent = `${user.full_name} (${user.role})`;
      btn.style.display = '';
    } else if (storage.token) {
      span.textContent = `Authenticated`;
      btn.style.display = '';
    } else {
      span.textContent = 'Not logged in';
      btn.style.display = 'none';
    }
  }

  async function api(path, opts={}) {
    const url = `${getBase()}${path}`;
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (storage.token) headers['Authorization'] = `Bearer ${storage.token}`;
    const res = await fetch(url, Object.assign({}, opts, { headers }));
    let body;
    try { body = await res.json(); } catch(e) { body = { raw: await res.text() } }
    if (!res.ok) throw { status: res.status, body };
    return body;
  }

  // Tabs
  $$('.tabs button').forEach(btn => btn.addEventListener('click', () => {
    $$('.tabs button').forEach(b => b.classList.remove('active'));
    $$('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById(`tab-${btn.dataset.tab}`);
    if (tab) tab.classList.add('active');
  }));

  // Config base URL
  $('#base-url').value = storage.base;
  $('#save-base-url').addEventListener('click', () => {
    storage.base = $('#base-url').value.trim();
    alert(`Base URL set to: ${getBase()}`);
  });

  // Logout
  $('#btn-logout').addEventListener('click', () => {
    storage.token = '';
    setAuthUI(null);
    alert('Logged out');
  });

  // Auth
  $('#btn-register').addEventListener('click', async () => {
    const full_name = $('#reg-fullname').value.trim();
    const email = $('#reg-email').value.trim();
    const password = $('#reg-password').value;
    const role = $('#reg-role').value;
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ full_name, email, password, role }) });
      setOutput('out-register', data);
    } catch (e) {
      setOutput('out-register', e.body || e);
    }
  });

  $('#btn-login').addEventListener('click', async () => {
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      storage.token = data.token;
      setAuthUI(data.user);
      setOutput('out-login', data);
    } catch (e) {
      setOutput('out-login', e.body || e);
    }
  });

  $('#btn-me').addEventListener('click', async () => {
    try {
      const data = await api('/api/auth/me');
      setAuthUI(data.user);
      setOutput('out-me', data);
    } catch (e) { setOutput('out-me', e.body || e); }
  });

  // Courses
  $('#btn-list-courses').addEventListener('click', async () => {
    try { setOutput('out-courses', await api('/api/courses')); }
    catch(e) { setOutput('out-courses', e.body || e); }
  });

  $('#btn-get-course').addEventListener('click', async () => {
    const id = $('#course-id').value.trim();
    try { setOutput('out-course', await api(`/api/courses/${id}`)); }
    catch(e) { setOutput('out-course', e.body || e); }
  });

  $('#btn-create-course').addEventListener('click', async () => {
    const payload = {
      title: $('#new-title').value.trim(),
      description: $('#new-description').value.trim(),
      category: $('#new-category').value.trim() || null,
      difficulty_level: $('#new-difficulty').value.trim() || null,
      estimated_duration: $('#new-estimated').value.trim() || null,
    };
    try { setOutput('out-create-course', await api('/api/courses', { method: 'POST', body: JSON.stringify(payload) })); }
    catch(e) { setOutput('out-create-course', e.body || e); }
  });

  $('#btn-update-course').addEventListener('click', async () => {
    const id = $('#upd-id').value.trim();
    const payload = {
      title: $('#upd-title').value.trim() || undefined,
      description: $('#upd-description').value.trim() || undefined,
      category: $('#upd-category').value.trim() || undefined,
      difficulty_level: $('#upd-difficulty').value.trim() || undefined,
      estimated_duration: $('#upd-estimated').value.trim() || undefined,
    };
    try { setOutput('out-update-course', await api(`/api/courses/${id}`, { method: 'PUT', body: JSON.stringify(payload) })); }
    catch(e) { setOutput('out-update-course', e.body || e); }
  });

  $('#btn-delete-course').addEventListener('click', async () => {
    const id = $('#del-id').value.trim();
    try { setOutput('out-delete-course', await api(`/api/courses/${id}`, { method: 'DELETE' })); }
    catch(e) { setOutput('out-delete-course', e.body || e); }
  });

  // Enrollments
  $('#btn-my-enrollments').addEventListener('click', async () => {
    try { setOutput('out-enrollments', await api('/api/enrollments/my-courses')); }
    catch(e) { setOutput('out-enrollments', e.body || e); }
  });

  $('#btn-enroll').addEventListener('click', async () => {
    const course_id = $('#enroll-course-id').value.trim();
    try { setOutput('out-enroll', await api('/api/enrollments', { method: 'POST', body: JSON.stringify({ course_id }) })); }
    catch(e) { setOutput('out-enroll', e.body || e); }
  });

  $('#btn-unenroll').addEventListener('click', async () => {
    const course_id = $('#unenroll-course-id').value.trim();
    try { setOutput('out-unenroll', await api(`/api/enrollments/${course_id}`, { method: 'DELETE' })); }
    catch(e) { setOutput('out-unenroll', e.body || e); }
  });

  // Progress
  $('#btn-progress-course').addEventListener('click', async () => {
    const course_id = $('#progress-course-id').value.trim();
    try { setOutput('out-progress-course', await api(`/api/progress/course/${course_id}`)); }
    catch(e) { setOutput('out-progress-course', e.body || e); }
  });

  $('#btn-progress-lesson').addEventListener('click', async () => {
    const lesson_id = $('#progress-lesson-id').value.trim();
    const completedVal = $('#progress-completed').value;
    const time_spent = $('#progress-time').value ? parseInt($('#progress-time').value, 10) : undefined;
    const payload = {};
    if (completedVal !== '') payload.completed = completedVal === 'true';
    if (typeof time_spent !== 'undefined' && !Number.isNaN(time_spent)) payload.time_spent = time_spent;
    try { setOutput('out-progress-lesson', await api(`/api/progress/lesson/${lesson_id}`, { method: 'POST', body: JSON.stringify(payload) })); }
    catch(e) { setOutput('out-progress-lesson', e.body || e); }
  });

  $('#btn-my-stats').addEventListener('click', async () => {
    try { setOutput('out-my-stats', await api('/api/progress/stats')); }
    catch(e) { setOutput('out-my-stats', e.body || e); }
  });

  // Users
  $('#btn-list-users').addEventListener('click', async () => {
    const role = $('#users-role').value;
    const search = $('#users-search').value.trim();
    const page = parseInt($('#users-page').value || '1', 10);
    const limit = parseInt($('#users-limit').value || '10', 10);
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', String(limit));
    try { setOutput('out-users', await api(`/api/users?${params.toString()}`)); }
    catch(e) { setOutput('out-users', e.body || e); }
  });

  $('#btn-get-user').addEventListener('click', async () => {
    const id = $('#user-id').value.trim();
    try { setOutput('out-user', await api(`/api/users/${id}`)); }
    catch(e) { setOutput('out-user', e.body || e); }
  });

  $('#btn-update-user').addEventListener('click', async () => {
    const id = $('#upd-user-id').value.trim();
    const payload = {};
    const full_name = $('#upd-user-name').value.trim(); if (full_name) payload.full_name = full_name;
    const email = $('#upd-user-email').value.trim(); if (email) payload.email = email;
    const password = $('#upd-user-password').value; if (password) payload.password = password;
    const ageStr = $('#upd-user-age').value; if (ageStr) payload.age = parseInt(ageStr, 10);
    const guardian_name = $('#upd-user-guardian').value.trim(); if (guardian_name) payload.guardian_name = guardian_name;
    const guardian_contact = $('#upd-user-guardian-contact').value.trim(); if (guardian_contact) payload.guardian_contact = guardian_contact;
    const specialization = $('#upd-user-specialization').value.trim(); if (specialization) payload.specialization = specialization;
    const role = $('#upd-user-role').value; if (role) payload.role = role;
    try { setOutput('out-update-user', await api(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) })); }
    catch(e) { setOutput('out-update-user', e.body || e); }
  });

  $('#btn-delete-user').addEventListener('click', async () => {
    const id = $('#del-user-id').value.trim();
    try { setOutput('out-delete-user', await api(`/api/users/${id}`, { method: 'DELETE' })); }
    catch(e) { setOutput('out-delete-user', e.body || e); }
  });

  $('#btn-user-stats').addEventListener('click', async () => {
    const id = $('#stats-user-id').value.trim();
    try { setOutput('out-user-stats', await api(`/api/users/${id}/stats`)); }
    catch(e) { setOutput('out-user-stats', e.body || e); }
  });

  // Analytics
  $('#btn-analytics').addEventListener('click', async () => {
    try { setOutput('out-analytics', await api('/api/analytics')); }
    catch(e) { setOutput('out-analytics', e.body || e); }
  });

  $('#btn-analytics-instructor').addEventListener('click', async () => {
    const id = $('#analytics-instructor-id').value.trim();
    try { setOutput('out-analytics-instructor', await api(`/api/analytics/instructor/${id}`)); }
    catch(e) { setOutput('out-analytics-instructor', e.body || e); }
  });

  // Initialize
  setAuthUI(null);
})();
