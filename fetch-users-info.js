// 🔐 Firebase Admin script to fetch Auth users + Firestore user docs

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load service account key from local path
// Ensure you have serviceAccountKey.json in the root of your project
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function fetchUsersAndData() {
  const output = [];

  // 1. Fetch all Firebase Auth users
  const listUsersResult = await auth.listUsers();
  for (const userRecord of listUsersResult.users) {
    const uid = userRecord.uid;
    const email = userRecord.email;
    let firestoreData = {};

    // 2. Try to get Firestore user document
    try {
      const doc = await db.collection("users").doc(uid).get();
      if (doc.exists) {
        firestoreData = doc.data();
      }
    } catch (err) {
      console.error(`Error fetching Firestore doc for ${email}:`, err.message);
    }

    output.push({ uid, email, firestoreData });
  }

  // 3. Save result to local JSON file
  const savePath = path.join(__dirname, "user-details-export.json");
  fs.writeFileSync(savePath, JSON.stringify(output, null, 2));
  console.log("✅ User data saved to", savePath);
}

fetchUsersAndData().catch(err => {
  console.error("❌ Error running script:", err.message);
});