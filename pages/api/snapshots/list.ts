
// src/pages/api/snapshots/list.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import serviceAccountKey from '@root/serviceAccountKey.json';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!db) {
        return res.status(500).json({ error: 'Firebase Admin SDK not initialized.' });
    }

    try {
        const snapshotsRef = db.collection('snapshots').orderBy('createdAt', 'desc');
        const snapshot = await snapshotsRef.get();

        const snapshots = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                description: data.description,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                // We don't send the full collections data in the list view
            };
        });

        res.status(200).json({ success: true, snapshots });

    } catch (error) {
        console.error("Fetching snapshots failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        res.status(500).json({ error: `Fetching snapshots failed: ${errorMessage}` });
    }
}
