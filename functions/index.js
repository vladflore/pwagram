const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const corsHandler = cors({ origin: true });
const webpush = require('web-push');

var serviceAccount = require('./udemy-pwagram-29b2e-firebase-adminsdk-y3c51-94f28f7cb8.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://udemy-pwagram-29b2e.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest((request, response) => {
    corsHandler(request, response, () => {
        console.log(request.body.id + ' ' + request.body.title + ' ' + request.body.location + ' ' + request.body.image);
        admin.database().ref('posts').push({
            id: request.body.id,
            title: request.body.title,
            location: request.body.location,
            image: request.body.image
        }).then(() => {
            webpush.setVapidDetails('mailto:flore.vlad@gmail.com',
                'BItK24fqBJZUemGKB0HfW7HHtVsOcjiwTmza47grdQPRWGtfFuDSoHtglvba8PJim5u2WSzKlXfKSkwnDWxwgyA',
                '3FeA94wYJehlsTPbAqMuW8anuFG3-jctRa6MpwCzYKE');
            return admin.database().ref('subscriptions').once('value');
        }).then(function (subscriptions) {
            subscriptions.forEach(function (sub) {
                var pushConfig = {
                    endpoint: sub.val().endpoint,
                    keys: {
                        auth: sub.val().keys.auth,
                        p256dh: sub.val().keys.p256dh
                    }
                };
                webpush.sendNotification(pushConfig, JSON.stringify({
                    title: 'New Post',
                    content: 'New Post added!',
                    openUrl: '/help'
                })).catch(function (error) {
                    console.log('Error while sending the notification - ', error);
                })
            });
            return response.status(201).json({ message: 'Data stored', id: request.body.id });
        }).catch((error) => {
            response.status(500).json({ error: error });
        })
    })
});
