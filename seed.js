
// seed.js - simplified
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };
import authUsers from "./auth_users.json" assert { type: "json" };
import firestoreSeed from "./firestore_seed.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const auth = admin.auth();

async function seedAuth() {
  console.log("Seeding Authentication and Firestore...");
  for (const user of authUsers) {
    try {
      const firestoreDocData = firestoreSeed.find(doc => doc.data.email === user.email)?.data;
      if (!firestoreDocData) {
        console.warn(`! No Firestore seed data found for auth user ${user.email}. Skipping.`);
        continue;
      }
      
      const { role, schoolId } = firestoreDocData;
      let userRecord;
      
      try {
        userRecord = await auth.getUser(user.uid);
        console.log(`✔ Auth user already exists: ${user.email} with UID ${user.uid}`);
      } catch (e) {
        const anyError = e as any;
        if (anyError.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            uid: user.uid,
            email: user.email,
            password: user.password,
            displayName: user.displayName,
            disabled: user.disabled,
          });
          console.log(`✔ Auth user created: ${user.email} with UID ${userRecord.uid}`);
        } else {
          throw e; // Re-throw other errors
        }
      }

      // **CRITICAL FIX**: Set custom claims for role-based access
      const claims = { role, schoolId: schoolId || null };
      await auth.setCustomUserClaims(userRecord.uid, claims);
      console.log(`✔ Set custom claims for ${user.email}:`, claims);

      // **CRITICAL FIX**: Use the correct UID for the Firestore doc path and ensure data matches
      const docRef = db.collection('users').doc(userRecord.uid);
      // The UID from the user record is the source of truth.
      const dataWithUid = { ...firestoreDocData, uid: userRecord.uid, displayName: user.displayName };
      delete (dataWithUid as any).collection;
      delete (dataWithUid as any).doc;
      await docRef.set(dataWithUid);
      console.log(`✔ Firestore 'users' doc created/updated for ${user.email} with UID ${userRecord.uid}`);

    } catch (error) {
        const err = error as any;
        console.error(`✘ Failed to process auth user ${user.email}:`, err.message, err.stack);
    }
  }
}

async function main() {
  await seedAuth();
  console.log("📦 Seeding complete.");
}

main().catch(console.error);
