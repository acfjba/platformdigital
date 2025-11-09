
// set-claims.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function grantAdmin() {
  const uid = "systemadmin"; // replace with your admin UID
  await admin.auth().setCustomUserClaims(uid, { systemAdmin: true });
  console.log(`✅ Granted systemAdmin to UID: ${uid}`);
}

grantAdmin().catch(console.error);
