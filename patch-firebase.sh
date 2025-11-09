#!/bin/bash

# Define the list of target files
FILES=(
  "pages/api/emails/delete.ts"
  "pages/api/fetch-user-info.ts"
  "pages/api/seed.ts"
  "pages/api/send-email.ts"
  "pages/api/snapshots/create.ts"
)

# Define the secure Firebase Admin initialization block
FIREBASE_INIT='const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT!, "base64").toString("utf8")
);

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
'

# Loop through each file and apply the patch
for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    # Remove any line importing serviceAccountKey.json
    sed -i '/serviceAccountKey\.json/d' "$FILE"

    # Insert the secure Firebase Admin block at the top
    echo "$FIREBASE_INIT" | cat - "$FILE" > temp && mv temp "$FILE"

    echo "✅ Patched $FILE"
  else
    echo "⚠️ File not found: $FILE"
  fi
done