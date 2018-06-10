const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

var serviceAccount = require('./udemy-pwagram-29b2e-firebase-adminsdk-y3c51-94f28f7cb8.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://udemy-pwagram-29b2e.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        admin.database().ref('posts').push({
            id: request.body.id,
            title: request.body.title,
            location: request.body.location,
            image: request.body.image
        }).then(() => {
            return response.status(201).json({ message: 'Data stored', id: request.body.id });
        }).catch((error) => {
            response.status(500).json({ error: error });
        })
    })
});
