// 🔧 Script to create missing Firestore user documents

const admin = require("firebase-admin");
const fs = require("fs");

// Load service account key
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Manually specified user roles
const roleMap = {
  "acjfk@hotmail.com": "admin",
  "projectsbafiji@gmail.com": "admin",
  "aviashfj@gmail.com": "teacher"
};

async function fixUsers() {
  const usersToFix = Object.entries(roleMap);

  for (const [email, role] of usersToFix) {
    try {
      const list = await admin.auth().getUserByEmail(email);
      const uid = list.uid;

      const docRef = db.collection("users").doc(uid);
      const doc = await docRef.get();

      if (doc.exists) {
        console.log(`✅ ${email} already exists in Firestore`);
        continue;
      }

      const data = {
        email: email,
        role: role,
        schoolID: "school1",
        status: "true",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.set(data);
      console.log(`✅ Created Firestore user doc for ${email} (${role})`);
    } catch (err) {
      console.error(`❌ Failed for ${email}:`, err.message);
    }
  }
}

fixUsers().then(() => {
  console.log("🎉 All missing users processed.");
});
