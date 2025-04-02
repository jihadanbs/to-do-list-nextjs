const fs = require('fs');
const path = require('path');

// Fungsi untuk mendekode Base64 dan menyimpan kredensial
export const decodeBase64ToJSON = (base64String) => {
  const jsonString = Buffer.from(base64String, 'base64').toString('utf-8');
  const credentialsPath = path.join(process.cwd(), 'google-credentials.json');

  fs.writeFileSync(credentialsPath, jsonString);

  return credentialsPath;
};
