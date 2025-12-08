// Firebase Compat Version (for file:// usage)
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

// Initialize Firebase
let app, auth, db;

try {
    if (typeof firebase !== 'undefined') {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase Initialized Successfully");
    } else {
        console.error("Firebase SDK not loaded!");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
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
        // Clear local bookmarks
        localStorage.removeItem('hai_labs_bookmarks');
        location.reload();
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

// Sync Logic
async function syncBookmarks(user) {
    if (!db) return;

    const localBookmarks = JSON.parse(localStorage.getItem('hai_labs_bookmarks') || '{}');
    const userRef = db.collection("users").doc(user.uid);

    try {
        const docSnap = await userRef.get();
        let cloudBookmarks = {};

        if (docSnap.exists) {
            cloudBookmarks = docSnap.data().bookmarks || {};
        }

        const mergedBookmarks = { ...cloudBookmarks, ...localBookmarks };

        // Sanitize: Remove bookmarks with missing titles (legacy data)
        Object.keys(mergedBookmarks).forEach(key => {
            const item = mergedBookmarks[key];
            if (!item || !item.title) {
                delete mergedBookmarks[key];
            }
        });

        await userRef.set({ bookmarks: mergedBookmarks }, { merge: true });

        localStorage.setItem('hai_labs_bookmarks', JSON.stringify(mergedBookmarks));

        if (window.renderPapers && window.currentTab === 'bookmarks') {
            window.renderPapers();
        }

    } catch (e) {
        console.error("Error syncing bookmarks:", e);
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

        // Re-render UI to reflect bookmark privacy
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
            // Use FieldPath to handle IDs with dots (e.g. 2412.1234)
            await userRef.update(
                new firebase.firestore.FieldPath('bookmarks', paperId),
                paperData
            );
        } else {
            await userRef.update(
                new firebase.firestore.FieldPath('bookmarks', paperId),
                firebase.firestore.FieldValue.delete()
            );
        }
    } catch (e) {
        // If the document doesn't exist, update() fails. Set it first.
        if (isAdding && e.code === 'not-found') {
            await userRef.set({
                bookmarks: {
                    [paperId]: paperData
                }
            }, { merge: true });
        } else {
            console.error("Cloud save error:", e);
        }
    }
};
