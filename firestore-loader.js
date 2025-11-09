// firestore-loader.js
const admin = require("firebase-admin");
const fs = require("fs");

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function loadData() {
  console.log("🔄 Loading Firestore data...");

  const collections = ["users", "tasks", "summaries", "kpi"];
  const data = {};

  for (const col of collections) {
    const snapshot = await db.collection(col).get();
    data[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Save to local JSON file
  fs.writeFileSync("firestore-export.json", JSON.stringify(data, null, 2));
  console.log("✅ Data exported to firestore-export.json");
}

loadData().catch((err) => {
  console.error("❌ Error loading data:", err);
});
