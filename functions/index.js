const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const corsHandler = cors({ origin: true });
const webpush = require('web-push');
var formidable = require('formidable');
var fs = require('fs');
var UUID = require('uuid-v4');

var serviceAccount = require('./udemy-pwagram-29b2e-firebase-adminsdk-y3c51-94f28f7cb8.json');
var gcconfig = {
    projectId: 'udemy-pwagram-29b2e',
    keyFilename: 'udemy-pwagram-29b2e-firebase-adminsdk-y3c51-94f28f7cb8.json'
};
var gcs = require('@google-cloud/storage')(gcconfig);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://udemy-pwagram-29b2e.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest((request, response) => {
    corsHandler(request, response, () => {
        var uuid = UUID();
        var formData = new formidable.IncomingForm();
        formData.parse(request, function (err, fields, files) {
            if (err) {
                console.log('Error', err);
            }
            fs.rename(files.file.path, '/tmp/' + files.file.name);
            var bucket = gcs.bucket('udemy-pwagram-29b2e.appspot.com');
            bucket.upload('/tmp/' + files.file.name, {
                uploadType: 'media',
                metadata: {
                    metadata: {
                        contentType: files.file.type,
                        firebaseStorageDownloadTokens: uuid
                    }
                }
            }, function (err, file) {
                if (!err) {
                    admin.database().ref('posts').push({
                        id: fields.id,
                        title: fields.title,
                        location: fields.location,
                        image: 'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(file.name) + '?alt=media&token=' + uuid
                    }).then(() => {
                        console.log('webpush: set vapid details...');
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
                            console.log('subscriptions - pushConfig: ', pushConfig);
                            webpush.sendNotification(pushConfig, JSON.stringify({
                                title: 'New Post',
                                content: 'New Post added!',
                                openUrl: '/help'
                            })).catch(function (error) {
                                console.log('Error while sending the notification - ', error);
                            })
                        });
                        return response.status(201).json({ message: 'Data stored', id: fields.id });
                    }).catch((error) => {
                        console.log('Error ', error);
                        response.status(500).json({ error: error });
                    })
                } else {
                    console.log('Error', err);
                }
            });
        });
    })
});
