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


import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// --- Direct Import of Data ---
import usersData from '@/data/users.json';
import schoolsData from '@/data/schools.json';
import staffData from '@/data/staff.json';
import inventoryData from '@/data/inventory.json';
import examResultsData from '@/data/exam-results.json';
import libraryBooksData from '@/data/library-books.json';
import disciplinaryRecordsData from '@/data/disciplinary-records.json';
import counsellingRecordsData from '@/data/counselling-records.json';
import ohsRecordsData from '@/data/ohs-records.json';
import attendanceData from '@/data/attendance.json';
import permissionsData from '@/data/permissions.json';


interface SeedReport {
    users: string[];
    schools: string[];
    staff: string[];
    inventory: string[];
    examResults: string[];
    libraryBooks: string[];
    disciplinaryRecords: string[];
    counsellingRecords: string[];
    ohsRecords: string[];
    staffAttendance: string[];
    permissionGroups: string[];
    errors: string[];
}

let app: App;
let db: Firestore;
let auth: Auth;

if (serviceAccountKey && !getApps().length) {
    try {
        app = initializeApp({
            credential: cert(serviceAccountKey as ServiceAccount),
        });
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (e) {
        console.error('Firebase Admin Initialization Error', e);
    }
} else if (getApps().length > 0) {
    app = getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
}

// Helper to seed a simple collection
async function seedCollection(
    collectionName: string,
    data: any[],
    report: string[],
    errorLog: string[]
) {
    for (const item of data) {
        try {
            const { id, ...rest } = item;
            if (!id) {
                throw new Error(`Item in ${collectionName} is missing an 'id' field.`);
            }
            await db.collection(collectionName).doc(id).set(rest);
            report.push(`Seeded ${collectionName}: ${id}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Error seeding ${collectionName} with id ${item.id}:`, message);
            errorLog.push(`Failed ${collectionName} - ${item.id}: ${message}`);
        }
    }
}

// Helper to seed Firebase Auth users idempotently
async function seedAuthUsers(data: any[], report: string[], errorLog: string[]) {
    for (const user of data) {
        try {
            const { id, email, password, displayName, role, schoolId } = user;
            
            let userRecord;
            let userExists = false;

            // 1. Check if user exists by UID
            try {
                userRecord = await auth.getUser(id);
                userExists = true;
                report.push(`Auth user already exists (UID): ${email}`);
            } catch (error: any) {
                // 2. If not found by UID, check by email
                if (error.code === 'auth/user-not-found') {
                    try {
                        userRecord = await auth.getUserByEmail(email);
                        userExists = true;
                        report.push(`Auth user already exists (Email): ${email}`);
                    } catch (emailError: any) {
                        if (emailError.code !== 'auth/user-not-found') {
                            throw emailError; // Re-throw unexpected errors
                        }
                        // User does not exist by email either, safe to create.
                    }
                } else {
                    throw error; // Re-throw other unexpected errors from getUser
                }
            }

            // 3. Create user if they don't exist
            if (!userExists) {
                userRecord = await auth.createUser({
                    uid: id,
                    email,
                    password,
                    displayName,
                });
                report.push(`Created Auth user: ${email}`);
            }
            
            // 4. Set custom claims and update Firestore user document regardless
            if (userRecord) {
                await auth.setCustomUserClaims(userRecord.uid, { role, schoolId });
                await db.collection('users').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    email,
                    role,
                    schoolId,
                    displayName
                });
                report.push(`Set claims and updated Firestore for: ${email}`);
            } else {
                 throw new Error(`User record for ${email} was not found or created.`);
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Error seeding Auth user ${user.email}:`, message);
            errorLog.push(`Failed Auth user - ${user.email}: ${message}`);
        }
    }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!db || !auth) {
         return res.status(500).json({ 
            success: false, 
            details: 'Firebase Admin SDK not initialized. Check server logs.' 
        });
    }

    const report: SeedReport = {
        users: [],
        schools: [],
        staff: [],
        inventory: [],
        examResults: [],
        libraryBooks: [],
        disciplinaryRecords: [],
        counsellingRecords: [],
        ohsRecords: [],
        staffAttendance: [],
        permissionGroups: [],
        errors: []
    };

    try {
        await seedAuthUsers(usersData, report.users, report.errors);
        await seedCollection('schools', schoolsData, report.schools, report.errors);
        await seedCollection('staff', staffData, report.staff, report.errors);
        await seedCollection('inventory', inventoryData, report.inventory, report.errors);
        await seedCollection('examResults', examResultsData, report.examResults, report.errors);
        await seedCollection('books', libraryBooksData, report.libraryBooks, report.errors);
        await seedCollection('disciplinary', disciplinaryRecordsData, report.disciplinaryRecords, report.errors);
        await seedCollection('counselling', counsellingRecordsData, report.counsellingRecords, report.errors);
        await seedCollection('ohsRecords', ohsRecordsData, report.ohsRecords, report.errors);
        await seedCollection('staffAttendance', attendanceData, report.staffAttendance, report.errors);
        await seedCollection('permissionGroups', permissionsData, report.permissionGroups, report.errors);

        if (report.errors.length > 0) {
            return res.status(207).json({ 
                success: false, 
                details: 'Completed with some errors.', 
                report 
            });
        }

        res.status(200).json({ success: true, report });

    } catch (error) {
        console.error('An unexpected error occurred during seeding:', error);
        res.status(500).json({ 
            success: false, 
            details: error instanceof Error ? error.message : 'An unknown server error occurred.',
            report
        });
    }
}
