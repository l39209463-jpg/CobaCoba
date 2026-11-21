const STORAGE_KEY = "ruangbimbing-data-v1";
const SESSION_KEY = "ruangbimbing-session-v1";

const initialUsers = [
  { id: "mhs-001", name: "Nadia Putri", email: "mahasiswa@kampus.ac.id", role: "mahasiswa", program: "Informatika 2023" },
  { id: "dsn-001", name: "Dr. Budi Santoso, S.Kom., M.T.", email: "dosen@kampus.ac.id", role: "dosen", program: "Dosen Pembimbing Akademik" },
  { id: "adm-001", name: "Rina Kurniawati", email: "admin@kampus.ac.id", role: "admin", program: "Administrator Prodi" },
  { id: "mhs-002", name: "Rafi Pratama", email: "rafi@kampus.ac.id", role: "mahasiswa", program: "Informatika 2022" }
];

const dateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.users) && Array.isArray(saved.appointments)) return saved;
    } catch (error) {
      console.error("Data demo tidak dapat dibaca:", error);
    }
  }
  return {
    users: initialUsers,
    appointments: [
      {
        id: "BIM-1004", studentId: "mhs-001", lecturerId: "dsn-001", topic: "Evaluasi KRS semester berjalan",
        notes: "Diskusi mata kuliah pilihan dan rencana studi semester ini.",
        date: dateOffset(-2), time: "09:30", status: "completed",
        result: "KRS disetujui. Mahasiswa disarankan mengambil mata kuliah pilihan Data Mining.",
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
      },
      {
        id: "BIM-1003", studentId: "mhs-001", lecturerId: "dsn-001", topic: "Konsultasi rencana tugas akhir",
        notes: "Ingin berkonsultasi tentang pemilihan topik penelitian.",
        date: dateOffset(2), time: "10:00", status: "scheduled", result: "",
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: "BIM-1002", studentId: "mhs-002", lecturerId: "dsn-001", topic: "Evaluasi hasil studi",
        notes: "Membahas strategi belajar dan target akademik semester depan.",
        date: dateOffset(-8), time: "13:00", status: "completed",
        result: "Disepakati jadwal belajar mingguan dan konsultasi lanjutan setelah UTS.",
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: "BIM-1001", studentId: "mhs-001", lecturerId: "dsn-001", topic: "Diskusi kendala mata kuliah",
        notes: "Memerlukan arahan terkait materi pemrograman lanjut.",
        date: "", time: "", status: "pending", result: "",
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  };
}

let data = loadData();
let activeView = "dashboard";
let searchQuery = "";
let statusFilter = "all";
let toastTimer;

const app = document.getElementById("app");
const roleLabels = { mahasiswa: "Mahasiswa", dosen: "Dosen", admin: "Admin" };
const statusLabels = { pending: "Menunggu jadwal", scheduled: "Terjadwal", completed: "Selesai", cancelled: "Dibatalkan" };
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "bimbingan", label: "Bimbingan", icon: "▤" },
  { id: "riwayat", label: "Riwayat", icon: "◷" },
  { id: "laporan", label: "Laporan", icon: "▥", roles: ["dosen", "admin"] }
];

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function currentUser() {
  const id = sessionStorage.getItem(SESSION_KEY);
  return data.users.find((user) => user.id === id) || null;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", options).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function userById(id) {
  return data.users.find((user) => user.id === id);
}

function visibleAppointments(user, view = activeView) {
  let items = data.appointments;
  if (user.role === "mahasiswa") items = items.filter((item) => item.studentId === user.id);
  if (user.role === "dosen") items = items.filter((item) => item.lecturerId === user.id);
  if (view === "riwayat") items = items.filter((item) => ["completed", "cancelled"].includes(item.status));
  if (view === "bimbingan") items = items.filter((item) => !["completed", "cancelled"].includes(item.status));
  return items;
}

