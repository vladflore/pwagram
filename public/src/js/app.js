var deferredPrompt;
var enableNotificationButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
    window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/sw.js')
        .then(function () {
            console.log('Service worker registered!');
        })
        .catch(function (err) {
            console.log(err);
        });
}

window.addEventListener('beforeinstallprompt', function (event) {
    console.log('beforeinstallprompt fired');
    event.preventDefault();
    deferredPrompt = event;
    return false;
});

function displayConfirmNotification() {
    if ('serviceWorker' in navigator) {
        var options = {
            body: 'You have successfully subscribed to the Notification service!',
            icon: '/src/images/icons/app-icon-96x96.png',
            image: 'src/images/sf-boat.jpg',
            dir: 'ltr',
            lang: 'en-US', // BCP 47
            vibrate: [100, 50, 200], //vibration, pause, vibration
            badge: '/src/images/icons/app-icon-96x96.png',
            tag: 'confirm-notification',
            renotify: true, //vibrate or not when multiple notif with the same tag
            actions: [ //might not be displayed
                {action: 'confirm', title: 'Okay', icon: '/src/images/icons/app-icon-96x96.png'},
                {action: 'cancel', title: 'Cancel', icon: '/src/images/icons/app-icon-96x96.png'}
            ]
        };
        navigator.serviceWorker.ready.then(function (swreg) {
            swreg.showNotification('Successfully subscribed', options);
        })
    }
}

function configurePushSub() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    var reg;
    navigator.serviceWorker.ready.then(function (swreg) {
        reg = swreg;
        return swreg.pushManager.getSubscription();
    }).then(function (sub) {
        if (sub === null) {
            var vapidPublicKey = 'BItK24fqBJZUemGKB0HfW7HHtVsOcjiwTmza47grdQPRWGtfFuDSoHtglvba8PJim5u2WSzKlXfKSkwnDWxwgyA';
            var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
            // create new subscription
            // subscription = endpoint of that browser vendor server to which we push our push messages

            //only the server with the correponding private key may send push notifications
            return reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidPublicKey
            });
        } else {
            //there is a subscription - per browser and device
            return sub;
        }
    }).then(function (newSub) {
        console.log(JSON.stringify(newSub));
        return fetch('https://udemy-pwagram-29b2e.firebaseio.com/subscriptions.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newSub)
        }).then(function (res) {
            if (res.ok) {
                displayConfirmNotification();
            }
        }).catch(function (error) {
            console.log('Error in configurePushSub() - ', error);
        })
    })
}

function askForNotificationPermission() {
    Notification.requestPermission(function (result) {
        console.log('User choice:', result);
        if (result !== 'granted') {
            console.log('No notification permission granted!');
        } else {
            configurePushSub();
            //displayConfirmNotification();
        }
    }); //get permission for notif AND push
}

//are these features available?
if ('Notification' in window && 'serviceWorker' in navigator) {
    for (var i = 0; i < enableNotificationButtons.length; i++) {
        enableNotificationButtons[i].style.display = 'inline-block';
        enableNotificationButtons[i].addEventListener('click', askForNotificationPermission);
    }
}