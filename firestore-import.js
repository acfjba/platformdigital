const admin = require("firebase-admin");
const fs = require("fs");

// Load service account key
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const data = JSON.parse(fs.readFileSync("firestore-import.json", "utf8"));

async function importData() {
  for (const [collectionName, documents] of Object.entries(data)) {
    for (const doc of documents) {
      const docId = doc.id || undefined;
      const { id, ...fields } = doc;
      const ref = docId ? db.collection(collectionName).doc(docId) : db.collection(collectionName).doc();
      await ref.set(fields);
      console.log(`✅ Imported to ${collectionName}/${docId || ref.id}`);
    }
  }
  console.log("🔥 All data imported!");
}

importData().catch(console.error);
