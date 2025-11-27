import { getPublicNovels } from './db-service.js';
import { renderNavbar } from './ui.js';

// --- BIẾN TOÀN CỤC (STATE) ---
let allNovels = [];
let featuredNovels = [];
let currentSlide = 0;
let slideInterval;

// --- 1. THUẬT TOÁN SHUFFLE (GIỮ NGUYÊN) ---
const shuffleWithSeed = (array, seed) => {
    const arr = [...array];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const seededRandom = () => {
        const x = Math.sin(hash++) * 10000;
        return x - Math.floor(x);
    };
    let m = arr.length, t, i;
    while (m) {
        i = Math.floor(seededRandom() * m--);
        t = arr[m];
        arr[m] = arr[i];
        arr[i] = t;
    }
    return arr;
};

// --- 2. HÀM TẠO CARD TRUYỆN (DÙNG CLASS CSS MỚI) ---
const createNovelCard = (novel) => {
    // Tạo HTML cho các tag thể loại
    const tagsHTML = novel.genres 
        ? novel.genres.slice(0, 2).map(g => `<span class="tag">${g}</span>`).join('') 
        : '';

    return `
    <a href="novel-detail.html?id=${novel.id}" class="novel-card">
        <div class="card-thumb">
            <img src="${novel.coverUrl || 'https://via.placeholder.com/200x300'}" alt="${novel.title}" loading="lazy">
            <div class="card-status">${novel.status || 'Đang ra'}</div>
        </div>
        <div class="card-body">
            <h3 class="card-title" title="${novel.title}">${novel.title}</h3>
            <div class="tags">
                ${tagsHTML}
            </div>
            <p class="card-author">✍️ ${novel.author}</p>
        </div>
    </a>`;
};

// --- 3. LOGIC CHÍNH KHI LOAD TRANG ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Vẽ Navbar
    renderNavbar();

    try {
        // 2. Lấy dữ liệu
        const data = await getPublicNovels();
        
        if (data.length === 0) {
            console.log("Database rỗng.");
            // Ẩn loading để hiện trang trắng (hoặc hiện thông báo rỗng nếu muốn)
            document.getElementById('loading-screen').classList.add('hidden');
            return;
        }

        allNovels = data;

        // --- XỬ LÝ DỮ LIỆU ---
        
        // A. Featured (Banner)
        const featured = data.filter(n => n.isFeatured);
        featuredNovels = featured.length > 0 ? featured : (
            data.find(n => n.status === 'Đã hoàn thành') ? [data.find(n => n.status === 'Đã hoàn thành')] : [data[0]]
        );

        // B. Daily Recommendations (Trộn theo ngày)
        const todaySeed = new Date().toDateString();
        
        const translated = data.filter(n => n.type === 'Truyện Dịch');
        const shuffledTranslated = shuffleWithSeed(translated, todaySeed).slice(0, 4);

        const original = data.filter(n => n.type === 'Truyện Sáng Tác');
        const shuffledOriginal = shuffleWithSeed(original, todaySeed).slice(0, 4);

        // --- RENDER RA MÀN HÌNH ---
        
        // 1. Render Banner
        renderBanner();

        // 2. Render 2 mục Đề cử
        document.getElementById('grid-translated').innerHTML = shuffledTranslated.map(createNovelCard).join('');
        document.getElementById('grid-original').innerHTML = shuffledOriginal.map(createNovelCard).join('');

        // 3. Render Mới cập nhật (Mặc định tab Truyện Dịch)
        renderLatestUpdates('Truyện Dịch');

        // 4. Hiển thị giao diện chính
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('banner-container').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');

    } catch (error) {
        console.error("Lỗi:", error);
        alert("Có lỗi tải trang. F5 lại thử xem sao!");
        document.getElementById('loading-screen').classList.add('hidden');
    }
});

// --- 4. LOGIC BANNER (SLIDER) ---
function renderBanner() {
    const container = document.getElementById('banner-slides');
    const dotsContainer = document.getElementById('banner-dots');
    
    // HTML cho từng Slide (Dùng class CSS .slide-item, .slide-bg...)
    container.innerHTML = featuredNovels.map((slide, index) => `
        <div class="slide-item ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${slide.coverUrl}" class="slide-bg">
            <div class="slide-content">
                <div class="slide-inner">
                     <img src="${slide.coverUrl}" class="slide-poster hidden-mobile">
                     
                     <div class="slide-info">
                        <div class="banner-tag">
                            <span style="margin-right:5px">★</span> Truyện Nổi Bật
                        </div>

                        <h1>${slide.title}</h1>
                        <p class="slide-desc">${slide.description || 'Chưa có mô tả...'}</p>
                        
                        <div style="display: flex; align-items: center; gap: 15px; margin-top: 20px;">
                            <a href="novel-detail.html?id=${slide.id}" class="btn-read">Đọc Ngay</a>
                            
                            <div class="banner-author">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                                <span>${slide.author}</span>
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    `).join('');

    // HTML cho Dots
    if (featuredNovels.length > 1) {
        dotsContainer.innerHTML = featuredNovels.map((_, idx) => `
            <button onclick="changeSlide(${idx})" class="dot-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}"></button>
        `).join('');
    }

    // Auto Slide Logic
    if (featuredNovels.length > 1) {
        slideInterval = setInterval(nextSlide, 4000);
        
        // Gắn sự kiện cho nút Next/Prev
        document.getElementById('btn-next').onclick = () => { resetTimer(); nextSlide(); };
        document.getElementById('btn-prev').onclick = () => { resetTimer(); prevSlide(); };
    }
}

// --- CÁC HÀM ĐIỀU KHIỂN (Gán vào Window để HTML gọi được) ---

window.changeSlide = (index) => {
    resetTimer();
    showSlide(index);
};

function showSlide(index) {
    currentSlide = index;
    
    // Update Slide
    document.querySelectorAll('.slide-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.index) === index);
    });
    
    // Update Dots (Chỉnh opacity thủ công vì mình chưa viết class dot active trong css)
    const dots = document.getElementById('banner-dots').children;
    for (let i = 0; i < dots.length; i++) {
        dots[i].style.opacity = i === index ? '1' : '0.5';
    }
}

function nextSlide() {
    let next = (currentSlide + 1) % featuredNovels.length;
    showSlide(next);
}

function prevSlide() {
    let prev = (currentSlide - 1 + featuredNovels.length) % featuredNovels.length;
    showSlide(prev);
}

function resetTimer() {
    clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide, 4000);
}

// --- 5. LOGIC SWITCH TAB (MỚI CẬP NHẬT) ---
window.switchTab = (type) => {
    renderLatestUpdates(type);
    
    // Update Style nút bấm (Thêm/Xóa class .active)
    const btnTrans = document.getElementById('tab-translated');
    const btnOrig = document.getElementById('tab-original');
    
    if (type === 'Truyện Dịch') {
        btnTrans.classList.add('active');
        btnOrig.classList.remove('active');
    } else {
        btnOrig.classList.add('active');
        btnTrans.classList.remove('active');
    }
};

function renderLatestUpdates(type) {
    const list = allNovels.filter(n => n.type === type);
    const container = document.getElementById('grid-latest');
    
    if (list.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 20px;">Chưa có truyện nào thuộc mục này.</div>`;
    } else {
        container.innerHTML = list.map(createNovelCard).join('');
    }
}

// Gắn sự kiện click cho Tab
document.getElementById('tab-translated').addEventListener('click', () => window.switchTab('Truyện Dịch'));
document.getElementById('tab-original').addEventListener('click', () => window.switchTab('Truyện Sáng Tác'));