function showLogin() {
  const email = document.getElementById("login-email")?.value || "";
  const password = document.getElementById("login-password")?.value || "";
  app.innerHTML = `
    <main class="login-page">
      <section class="login-art">
        <div class="brand"><span class="brand-mark">R</span><span>ruangbimbing</span></div>
        <div class="login-art-copy">
          <div class="eyebrow">Program Studi Informatika</div>
          <h1>Bimbingan lebih terarah, perkembangan lebih terpantau.</h1>
          <p>Ruang kolaborasi mahasiswa dan dosen untuk merencanakan, mencatat, dan memantau perjalanan akademik.</p>
        </div>
        <div class="login-art-foot">Sistem Informasi Monitoring Bimbingan Akademik</div>
      </section>
      <section class="login-panel">
        <div class="login-box">
          <div class="eyebrow">Selamat datang kembali</div>
          <h2>Masuk ke akun Anda</h2>
          <p>Gunakan akun demo untuk menjelajahi alur sistem bimbingan akademik.</p>
          <form id="login-form">
            <div class="field"><label for="login-email">Email</label><input id="login-email" type="email" placeholder="nama@kampus.ac.id" autocomplete="username" required value="${escapeHtml(email)}"></div>
            <div class="field"><label for="login-password">Kata sandi</label><input id="login-password" type="password" placeholder="Masukkan kata sandi" autocomplete="current-password" required value="${escapeHtml(password)}"></div>
            <p id="login-error" class="field-hint" style="color:var(--red);min-height:16px;margin:0 0 10px"></p>
            <button class="btn btn-primary btn-block" type="submit">Masuk <span aria-hidden="true">→</span></button>
          </form>
          <div class="demo-box">
            <strong>Akun demo <span style="font-weight:400;color:var(--muted)">(kata sandi: demo123)</span></strong>
            <div class="demo-buttons">
              <button type="button" data-demo="mahasiswa@kampus.ac.id">Mahasiswa</button>
              <button type="button" data-demo="dosen@kampus.ac.id">Dosen</button>
              <button type="button" data-demo="admin@kampus.ac.id">Admin</button>
            </div>
          </div>
        </div>
      </section>
    </main>`;
  document.getElementById("login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formEmail = document.getElementById("login-email").value.trim().toLowerCase();
    const formPassword = document.getElementById("login-password").value;
    const user = data.users.find((item) => item.email.toLowerCase() === formEmail);
    if (!user || formPassword !== "demo123") {
      document.getElementById("login-error").textContent = "Email atau kata sandi tidak sesuai. Gunakan akun demo yang tersedia.";
      return;
    }
    sessionStorage.setItem(SESSION_KEY, user.id);
    activeView = "dashboard";
    render();
  });
  app.querySelectorAll("[data-demo]").forEach((button) => button.addEventListener("click", () => {
    document.getElementById("login-email").value = button.dataset.demo;
    document.getElementById("login-password").value = "demo123";
  }));
}

