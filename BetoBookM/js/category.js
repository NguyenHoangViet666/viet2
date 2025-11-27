import { renderNavbar } from './ui.js';
import { getPublicNovels } from './db-service.js';

let allNovels = [];
let targetType = ''; // 'Truyện Dịch' hoặc 'Truyện Sáng Tác'

document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();

    // 1. Lấy loại truyện từ URL (?type=Translated hoặc ?type=Original)
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');

    if (typeParam === 'Translated' || typeParam === 'translated') {
        targetType = 'Truyện Dịch';
    } else if (typeParam === 'Original' || typeParam === 'original') {
        targetType = 'Truyện Sáng Tác';
    } else {
        targetType = 'Truyện Dịch'; // Mặc định
    }

    document.getElementById('category-title').innerText = targetType;
    document.title = `${targetType} - BetoBook`;

    try {
        // 2. Tải dữ liệu
        const data = await getPublicNovels();
        allNovels = data;
        
        // 3. Lọc lần đầu
        applyFilter();

        document.getElementById('loading-screen').classList.add('hidden');

    } catch (e) {
        console.error("Lỗi:", e);
        alert("Lỗi tải danh sách truyện.");
    }

    // 4. Gắn sự kiện cho bộ lọc
    document.getElementById('filter-genre').addEventListener('change', applyFilter);
    document.getElementById('filter-length').addEventListener('change', applyFilter);
    document.getElementById('filter-status').addEventListener('change', applyFilter);
});

function applyFilter() {
    const selectedGenre = document.getElementById('filter-genre').value;
    const selectedLength = document.getElementById('filter-length').value;
    const selectedStatus = document.getElementById('filter-status').value;

    const filtered = allNovels.filter(n => {
        // Lọc theo Loại truyện chính (Dịch/Sáng tác)
        if (n.type !== targetType) return false;

        // Lọc theo các tiêu chí con
        const matchGenre = selectedGenre === 'All' || (n.genres && n.genres.includes(selectedGenre));
        const matchLength = selectedLength === 'All' || n.length === selectedLength;
        const matchStatus = selectedStatus === 'All' || n.status === selectedStatus;

        return matchGenre && matchLength && matchStatus;
    });

    renderList(filtered);
}

function renderList(list) {
    const container = document.getElementById('novel-grid');
    const emptyState = document.getElementById('empty-state');

    if (list.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = list.map(n => `
        <a href="novel-detail.html?id=${n.id}" class="novel-card">
            <div class="card-thumb">
                <img src="${n.coverUrl || 'https://via.placeholder.com/200x300'}" alt="${n.title}">
                <div class="card-status">${n.status}</div>
            </div>
            <div class="card-body">
                <h3 class="card-title" title="${n.title}">${n.title}</h3>
                <p class="card-author">✍️ ${n.author}</p>
                <div class="tags">
                    ${n.genres ? n.genres.slice(0, 2).map(g => `<span class="tag">${g}</span>`).join('') : ''}
                </div>
            </div>
        </a>
    `).join('');
}