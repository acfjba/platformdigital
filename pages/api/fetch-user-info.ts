const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT!, "base64").toString("utf8")
);

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT!, "base64").toString("utf8")
);

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}


// src/pages/api/fetch-user-info.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let app: App;
let db: Firestore;
let auth: Auth;

if (!getApps().length) {
    try {
        app = initializeApp({
            credential: cert(serviceAccount as ServiceAccount),
        });
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (e) {
        console.error('Firebase Admin Initialization Error', e);
    }
} else {
    app = getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!db || !auth) {
    return res.status(500).json({ 
        error: 'Firebase Admin SDK not initialized. Check server logs.' 
    });
  }

  try {
    const output = [];
    const listUsersResult = await auth.listUsers();

    for (const userRecord of listUsersResult.users) {
        const uid = userRecord.uid;
        const email = userRecord.email;
        let firestoreData = {};

        try {
            const doc = await db.collection("users").doc(uid).get();
            if (doc.exists) {
                firestoreData = doc.data() ?? {};
            }
        } catch (err) {
            console.error(`Error fetching Firestore doc for ${email}:`, err instanceof Error ? err.message : err);
            // Continue even if one doc fails
        }

        output.push({ uid, email, firestoreData });
    }

    res.status(200).json({ users: output });

  } catch (error) {
    console.error('An unexpected error occurred while fetching user data:', error);
    res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An unknown server error occurred.'
    });
  }
}
