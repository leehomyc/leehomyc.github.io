// Firebase Compat Version
console.log("Loading Firebase Auth (Compat Mode)...");

const firebaseConfig = {
    apiKey: "AIzaSyClOzy8OE5byDb-JRHg3WRBexpll6A_4Ow",
    authDomain: "papers-afc96.firebaseapp.com",
    projectId: "papers-afc96",
    storageBucket: "papers-afc96.firebasestorage.app",
    messagingSenderId: "96532598264",
    appId: "1:96532598264:web:2bfc852509f4d5373d1a0d",
    measurementId: "G-FRS2BE2FHL"
};

// Initialize
let app, auth, db;

// --- TOAST UI HELPER ---
function showToast(message, duration = 3000) {
    let toast = document.getElementById('firebase-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'firebase-toast';
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '24px',
            zIndex: '10000',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none'
        });
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, duration);
}

try {
    if (typeof firebase !== 'undefined') {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase Initialized Successfully");
    } else {
        console.error("Firebase SDK not loaded!");
        showToast("Error: Firebase SDK not loaded");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
    showToast("Firebase init failed: " + e.message);
}

const provider = new firebase.auth.GoogleAuthProvider();

// Global Auth Functions
window.handleGoogleLogin = async () => {
    if (!auth) {
        alert("Firebase not configured properly! Check console.");
        return;
    }
    try {
        console.log("Attempting sign in...");
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        console.log("Logged in as:", user.displayName);
        showToast(`Welcome, ${user.displayName}!`);
        await syncBookmarks(user);
    } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed: " + error.message);
    }
};

window.handleLogout = async () => {
    if (!auth) return;
    try {
        await auth.signOut();
        console.log("Logged out");
        localStorage.removeItem('hai_labs_bookmarks');
        location.reload();
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

// Sync Logic
async function syncBookmarks(user) {
    if (!db) return;

    showToast("Syncing bookmarks from cloud...");

    const localBookmarks = JSON.parse(localStorage.getItem('hai_labs_bookmarks') || '{}');
    const userRef = db.collection("users").doc(user.uid);

    try {
        const docSnap = await userRef.get();
        let cloudBookmarks = {};

        if (docSnap.exists) {
            cloudBookmarks = docSnap.data().bookmarks || {};
        }

        const mergedBookmarks = { ...cloudBookmarks, ...localBookmarks };

        // Sanitize
        let hasChanges = false;
        Object.keys(mergedBookmarks).forEach(key => {
            const item = mergedBookmarks[key];
            if (!item || !item.title) {
                delete mergedBookmarks[key];
                hasChanges = true;
            }
        });

        // Save merge back to cloud
        await userRef.set({ bookmarks: mergedBookmarks }, { merge: true });

        // Save to local
        localStorage.setItem('hai_labs_bookmarks', JSON.stringify(mergedBookmarks));

        showToast("Bookmarks synced successfully!");

        if (window.renderPapers && window.currentTab === 'bookmarks') {
            window.renderPapers();
        }

    } catch (e) {
        console.error("Error syncing bookmarks:", e);
        showToast("Sync failed: " + e.code);
    }
}

// Watch Auth State
if (auth) {
    auth.onAuthStateChanged(async (user) => {
        const loginBtn = document.getElementById('google-login-btn');
        const logoutBtn = document.getElementById('google-logout-btn');
        const userInfo = document.getElementById('user-info');

        window.isUserLoggedIn = !!user;

        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (userInfo) {
                userInfo.style.display = 'flex';
                userInfo.innerHTML = `
                    <img src="${user.photoURL}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px;">
                    <span>${user.displayName}</span>
                `;
            }
            await syncBookmarks(user);
        } else {
            if (loginBtn) loginBtn.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
        }

        // Re-render UI
        if (window.renderPapers) {
            window.renderPapers();
        }
    });
}

window.saveBookmarkToCloud = async (paperId, paperData, isAdding) => {
    if (!auth || !auth.currentUser || !db) return;

    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);

    try {
        if (isAdding) {
            // Use FieldPath to handle IDs with dots
            await userRef.update(
                new firebase.firestore.FieldPath('bookmarks', paperId),
                paperData
            );
            showToast("Saved to cloud");
        } else {
            await userRef.update(
                new firebase.firestore.FieldPath('bookmarks', paperId),
                firebase.firestore.FieldValue.delete()
            );
            showToast("Removed from cloud");
        }
    } catch (e) {
        // If doc doesn't exist, Create it
        if (isAdding && e.code === 'not-found') {
            await userRef.set({
                bookmarks: {
                    [paperId]: paperData
                }
            }, { merge: true });
            showToast("Saved to cloud (New Profile)");
        } else {
            console.error("Cloud save error:", e);
            showToast("Cloud save error: " + e.code);
        }
    }
};
