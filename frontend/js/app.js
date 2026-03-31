const imageInput = document.getElementById('imageInput');
const editImage = document.getElementById('editImage');
const API_URL = '/api/animes'; // Ruta relativa, servida por el backend
let currentFilter = 'all';
let animes = [];
let editingId = null;

// Elementos DOM
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
    const image_url = imageInput.value.trim(); // nueva
    if (!title) {
        alert('Por favor ingresa el título del anime.');
        return;
    }
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, status, notes, image_url })
        });
        if (res.ok) {
            titleInput.value = '';
            notesInput.value = '';
            imageInput.value = ''; // limpiar
            loadAnimes();
        } else {
            alert('Error al agregar anime.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión.');
    }
}

// Eliminar anime
async function deleteAnime(id) {
    if (!confirm('¿Eliminar este anime de tu lista?')) return;
    try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadAnimes();
        } else {
            alert('Error al eliminar.');
        }
    } catch (error) {
        console.error(error);
    }
}

// Abrir modal de edición
function openEditModal(id) {
    const anime = animes.find(a => a.id === id);
    if (!anime) return;
    editingId = id;
    editTitle.value = anime.title;
    editStatus.value = anime.status;
    editNotes.value = anime.notes || '';
    editImage.value = anime.image_url || ''; // nueva
    editModal.style.display = 'flex';
}

// Guardar cambios
async function saveEdit() {
    const updatedTitle = editTitle.value.trim();
    const updatedStatus = editStatus.value;
    const updatedNotes = editNotes.value.trim();
    const updatedImage = editImage.value.trim(); // nueva
    if (!updatedTitle) {
        alert('El título no puede estar vacío.');
        return;
    }
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

// Inicializar
loadAnimes();