function shell(user) {
  const allowedNav = navItems.filter((item) => !item.roles || item.roles.includes(user.role));
  const title = navItems.find((item) => item.id === activeView)?.label || "Dashboard";
  const today = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><span class="brand-mark">R</span><span>ruangbimbing</span></div>
        <div class="nav-label">Menu utama</div>
        <nav class="nav-list" aria-label="Navigasi utama">
          ${allowedNav.map((item) => `<button class="nav-link ${activeView === item.id ? "active" : ""}" type="button" data-view="${item.id}"><span class="nav-icon">${item.icon}</span>${item.label}</button>`).join("")}
        </nav>
        <div class="sidebar-bottom">
          <div class="sidebar-note"><strong>Ruang tumbuh akademik</strong>Catat setiap percakapan penting dan pantau langkah berikutnya bersama dosen pembimbing.</div>
          <div class="profile-mini">
            <div class="avatar">${escapeHtml(initials(user.name))}</div>
            <div class="profile-text"><strong>${escapeHtml(user.name)}</strong><span>${roleLabels[user.role]}</span></div>
            <button class="logout" type="button" data-action="logout" title="Keluar" aria-label="Keluar">↪</button>
          </div>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="mobile-menu" type="button" data-action="menu" aria-label="Buka menu">☰</button>
            <div><h1 class="page-title">${title}</h1><div class="breadcrumb">Sistem Informasi <span style="margin:0 5px">/</span> ${title}</div></div>
          </div>
          <div class="topbar-right">
            <div class="date-today">${today}</div>
            <div class="top-avatar"><div class="avatar">${escapeHtml(initials(user.name))}</div><div class="profile-text"><strong>${escapeHtml(user.name)}</strong><span>${roleLabels[user.role]}</span></div></div>
          </div>
        </header>
        <section class="content" id="view-content"></section>
      </main>
      <div id="modal-root"></div>
      <div id="toast-root" aria-live="polite"></div>
    </div>`;
  app.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    activeView = button.dataset.view;
    searchQuery = "";
    statusFilter = "all";
    render();
  }));
  app.querySelector('[data-action="logout"]').addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    render();
  });
  app.querySelector('[data-action="menu"]').addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  const view = document.getElementById("view-content");
  if (activeView === "dashboard") renderDashboard(view, user);
  else renderAppointments(view, user, activeView);
}

function statCard(label, value, icon, tone = "") {
  return `<div class="stat-card"><div><p>${label}</p><strong>${value}</strong></div><div class="stat-icon ${tone}">${icon}</div></div>`;
}

function appointmentRows(appointments, user, includeActions = true) {
  if (!appointments.length) return `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◷</div>Belum ada data bimbingan untuk ditampilkan.</div></td></tr>`;
  return appointments.map((item) => {
    const student = userById(item.studentId);
    const lecturer = userById(item.lecturerId);
    const action = includeActions ? actionButtons(item, user) : "";
    return `<tr>
      <td><strong>${escapeHtml(item.topic)}</strong><small>${escapeHtml(item.id)} · ${formatDateTime(item.createdAt)}</small></td>
      ${(user.role !== "mahasiswa") ? `<td><strong>${escapeHtml(student?.name || "Mahasiswa")}</strong><small>${escapeHtml(student?.program || "")}</small></td>` : ""}
      ${(user.role === "mahasiswa") ? `<td><strong>${escapeHtml(lecturer?.name || "Belum ditentukan")}</strong></td>` : ""}
      <td>${item.date ? `<strong>${formatDate(item.date)}</strong><small>${escapeHtml(item.time || "")} WIB</small>` : '<span style="color:var(--muted)">Belum dijadwalkan</span>'}</td>
      <td><span class="status ${item.status}">${statusLabels[item.status]}</span></td>
      ${includeActions ? `<td><div class="action-cell">${action}</div></td>` : ""}
    </tr>`;
  }).join("");
}

function actionButtons(item, user) {
  if (item.status === "pending" && user.role !== "mahasiswa") {
    return `<button class="btn btn-outline btn-sm" data-action="schedule" data-id="${item.id}">Jadwalkan</button>`;
  }
  if (item.status === "scheduled" && user.role !== "mahasiswa") {
    return `<button class="btn btn-primary btn-sm" data-action="complete" data-id="${item.id}">Catat hasil</button>`;
  }
  if (item.status === "scheduled" && user.role === "mahasiswa") {
    return `<button class="btn btn-light btn-sm" data-action="detail" data-id="${item.id}">Detail</button>`;
  }
  if (["completed", "cancelled"].includes(item.status)) {
    return `<button class="btn btn-light btn-sm" data-action="detail" data-id="${item.id}">Lihat hasil</button>`;
  }
  return `<span style="color:var(--muted);font-size:10px">Menunggu dosen</span>`;
}

function renderDashboard(root, user) {
  const appointments = visibleAppointments(user, "dashboard").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = appointments.filter((item) => item.status === "pending").length;
  const scheduled = appointments.filter((item) => item.status === "scheduled").length;
  const completed = appointments.filter((item) => item.status === "completed").length;
  const upcoming = appointments.filter((item) => item.status === "scheduled" && item.date >= dateOffset(0)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const next = upcoming[0];
  const displayName = user.name.split(" ")[0];
  const quickAction = user.role === "mahasiswa" ? `<button class="btn btn-primary" data-action="new">＋ Ajukan bimbingan</button>` : `<button class="btn btn-outline" data-view="bimbingan">Kelola bimbingan →</button>`;
  root.innerHTML = `
    <div class="welcome"><div><div class="eyebrow">${roleLabels[user.role]} · Informatika</div><h2>Halo, ${escapeHtml(displayName)} 👋</h2><p>Berikut ringkasan aktivitas bimbingan akademik Anda.</p></div>${quickAction}</div>
    <div class="stat-grid">
      ${statCard("Total bimbingan", appointments.length, "▤")}
      ${statCard("Menunggu jadwal", pending, "◷", "amber")}
      ${statCard("Terjadwal", scheduled, "◫")}
      ${statCard("Selesai", completed, "✓", "green")}
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head"><div><h3>Aktivitas bimbingan</h3><p>Perkembangan konsultasi terbaru</p></div><button class="btn btn-light btn-sm" data-view="bimbingan">Lihat semua</button></div>
        <div class="table-wrap"><table><thead><tr><th>Topik</th>${user.role === "mahasiswa" ? "<th>Dosen</th>" : "<th>Mahasiswa</th>"}<th>Jadwal</th><th>Status</th></tr></thead><tbody>${appointmentRows(appointments.slice(0, 4), user, false)}</tbody></table></div>
      </section>
      <div>
        <section class="panel" style="margin-bottom:16px">
          <div class="panel-head"><div><h3>Jadwal berikutnya</h3><p>Konsultasi yang akan datang</p></div><span class="stat-icon">◷</span></div>
          <div class="panel-body">${next ? `<div class="upcoming-card"><div class="upcoming-date">${formatDate(next.date, { weekday: "short", day: "numeric", month: "long" })} · ${escapeHtml(next.time)} WIB</div><strong>${escapeHtml(next.topic)}</strong><p>${user.role === "mahasiswa" ? `Dosen: ${escapeHtml(userById(next.lecturerId)?.name || "Belum ditentukan")}` : `Mahasiswa: ${escapeHtml(userById(next.studentId)?.name || "")}`}</p></div><button class="btn btn-light btn-sm" data-action="detail" data-id="${next.id}">Lihat detail</button>` : `<div class="empty-state"><div class="empty-icon">◷</div>Belum ada jadwal mendatang.</div>`}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><h3>Langkah berikutnya</h3><p>Jaga proses bimbingan tetap berjalan</p></div></div>
          <div class="panel-body" style="font-size:11px;line-height:1.75;color:#687287">
            ${user.role === "mahasiswa" ? "Ajukan konsultasi saat Anda memerlukan arahan. Catatan dan hasil diskusi akan tersimpan di riwayat bimbingan." : "Tinjau permohonan yang masuk, atur jadwal konsultasi, lalu catat hasil diskusi agar kemajuan mahasiswa terpantau."}
          </div>
        </section>
      </div>
    </div>`;
  root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    activeView = button.dataset.view; render();
  }));
  root.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.id, user)));
}

function renderAppointments(root, user, view) {
  const isHistory = view === "riwayat";
  const isReport = view === "laporan";
  let items = visibleAppointments(user, view).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (statusFilter !== "all") items = items.filter((item) => item.status === statusFilter);
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    items = items.filter((item) => {
      const student = userById(item.studentId)?.name || "";
      const lecturer = userById(item.lecturerId)?.name || "";
      return [item.topic, item.id, student, lecturer, item.status].join(" ").toLowerCase().includes(query);
    });
  }
  const allVisible = visibleAppointments(user, view);
  const statusOptions = isHistory
    ? [["all", "Semua status"], ["completed", "Selesai"], ["cancelled", "Dibatalkan"]]
    : isReport
      ? [["all", "Semua status"], ["pending", "Menunggu jadwal"], ["scheduled", "Terjadwal"], ["completed", "Selesai"]]
      : [["all", "Semua status"], ["pending", "Menunggu jadwal"], ["scheduled", "Terjadwal"]];
  const columns = `<th>Topik bimbingan</th>${user.role !== "mahasiswa" ? "<th>Mahasiswa</th>" : "<th>Dosen pembimbing</th>"}<th>Jadwal</th><th>Status</th>${isReport ? "<th>Hasil bimbingan</th>" : "<th>Aksi</th>"}`;
  const rows = isReport ? reportRows(items, user) : appointmentRows(items, user);
  root.innerHTML = `
    <div class="section-heading">
      <div><div class="eyebrow">${isHistory ? "Arsip konsultasi" : isReport ? "Ringkasan aktivitas" : "Kelola konsultasi"}</div><h2>${isHistory ? "Riwayat bimbingan" : isReport ? "Laporan bimbingan" : "Daftar bimbingan"}</h2><p>${isHistory ? "Catatan dan hasil konsultasi yang telah selesai." : isReport ? "Pantau aktivitas bimbingan dan ekspor laporan." : "Pantau permohonan, jadwal, dan tindak lanjut bimbingan."}</p></div>
      ${user.role === "mahasiswa" && !isHistory ? '<button class="btn btn-primary" data-action="new">＋ Ajukan bimbingan</button>' : isReport ? '<button class="btn btn-outline" data-action="export">↓ Ekspor CSV</button>' : ""}
    </div>
    ${isReport ? `<div class="report-summary">
      <div class="report-tile"><span>Total aktivitas</span><strong>${allVisible.length}</strong></div>
      <div class="report-tile"><span>Bimbingan selesai</span><strong>${allVisible.filter((item) => item.status === "completed").length}</strong></div>
      <div class="report-tile"><span>Menunggu tindak lanjut</span><strong>${allVisible.filter((item) => item.status === "pending").length}</strong></div>
    </div>` : ""}
    <section class="panel">
      <div class="filter-row">
        <div class="toolbar"><input id="search-input" type="search" placeholder="Cari topik atau nama..." value="${escapeHtml(searchQuery)}"><select id="status-filter" aria-label="Filter status">${statusOptions.map(([value, label]) => `<option value="${value}" ${statusFilter === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="result-count">${items.length} data</div>
      </div>
      <div class="table-wrap"><table><thead><tr>${columns}</tr></thead><tbody>${rows}</tbody></table></div>
      ${isReport ? '<div class="report-footnote">Laporan mencakup data bimbingan sesuai akses akun yang sedang digunakan.</div>' : ""}
    </section>`;
  const search = root.querySelector("#search-input");
  const filter = root.querySelector("#status-filter");
  if (search) search.addEventListener("input", () => { searchQuery = search.value; render(); preserveSearchFocus(); });
  if (filter) filter.addEventListener("change", () => { statusFilter = filter.value; render(); });
  root.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.id, user)));
}

