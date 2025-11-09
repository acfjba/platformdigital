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


// src/pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

interface EmailSettings {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
}

async function getEmailSettings(schoolId: string): Promise<EmailSettings | null> {
    if (!db) return null;
    const docRef = db.collection('schoolSettings').doc(schoolId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        return docSnap.data() as EmailSettings;
    }
    return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    const { to, subject, body, schoolId } = req.body;

    if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    let smtpConfig: any;
    let fromEmail: string;

    if (schoolId && db) {
        const schoolSettings = await getEmailSettings(schoolId);
        if (schoolSettings) {
            smtpConfig = {
                host: schoolSettings.host,
                port: schoolSettings.port,
                secure: schoolSettings.secure, // Use the secure flag from settings
                auth: {
                    user: schoolSettings.user,
                    pass: schoolSettings.pass,
                },
            };
            fromEmail = `"${schoolId}" <${schoolSettings.user}>`;
        } else {
            // Fallback to default if no specific settings found
            smtpConfig = {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: { user: 'cloudharekrishna@gmail.com', pass: 'pwkedgvrqiztvwfc' },
            };
            fromEmail = `"School Platform" <${smtpConfig.auth.user}>`;
        }
    } else {
        // Default hardcoded credentials if no schoolId or DB
        smtpConfig = {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: 'cloudharekrishna@gmail.com', pass: 'pwkedgvrqiztvwfc' },
        };
        fromEmail = `"School Platform" <${smtpConfig.auth.user}>`;
    }

    const logEmail = async (status: 'Success' | 'Failed', error?: string, messageId?: string) => {
        if (db) {
            await db.collection('emailHistory').add({
                recipient: to,
                subject: subject,
                status,
                error: error || null,
                messageId: messageId || null,
                sentAt: FieldValue.serverTimestamp(),
            });
        }
    };
    
    if (!smtpConfig?.auth?.user || !smtpConfig?.auth?.pass) {
         const errorMessage = "SMTP configuration is incomplete.";
         console.error(errorMessage);
         await logEmail('Failed', 'Configuration Error');
        return res.status(500).json({ error: errorMessage });
    }

    const transporter = nodemailer.createTransport(smtpConfig);

    try {
        await transporter.verify();
        const info = await transporter.sendMail({
            from: fromEmail,
            to: to,
            subject: subject,
            text: body,
            html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        });

        console.log("Message sent: %s", info.messageId);
        await logEmail('Success', undefined, info.messageId);
        res.status(200).json({ success: true, message: `Email successfully sent to ${to}.` });

    } catch (error) {
        console.error("Error sending email:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        await logEmail('Failed', errorMessage);
        res.status(500).json({ error: `Failed to send email: ${errorMessage}` });
    }
}
