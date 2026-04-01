// ========== CONFIGURACIÓN DE INDEXEDDB Y SINCRONIZACIÓN ==========
let db;
const DB_NAME = 'AnimeTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'animes';
const PENDING_STORE = 'pending_ops';

const imageInput = document.getElementById('imageInput');
const editImage = document.getElementById('editImage');
const darkModeToggle = document.getElementById('darkModeToggle');
const API_URL = '/api/animes'; // Ruta relativa, servida por el backend
let currentFilter = 'all';
let animes = [];
let editingId = null;

// Elementos DOM
const fab = document.getElementById('fab');
const navItems = document.querySelectorAll('.nav-item');
const modalTitle = document.getElementById('modalTitle'); // si agregaste ese span
const animeGrid = document.getElementById('animeGrid');
const addBtn = document.getElementById('addBtn');
const titleInput = document.getElementById('titleInput');
const statusInput = document.getElementById('statusInput');
const notesInput = document.getElementById('notesInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const editModal = document.getElementById('editModal');
const editTitle = document.getElementById('editTitle');
const editStatus = document.getElementById('editStatus');
const editNotes = document.getElementById('editNotes');
const saveEditBtn = document.getElementById('saveEditBtn');
const closeModalSpan = document.querySelector('.close-modal');

// Abrir base de datos local
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Store para animes locales
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            // Store para operaciones pendientes (create, update, delete)
            if (!db.objectStoreNames.contains(PENDING_STORE)) {
                db.createObjectStore(PENDING_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Cargar tema guardado o detectar preferencia del sistema
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    applyTheme(savedTheme);
} else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
}

// Escuchar clic en el botón
darkModeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
});

// Cargar animes desde IndexedDB (local)
async function loadLocalAnimes() {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Cargar animes desde API
async function loadAnimes() {
    try {
        const res = await fetch(API_URL);
        animes = await res.json();
        renderAnimes();
    } catch (error) {
        console.error('Error cargando animes:', error);
    }
}

// Renderizar según filtro actual
function renderAnimes() {
    let filtered = animes;
    if (currentFilter !== 'all') {
        filtered = animes.filter(anime => anime.status === currentFilter);
    }
    if (filtered.length === 0) {
        animeGrid.innerHTML = `<div class="empty-state">✨ No hay animes en esta categoría. ¡Agrega uno!</div>`;
        return;
    }
    animeGrid.innerHTML = filtered.map(anime => `
        <div class="anime-card" data-id="${anime.id}">
            ${anime.image_url ? `<img src="${escapeHtml(anime.image_url)}" alt="${escapeHtml(anime.title)}" class="anime-image" onerror="this.style.display='none'">` : ''}
            <div class="anime-title">${escapeHtml(anime.title)}</div>
            <span class="anime-status status-${anime.status.replace(/_/g, '-')}">
                ${getStatusText(anime.status)}
            </span>
            ${anime.notes ? `<div class="anime-notes">📝 ${escapeHtml(anime.notes)}</div>` : ''}
            <div class="card-actions">
                <button class="edit-btn" data-id="${anime.id}">✏️ Editar</button>
                <button class="delete-btn" data-id="${anime.id}">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');

    // Eventos para editar/eliminar
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteAnime(parseInt(btn.dataset.id)));
    });
}

function getStatusText(status) {
    switch(status) {
        case 'visto': return '✅ Visto';
        case 'por_ver': return '⏳ Por ver';
        case 'quiero_ver': return '⭐ Quiero ver';
        default: return status;
    }
}

// Agregar anime
async function addAnime() {
    const title = titleInput.value.trim();
    const status = statusInput.value;
    const notes = notesInput.value.trim();
    const image_url = imageInput.value.trim();
    if (!title) {
        alert('Por favor ingresa el título del anime.');
        return;
    }
    const newAnime = { title, status, notes, image_url };
    
    // Optimistic update: agregar localmente con ID temporal
    const tempId = Date.now(); // ID temporal
    const localAnime = { ...newAnime, id: tempId };
    animes.unshift(localAnime);
    await saveLocalAnimes(animes);
    renderAnimes();

    // Limpiar inputs
    titleInput.value = '';
    notesInput.value = '';
    imageInput.value = '';

    // Registrar operación pendiente
    await addPendingOperation('create', newAnime);
    
    // Intentar sincronizar inmediatamente (si hay conexión)
    syncPendingOperations().then(() => {
        // Después de sincronizar, recargar datos del servidor
        fetchFromServerAndUpdateLocal();
    });
}
// Eliminar anime
async function deleteAnime(id) {
    if (!confirm('¿Eliminar este anime de tu lista?')) return;
    
    // Optimistic delete: eliminar localmente
    const index = animes.findIndex(a => a.id === id);
    if (index !== -1) animes.splice(index, 1);
    await saveLocalAnimes(animes);
    renderAnimes();
    
    // Registrar operación pendiente
    await addPendingOperation('delete', { id });
    
    syncPendingOperations().then(() => {
        fetchFromServerAndUpdateLocal();
    });
}

// Abrir modal de edición
function openEditModal(id) {
    const anime = animes.find(a => a.id === id);
    if (!anime) return;
    editingId = id;
    editTitle.value = anime.title;
    editStatus.value = anime.status;
    editNotes.value = anime.notes || '';
    editImage.value = anime.image_url || '';
    modalTitle.textContent = 'Editar anime';
    editModal.style.display = 'flex';
}

// Guardar cambios
async function saveEdit() {
    const updatedTitle = editTitle.value.trim();
    const updatedStatus = editStatus.value;
    const updatedNotes = editNotes.value.trim();
    const updatedImage = editImage.value.trim();
    if (!updatedTitle) {
        alert('El título no puede estar vacío.');
        return;
    }

    if (editingId === null) {
        // Crear nuevo anime
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: updatedTitle,
                    status: updatedStatus,
                    notes: updatedNotes,
                    image_url: updatedImage
                })
            });
            if (res.ok) {
                closeModal();
                loadAnimes();
            } else {
                alert('Error al agregar anime.');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión.');
        }
    } else {
        // Actualizar existente (código que ya tenías)
        try {
            const res = await fetch(`${API_URL}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: updatedTitle,
                    status: updatedStatus,
                    notes: updatedNotes,
                    image_url: updatedImage
                })
            });
            if (res.ok) {
                closeModal();
                loadAnimes();
            } else {
                alert('Error al actualizar.');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión.');
        }
    }
}

