// ✅ Recreate test users in Firebase Auth + Firestore
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const users = [
  { email: "admin@example.com", password: "password123", role: "admin" },
  { email: "head@example.com", password: "password123", role: "headteacher" },
  { email: "teacher@example.com", password: "password123", role: "teacher" }
];

async function recreateUsers() {
  for (const u of users) {
    try {
      let userRecord;
      try {
        await auth.deleteUser((await auth.getUserByEmail(u.email)).uid);
        console.log(`♻️ Deleted existing user: ${u.email}`);
      } catch {}

      userRecord = await auth.createUser({
        email: u.email,
        password: u.password
      });

      await db.collection("users").doc(userRecord.uid).set({
        email: u.email,
        role: u.role,
        schoolID: "school1",
        status: "true",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Created ${u.role}: ${u.email}`);
    } catch (err) {
      console.error(`❌ Failed for ${u.email}:`, err.message);
    }
  }
}

recreateUsers().then(() => console.log("🎉 Test users ready."));
