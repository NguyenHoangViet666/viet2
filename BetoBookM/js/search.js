import { renderNavbar } from './ui.js';
import { getPublicNovels } from './db-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();

    // 1. Lấy từ khóa từ URL (ví dụ: search.html?q=tien+hiep)
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';

    // Hiển thị lại từ khóa lên màn hình
    document.getElementById('search-query-text').innerText = query;

    // Nếu không có từ khóa thì thôi
    if (!query.trim()) {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('no-results').classList.remove('hidden');
        return;
    }

    try {
        // 2. Tải tất cả truyện và lọc (Client-side search)
        // Vì Firestore tìm kiếm chuỗi (Full-text search) rất yếu, nên với web nhỏ ta tải hết về rồi lọc JS cho lẹ.
        const allNovels = await getPublicNovels();
        const lowerQuery = query.toLowerCase();
        
        const results = allNovels.filter(n => 
            n.title.toLowerCase().includes(lowerQuery) || 
            n.author.toLowerCase().includes(lowerQuery)
        );

        // 3. Render kết quả
        const container = document.getElementById('search-results');
        const noResults = document.getElementById('no-results');
        const countLabel = document.getElementById('result-count');

        countLabel.innerText = results.length;

        if (results.length > 0) {
            container.innerHTML = results.map(n => `
                <a href="novel-detail.html?id=${n.id}" class="novel-card">
                    <div class="card-thumb">
                        <img src="${n.coverUrl || 'https://via.placeholder.com/200x300'}" alt="${n.title}">
                        <div class="card-status">${n.status || 'Đang ra'}</div>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title" title="${n.title}">${n.title}</h3>
                        <p class="card-author">✍️ ${n.author}</p>
                    </div>
                </a>
            `).join('');
            noResults.classList.add('hidden');
        } else {
            container.innerHTML = '';
            noResults.classList.remove('hidden');
        }

    } catch (e) {
        console.error(e);
        alert("Có lỗi khi tìm kiếm.");
    } finally {
        document.getElementById('loading-screen').classList.add('hidden');
    }
});