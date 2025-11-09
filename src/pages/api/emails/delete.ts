
// src/pages/api/emails/delete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccountKey from '@root/serviceAccountKey.json';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccountKey as ServiceAccount)
    });
  } catch (e) {
    console.error('Firebase Admin Initialization Error', e);
  }
}

const db = getApps().length > 0 ? getFirestore() : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Firebase Admin SDK not initialized. Check server logs.' });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Email log ID is required.' });
  }

  try {
    const docRef = db.collection('emailHistory').doc(id);
    await docRef.delete();
    res.status(200).json({ success: true, message: 'Email log deleted successfully.' });
  } catch (error) {
    console.error('Error deleting email log:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: `Failed to delete email log: ${errorMessage}` });
  }
}
