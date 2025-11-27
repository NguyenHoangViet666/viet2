import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getUserById, createUserProfile, updateUserProfileData } from './db-service.js';

// Biến toàn cục lưu user hiện tại
let currentUser = null;

// --- 1. HÀM THEO DÕI TRẠNG THÁI ---
export const monitorAuthState = (callback) => {
    onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userProfile = await getUserById(firebaseUser.uid);
            currentUser = userProfile || null;
        } else {
            currentUser = null;
        }
        if (callback) callback(currentUser);
    });
};

// --- 2. CÁC HÀM HÀNH ĐỘNG ---

export const loginUser = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: error.message };
    }
};

export const registerUser = async (username, email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // FIX: Role mặc định là 'User' (Viết hoa)
        const newUser = {
            id: firebaseUser.uid,
            username,
            email,
            role: 'User', 
            avatar: `https://picsum.photos/seed/${Date.now()}/200/200`,
            likedNovelIds: []
        };

        await createUserProfile(newUser);
        return { success: true };
    } catch (error) {
        console.error("Register Error:", error);
        return { success: false, message: error.message };
    }
};

export const logoutUser = async () => {
    await signOut(auth);
    window.location.href = 'login.html';
};

export const updateCurrentUser = async (data) => {
    if (!currentUser) return false;
    try {
        await updateUserProfileData(currentUser.id, data);
        return true;
    } catch (e) {
        return false;
    }
};

// Helper check quyền (Sửa so sánh Viết Hoa)
export const isAdmin = () => currentUser?.role === 'Admin';
export const isMod = () => currentUser?.role === 'Mod';
export const getCurrentUser = () => currentUser;