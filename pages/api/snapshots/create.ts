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


// src/pages/api/snapshots/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

if (serviceAccountKey && !getApps().length) {
    try {
        app = initializeApp({ credential: cert(serviceAccountKey as ServiceAccount) });
        db = getFirestore(app);
    } catch (e) {
        console.error('Firebase Admin Initialization Error', e);
    }
} else if (getApps().length > 0) {
    app = getApps()[0];
    db = getFirestore(app);
}

const COLLECTIONS_TO_BACKUP = [
    'schools',
    'staff',
    'users',
    'invites',
    'ohsRecords',
    'counselling',
    'disciplinary',
    'books',
    'libraryTransactions',
    'examResults',
    'lessonPlans',
    'workbookPlans',
    // Note: Classroom and Primary inventories are subcollections, would need different logic
];

async function fetchCollectionData(collectionName: string): Promise<any[]> {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!db) {
        return res.status(500).json({ error: 'Firebase Admin SDK not initialized.' });
    }

    const { description } = req.body;

    try {
        const snapshotData: { [key: string]: any[] } = {};
        for (const collectionName of COLLECTIONS_TO_BACKUP) {
            snapshotData[collectionName] = await fetchCollectionData(collectionName);
        }

        const snapshotRef = db.collection('snapshots').doc();
        await snapshotRef.set({
            createdAt: new Date(),
            description: description || 'Manual Snapshot',
            collections: snapshotData,
        });

        res.status(201).json({ success: true, snapshotId: snapshotRef.id });

    } catch (error) {
        console.error("Snapshot creation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        res.status(500).json({ error: `Snapshot creation failed: ${errorMessage}` });
    }
}
