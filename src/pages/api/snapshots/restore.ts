
// src/pages/api/snapshots/restore.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!db) {
        return res.status(500).json({ error: 'Firebase Admin SDK not initialized.' });
    }

    const { snapshotId } = req.body;
    if (!snapshotId) {
        return res.status(400).json({ error: 'Snapshot ID is required.' });
    }

    try {
        const snapshotDocRef = db.collection('snapshots').doc(snapshotId);
        const snapshotDoc = await snapshotDocRef.get();

        if (!snapshotDoc.exists) {
            return res.status(404).json({ error: 'Snapshot not found.' });
        }
        
        const snapshotData = snapshotDoc.data();
        if (!snapshotData || !snapshotData.collections) {
             return res.status(500).json({ error: 'Snapshot data is invalid or empty.' });
        }
        
        const collectionsToRestore = snapshotData.collections;

        // Start a batch write
        let batch = db.batch();
        let operationCount = 0;
        const commitBatch = async () => {
            if (operationCount > 0) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        };

        // Process each collection from the snapshot
        for (const collectionName in collectionsToRestore) {
            // First, clear the existing collection
            const collectionRef = db.collection(collectionName);
            const existingDocs = await collectionRef.get();
            for (const doc of existingDocs.docs) {
                batch.delete(doc.ref);
                operationCount++;
                if (operationCount >= 499) {
                    await commitBatch();
                }
            }
            // Commit deletions before starting writes
            await commitBatch();

            // Then, write the documents from the snapshot
            const documents = collectionsToRestore[collectionName];
            if (Array.isArray(documents)) {
                for (const docData of documents) {
                    const { id, ...data } = docData;
                    if (id) {
                        batch.set(collectionRef.doc(id), data);
                        operationCount++;
                        if (operationCount >= 499) {
                           await commitBatch();
                        }
                    }
                }
            }
        }
        
        // Commit any remaining operations in the batch
        await commitBatch();

        res.status(200).json({ success: true, message: 'Data restored successfully.' });

    } catch (error) {
        console.error("Restore failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        res.status(500).json({ error: `Restore failed: ${errorMessage}` });
    }
}