function preserveSearchFocus() {
  const input = document.getElementById("search-input");
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function reportRows(items, user) {
  if (!items.length) return `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">▥</div>Belum ada data untuk filter ini.</div></td></tr>`;
  return items.map((item) => {
    const student = userById(item.studentId);
    const lecturer = userById(item.lecturerId);
    return `<tr>
      <td><strong>${escapeHtml(item.topic)}</strong><small>${escapeHtml(item.id)} · ${formatDateTime(item.createdAt)}</small></td>
      <td><strong>${escapeHtml(user.role === "mahasiswa" ? lecturer?.name || "Belum ditentukan" : student?.name || "Mahasiswa")}</strong></td>
      <td>${item.date ? `<strong>${formatDate(item.date)}</strong><small>${escapeHtml(item.time || "")} WIB</small>` : "—"}</td>
      <td><span class="status ${item.status}">${statusLabels[item.status]}</span></td>
      <td>${item.result ? escapeHtml(item.result) : '<span style="color:var(--muted)">Belum dicatat</span>'}</td>
    </tr>`;
  }).join("");
}

function handleAction(action, id, user) {
  if (action === "new") return openNewRequest(user);
  if (action === "schedule") return openSchedule(id);
  if (action === "complete") return openResult(id);
  if (action === "detail") return openDetail(id);
  if (action === "export") return exportCsv(user);
}

function showModal(title, body) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="modal-head"><h3>${escapeHtml(title)}</h3><button class="modal-close" type="button" data-action="close-modal" aria-label="Tutup">×</button></div><div class="modal-body">${body}</div></section></div>`;
  root.querySelector(".modal-backdrop").addEventListener("click", (event) => {
    if (event.target === event.currentTarget || event.target.closest('[data-action="close-modal"]')) root.innerHTML = "";
  });
}

function openNewRequest(user) {
  showModal("Ajukan bimbingan akademik", `
    <form id="request-form">
      <div class="field"><label for="request-topic">Topik konsultasi</label><input id="request-topic" name="topic" maxlength="100" placeholder="Contoh: konsultasi rencana tugas akhir" required></div>
      <div class="field"><label for="request-notes">Ceritakan hal yang ingin dibahas</label><textarea id="request-notes" name="notes" maxlength="1000" placeholder="Tuliskan konteks atau pertanyaan agar dosen dapat mempersiapkan konsultasi." required></textarea><span class="field-hint">Maksimal 1.000 karakter.</span></div>
      <div class="field"><label for="request-date">Usulan tanggal (opsional)</label><input id="request-date" name="date" type="date" min="${dateOffset(0)}"></div>
      <div class="form-actions"><button class="btn btn-light" type="button" data-action="close-modal">Batal</button><button class="btn btn-primary" type="submit">Kirim permohonan</button></div>
    </form>`);
  document.getElementById("request-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lecturer = data.users.find((item) => item.role === "dosen");
    data.appointments.unshift({
      id: `BIM-${Date.now().toString().slice(-6)}`,
      studentId: user.id, lecturerId: lecturer?.id || "", topic: form.get("topic").trim(),
      notes: form.get("notes").trim(), date: form.get("date") || "", time: "",
      status: "pending", result: "", createdAt: new Date().toISOString()
    });
    saveData();
    document.getElementById("modal-root").innerHTML = "";
    render();
    showToast("Permohonan bimbingan berhasil dikirim.");
  });
}

function openSchedule(id) {
  const item = data.appointments.find((appointment) => appointment.id === id);
  if (!item) return;
  showModal("Atur jadwal konsultasi", `
    <p style="font-size:12px;color:var(--muted);line-height:1.65;margin:0 0 17px"><strong style="color:var(--ink)">${escapeHtml(item.topic)}</strong><br>${escapeHtml(item.notes)}</p>
    <form id="schedule-form">
      <div class="form-row">
        <div class="field"><label for="schedule-date">Tanggal</label><input id="schedule-date" name="date" type="date" min="${dateOffset(0)}" value="${item.date && item.date >= dateOffset(0) ? item.date : dateOffset(1)}" required></div>
        <div class="field"><label for="schedule-time">Waktu</label><input id="schedule-time" name="time" type="time" value="09:00" required></div>
      </div>
      <div class="form-actions"><button class="btn btn-light" type="button" data-action="close-modal">Batal</button><button class="btn btn-primary" type="submit">Simpan jadwal</button></div>
    </form>`);
  document.getElementById("schedule-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    item.date = form.get("date");
    item.time = form.get("time");
    item.status = "scheduled";
    item.lecturerId = currentUser()?.role === "dosen" ? currentUser().id : item.lecturerId;
    saveData();
    document.getElementById("modal-root").innerHTML = "";
    render();
    showToast("Jadwal konsultasi berhasil disimpan.");
  });
}

function openResult(id) {
  const item = data.appointments.find((appointment) => appointment.id === id);
  if (!item) return;
  showModal("Catat hasil bimbingan", `
    <div style="background:#f6f8fc;border-radius:8px;padding:12px;margin-bottom:16px"><strong style="font-size:12px">${escapeHtml(item.topic)}</strong><div style="font-size:10px;color:var(--muted);margin-top:5px">${escapeHtml(userById(item.studentId)?.name || "")} · ${formatDate(item.date)} ${escapeHtml(item.time)} WIB</div></div>
    <form id="result-form">
      <div class="field"><label for="result-notes">Hasil konsultasi dan tindak lanjut</label><textarea id="result-notes" name="result" maxlength="1500" placeholder="Tuliskan ringkasan pembahasan, arahan, dan tindak lanjut." required>${escapeHtml(item.result)}</textarea></div>
      <div class="form-actions"><button class="btn btn-light" type="button" data-action="close-modal">Batal</button><button class="btn btn-primary" type="submit">Simpan hasil</button></div>
    </form>`);
  document.getElementById("result-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const result = new FormData(event.currentTarget).get("result").trim();
    if (!result) return;
    item.result = result;
    item.status = "completed";
    saveData();
    document.getElementById("modal-root").innerHTML = "";
    render();
    showToast("Hasil bimbingan berhasil dicatat.");
  });
}

function openDetail(id) {
  const item = data.appointments.find((appointment) => appointment.id === id);
  if (!item) return;
  const student = userById(item.studentId);
  const lecturer = userById(item.lecturerId);
  showModal("Detail bimbingan", `
    <div style="display:grid;gap:15px">
      <div><div class="eyebrow">Topik konsultasi</div><strong style="display:block;margin-top:6px;font-size:13px">${escapeHtml(item.topic)}</strong></div>
      <div><div class="eyebrow">Status</div><span class="status ${item.status}" style="margin-top:7px">${statusLabels[item.status]}</span></div>
      <div><div class="eyebrow">Jadwal</div><div style="font-size:12px;margin-top:6px">${item.date ? `${formatDate(item.date)} · ${escapeHtml(item.time)} WIB` : "Menunggu jadwal dari dosen"}</div></div>
      <div><div class="eyebrow">Peserta</div><div style="font-size:12px;margin-top:6px">Mahasiswa: ${escapeHtml(student?.name || "—")}<br>Dosen: ${escapeHtml(lecturer?.name || "Belum ditentukan")}</div></div>
      <div><div class="eyebrow">Catatan mahasiswa</div><div style="font-size:12px;line-height:1.65;margin-top:6px">${escapeHtml(item.notes)}</div></div>
      ${item.result ? `<div><div class="eyebrow">Hasil dan tindak lanjut</div><div style="font-size:12px;line-height:1.65;margin-top:6px">${escapeHtml(item.result)}</div></div>` : ""}
    </div>
    <div class="form-actions"><button class="btn btn-primary" type="button" data-action="close-modal">Tutup</button></div>`);
}

function exportCsv(user) {
  const items = visibleAppointments(user, "laporan");
  const headers = ["ID", "Mahasiswa", "Dosen", "Topik", "Catatan mahasiswa", "Tanggal", "Waktu", "Status", "Hasil bimbingan"];
  const rows = items.map((item) => [
    item.id, userById(item.studentId)?.name || "", userById(item.lecturerId)?.name || "",
    item.topic, item.notes, item.date, item.time, statusLabels[item.status], item.result
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-bimbingan-${dateOffset(0)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Laporan CSV berhasil diunduh.");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function showToast(message) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  root.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (root.isConnected) root.innerHTML = ""; }, 3000);
}

function render() {
  const user = currentUser();
  if (!user) {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
    return;
  }
  if (!navItems.some((item) => item.id === activeView && (!item.roles || item.roles.includes(user.role)))) activeView = "dashboard";
  shell(user);
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    data = loadData();
    render();
  }
});

render();