function closeModal() {
    editModal.style.display = 'none';
    editingId = null;
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Event listeners
addBtn.addEventListener('click', addAnime);
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderAnimes();
    });
});
saveEditBtn.addEventListener('click', saveEdit);
closeModalSpan.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
});


// Función para aplicar el tema
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        darkModeToggle.textContent = '🌙';
    }
    localStorage.setItem('theme', theme);
}

// Guardar lista completa de animes en IndexedDB (reemplazar)
function saveLocalAnimes(animesArray) {
    if (!db) return Promise.reject('DB not ready');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        // Limpiar store y volver a guardar
        store.clear().onsuccess = () => {
            let count = 0;
            if (animesArray.length === 0) {
                resolve();
                return;
            }
            animesArray.forEach(anime => {
                store.put(anime).onsuccess = () => {
                    count++;
                    if (count === animesArray.length) resolve();
                };
            });
        };
        transaction.onerror = () => reject(transaction.error);
    });
}

// Agregar operación pendiente (para cuando offline)
function addPendingOperation(operation, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORE);
        const pending = {
            operation, // 'create', 'update', 'delete'
            data,
            timestamp: Date.now()
        };
        const request = store.add(pending);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obtener todas las operaciones pendientes
function getPendingOperations() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_STORE], 'readonly');
        const store = transaction.objectStore(PENDING_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Eliminar operación pendiente después de sincronizar
function removePendingOperation(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Sincronizar operaciones pendientes con el servidor
async function syncPendingOperations() {
    const pending = await getPendingOperations();
    if (pending.length === 0) return;

    // Procesar cada operación en orden (según timestamp)
    for (const op of pending) {
        try {
            switch (op.operation) {
                case 'create':
                    await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(op.data)
                    });
                    break;
                case 'update':
                    await fetch(`${API_URL}/${op.data.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(op.data)
                    });
                    break;
                case 'delete':
                    await fetch(`${API_URL}/${op.data.id}`, {
                        method: 'DELETE'
                    });
                    break;
            }
            await removePendingOperation(op.id);
        } catch (err) {
            console.error('Error sincronizando operación', op, err);
            // Si falla, detenemos la sincronización para reintentar después
            break;
        }
    }
}

// Cargar datos desde el servidor y actualizar local
async function fetchFromServerAndUpdateLocal() {
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            const serverAnimes = await res.json();
            animes = serverAnimes;
            await saveLocalAnimes(serverAnimes);
            renderAnimes();
            // Después de obtener datos del servidor, intentamos sincronizar pendientes
            await syncPendingOperations();
            // Volver a cargar por si la sincronización cambió algo
            const updated = await loadLocalAnimes();
            animes = updated;
            renderAnimes();
        } else {
            // Si falla, usar datos locales
            const local = await loadLocalAnimes();
            if (local.length > 0) {
                animes = local;
                renderAnimes();
            }
        }
    } catch (error) {
        console.log('Offline: usando datos locales');
        const local = await loadLocalAnimes();
        if (local.length > 0) {
            animes = local;
            renderAnimes();
        } else {
            // Sin datos locales y sin conexión
            animes = [];
            renderAnimes();
        }
    }
}

// Reemplazar filtros
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentFilter = item.dataset.filter;
        renderAnimes();
    });
});

// Activar filtro inicial (Todos)
document.querySelector('.nav-item[data-filter="all"]').classList.add('active');
fab.addEventListener('click', () => {
    // Limpiar campos
    editTitle.value = '';
    editStatus.value = 'por_ver';
    editNotes.value = '';
    editImage.value = '';
    editingId = null;
    modalTitle.textContent = 'Agregar anime';
    editModal.style.display = 'flex';
});

loadAnimes();
// Inicializar
(async () => {
    await openDB();
    await fetchFromServerAndUpdateLocal();
    
    // Escuchar cambios de conexión para sincronizar automáticamente
    window.addEventListener('online', () => {
        console.log('Conexión recuperada, sincronizando...');
        syncPendingOperations().then(() => fetchFromServerAndUpdateLocal());
    });
})();