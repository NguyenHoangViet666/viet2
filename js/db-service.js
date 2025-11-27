import { db } from './firebase-config.js'; // Chỉ import DB, không import Storage
import { 
    collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
    query, where, orderBy, limit, arrayUnion, arrayRemove, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = "dvyz1dlp9";
const UPLOAD_PRESET = "bbimage"; // Đã được xác nhận là preset Unsigned
// ----------------------------

// --- HELPER: Chuyển dữ liệu Firestore về Object ---
const docToData = (docSnap) => {
    return {
        id: docSnap.id,
        ...docSnap.data()
    };
};

// --- STORAGE SERVICES (Cloudinary) ---
export const uploadImage = async (file, folder = 'uploads') => {
  
  if (!CLOUD_NAME) {
      throw new Error("Vui lòng cấu hình Cloud Name Cloudinary!");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder); 

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Upload thất bại: ${errorData.error.message}`);
    }

    const data = await response.json();
    return data.secure_url; 

  } catch (e) {
    console.error("Lỗi upload ảnh:", e);
    alert("Lỗi upload ảnh lên Cloudinary. Kiểm tra cấu hình.");
    throw e;
  }
};

// --- USER SERVICES ---
export const getUserById = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, 'users', id));
        if (docSnap.exists()) {
            return docToData(docSnap);
        }
        return null;
    } catch (e) {
        console.error("Lỗi lấy user:", e);
        return null;
    }
};

export const createUserProfile = async (user) => {
    await setDoc(doc(db, 'users', user.id), user);
};

export const updateUserProfileData = async (userId, data) => {
    await updateDoc(doc(db, 'users', userId), data);
};

export const toggleNovelLike = async (userId, novelId) => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return null;
    
    const userData = userSnap.data();
    let likes = userData.likedNovelIds || [];
    
    if (likes.includes(novelId)) {
        likes = likes.filter(id => id !== novelId);
    } else {
        likes.push(novelId);
    }
    
    await updateDoc(userRef, { likedNovelIds: likes });
    return { ...userData, likedNovelIds: likes };
};

export const deleteUser = async (userId) => {
    try {
        await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
        console.error("Lỗi xóa user:", e);
        throw e;
    }
};

export const updateUserRole = async (userId, newRole) => {
    try {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (e) {
        console.error("Lỗi cập nhật quyền:", e);
        throw e;
    }
};

export const getUsers = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'users'));
        return snapshot.docs.map(docToData);
    } catch (e) {
        console.error("Lỗi lấy user:", e);
        return [];
    }
};


// --- NOTIFICATION SERVICES ---
const createNotification = async (notification) => {
    try {
        await addDoc(collection(db, 'notifications'), notification);
    } catch (e) {
        console.error("Failed to create notification", e);
    }
};

export const getUserNotifications = async (userId) => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToData);
    } catch (e) {
        console.error("Lỗi lấy thông báo (Cần tạo Index trong Firestore):", e);
        return [];
    }
};

export const markNotificationAsRead = async (notificationId) => {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
};

export const markAllNotificationsAsRead = async (userId) => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('isRead', '==', false)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });
        
        await batch.commit();
    } catch (e) {
        console.error("Lỗi đánh dấu đã đọc hết:", e);
    }
};

// --- NOVEL SERVICES ---
export const getNovels = async () => {
    try {
        const q = query(collection(db, 'novels'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToData);
    } catch (e) {
        console.warn("Chưa có Index, lấy không sắp xếp:", e);
        const snapshot = await getDocs(collection(db, 'novels'));
        return snapshot.docs.map(docToData);
    }
};

export const getPublicNovels = async () => {
    try {
        const q = query(
            collection(db, 'novels'),
            where('isPending', '==', false),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToData);
    } catch (e) {
        const all = await getNovels();
        return all.filter(n => n.isPending === false);
    }
};

export const getNovelById = async (id) => {
    const d = await getDoc(doc(db, 'novels', id));
    return d.exists() ? docToData(d) : null;
};

export const addNovel = async (novel, isPending = true) => {
    const newNovelData = {
        ...novel,
        isPending,
        isFeatured: false,
        createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, 'novels'), newNovelData);
};

export const updateNovel = async (id, data) => {
    await updateDoc(doc(db, 'novels', id), data);
};

export const deleteNovel = async (id) => {
    await deleteDoc(doc(db, 'novels', id));
};

export const approveNovel = async (id) => {
    try {
        await updateDoc(doc(db, 'novels', id), { isPending: false });
    } catch (e) {
        console.error("Lỗi duyệt truyện:", e);
        throw e;
    }
};

export const toggleNovelFeature = async (id) => {
    try {
        const novelRef = doc(db, 'novels', id);
        const novelSnap = await getDoc(novelRef);
        
        if (!novelSnap.exists()) return;
        
        const isFeatured = novelSnap.data().isFeatured;
        
        if (!isFeatured) {
            const q = query(collection(db, 'novels'), where('isFeatured', '==', true));
            const snapshot = await getDocs(q);
            if (snapshot.size >= 4) {
                throw new Error("Tối đa chỉ được 4 truyện nổi bật trên Banner thôi!");
            }
        }

        await updateDoc(novelRef, { isFeatured: !isFeatured });
    } catch (e) {
        console.error("Lỗi toggle feature:", e);
        throw e;
    }
};


// --- CHAPTER SERVICES ---
export const getChapters = async (novelId) => {
    const q = query(collection(db, 'chapters'), where('novelId', '==', novelId));
    const snapshot = await getDocs(q);
    const chapters = snapshot.docs.map(docToData);
    return chapters.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const getChapterDetail = async (chapterId) => {
    const d = await getDoc(doc(db, 'chapters', chapterId));
    return d.exists() ? docToData(d) : null;
};

export const addChapter = async (novelId, title, content) => {
    const newChapter = {
        novelId,
        title,
        content,
        createdAt: new Date().toISOString()
    };
    const chapterRef = await addDoc(collection(db, 'chapters'), newChapter);

    const novelSnap = await getDoc(doc(db, 'novels', novelId));
    const novelData = novelSnap.data();

    const qUsers = query(collection(db, 'users'), where('likedNovelIds', 'array-contains', novelId));
    const usersSnap = await getDocs(qUsers);

    if (!usersSnap.empty) {
        const batch = writeBatch(db);
        usersSnap.forEach(userDoc => {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
                userId: userDoc.id,
                type: 'NEW_CHAPTER',
                title: `Truyện "${novelData.title}" có chương mới!`,
                message: `Chương: ${title} vừa được đăng tải.`,
                link: `chapter.html?id=${chapterRef.id}`, // Đã sửa link cho Web Tĩnh
                isRead: false,
                createdAt: new Date().toISOString(),
                actorAvatar: novelData.coverUrl
            });
        });
        await batch.commit();
    }
};

export const updateChapter = async (chapterId, title, content) => {
    try {
        await updateDoc(doc(db, 'chapters', chapterId), {
            title: title,
            content: content
        });
    } catch (e) {
        console.error("Lỗi cập nhật chương:", e);
        throw e;
    }
};

export const deleteChapter = async (chapterId) => {
    try {
        await deleteDoc(doc(db, 'chapters', chapterId));
    } catch (e) {
        console.error("Lỗi xóa chương:", e);
        throw e;
    }
};

// --- COMMENT SERVICES ---
export const getCommentsByNovel = async (novelId) => {
    const q = query(collection(db, 'comments'), where('novelId', '==', novelId));
    const snapshot = await getDocs(q);
    const comments = snapshot.docs.map(docToData);
    return comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const addComment = async (novelId, user, content) => {
    const newComment = {
        novelId,
        userId: user.id,
        username: user.username,
        role: user.role,
        userAvatar: user.avatar || 'https://via.placeholder.com/150',
        content,
        createdAt: new Date().toISOString(),
        likedBy: [],
        replies: []
    };
    await addDoc(collection(db, 'comments'), newComment);
};

export const toggleCommentLike = async (commentId, userId) => {
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) return;

    const data = commentSnap.data();
    const likedBy = data.likedBy || [];
    const isLiking = !likedBy.includes(userId);

    if (!isLiking) {
        await updateDoc(commentRef, {
            likedBy: arrayRemove(userId)
        });
    } else {
        await updateDoc(commentRef, {
            likedBy: arrayUnion(userId)
        });

        if (data.userId !== userId) {
            const actor = await getUserById(userId);
            await createNotification({
                userId: data.userId,
                type: 'LIKE_COMMENT',
                title: `${actor?.username || 'Ai đó'} thích bình luận của bạn`,
                message: `"${data.content.substring(0, 30)}..."`,
                link: `novel-detail.html?id=${data.novelId}`,
                isRead: false,
                createdAt: new Date().toISOString(),
                actorAvatar: actor?.avatar
            });
        }
    }
};

export const replyToComment = async (commentId, user, content) => {
    const reply = {
        id: Date.now().toString(),
        userId: user.id,
        username: user.username,
        role: user.role,
        userAvatar: user.avatar || 'https://via.placeholder.com/150',
        content,
        createdAt: new Date().toISOString()
    };

    const commentRef = doc(db, 'comments', commentId);
    
    await updateDoc(commentRef, {
        replies: arrayUnion(reply)
    });

    const commentSnap = await getDoc(commentRef);
    const commentData = commentSnap.data();
    
    if (commentData.userId !== user.id) {
        await createNotification({
            userId: commentData.userId,
            type: 'REPLY_COMMENT',
            title: `${user.username} đã trả lời bạn`,
            message: content,
            link: `novel-detail.html?id=${commentData.novelId}`,
            isRead: false,
            createdAt: new Date().toISOString(),
            actorAvatar: user.avatar
        });
    }
};