const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
db.collection('assignments').get().then(snapshot => {
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Title: ${data.title}`);
    console.log(`Kelas: ${data.kelas}`);
    console.log(`TargetClasses:`, data.targetClasses);
    console.log(`Targets:`, data.targets);
    console.log('---');
  });
}).catch(console.error);
