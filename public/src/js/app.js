// var deferredPrompt;
var enableNotificationButtons = document.querySelectorAll('.enable-notifications');
var headerElement = document.querySelector('.mdl-layout__header');
var mainElement = document.querySelector('main');
var currentSubscription = null;

// polyfill for Promise
if (!window.Promise) {
    window.Promise = Promise;
}

// register the service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/sw.js')
        .then(function (registration) {
            console.log('[ServiceWorker] Service worker registration successful with scope:', registration.scope);
        })
        .catch(function (error) {
            console.log('[ServiceWorker] Service worker registration failed:', error);
        });
}

window.addEventListener('beforeinstallprompt', function (event) {
    console.log('[ServiceWorker] \'beforeinstallprompt\' event was fired');
    // prevent the event - the banner with the 'add to homescreen' will not be showed
    // event.preventDefault();

    // save the prompt event for later use
    // deferredPrompt = event;

    event.userChoice.then(function (result) {
        console.log('[ServiceWorker] \'beforeinstallprompt\' event user choice: ' + result.outcome);

        if (result.outcome === 'dismissed') {
            // do nothing
        }
        else {
            // do nothing
        }
    });

    return true;
});

// function showIndicator() {
//     console.log('[App] offline');
//     headerElement.className = 'mdl-layout__header offline';
//     mainElement.className = 'mdl-layout__content mat-typography offline';
// }
//
// function hideIndicator() {
//     console.log('[App] online');
//     headerElement.className = 'mdl-layout__header';
//     mainElement.className = 'mdl-layout__content mat-typography';
// }
//
// window.addEventListener('online', hideIndicator);
// window.addEventListener('offline', showIndicator);

// check if these features are available
if ('Notification' in window && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
        .then(function (swReg) {
            return swReg.pushManager.getSubscription();
        })
        .then(function (subscription) {
            if (subscription === null) {
                for (var i = 0; i < enableNotificationButtons.length; i++) {
                    enableNotificationButtons[i].style.display = 'inline-block';
                    enableNotificationButtons[i].addEventListener('click', subscribeForNotification);
                }
            } else {
                currentSubscription = subscription;
                for (var i = 0; i < enableNotificationButtons.length; i++) {
                    enableNotificationButtons[i].style.display = 'inline-block';
                    enableNotificationButtons[i].textContent = 'Disable notifications';
                    enableNotificationButtons[i].addEventListener('click', unsubscribeFromNotification);
                }
            }
        });
}

// configure and display the confirmation notification
function displayConfirmNotification() {
    // if ('serviceWorker' in navigator) {
    var options = {
        body: 'You have successfully subscribed!',
        data: {
            url: '/help'
        },
        icon: '/src/images/icons/app-icon-96x96.png',
        image: 'src/images/heidelberg.jpg',
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
    navigator.serviceWorker.ready
        .then(function (swReg) {
            swReg.showNotification('Successfully subscribed', options);
        })
    // }
}

// configure the push notification
function configurePushSub() {
    navigator.serviceWorker.ready
        .then(function (swReg) {
            console.log('[Notification] create new subscription');
            var vapidPublicKey = 'BItK24fqBJZUemGKB0HfW7HHtVsOcjiwTmza47grdQPRWGtfFuDSoHtglvba8PJim5u2WSzKlXfKSkwnDWxwgyA';
            var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
            // subscription = endpoint of that browser vendor server to which we push our push messages
            //only the server with the correponding private key may send push notifications

            // create new subscription
            return swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidPublicKey
            });
        }).then(function (sub) {
        // save the subscription
        console.log('[Notification] saving subscription: ', sub);

        for (var i = 0; i < enableNotificationButtons.length; i++) {
            enableNotificationButtons[i].textContent = 'Disable notifications';
            enableNotificationButtons[i].removeEventListener('click', subscribeForNotification);
            enableNotificationButtons[i].addEventListener('click', unsubscribeFromNotification);
        }

        return fetch('https://udemy-pwagram-29b2e.firebaseio.com/subscriptions.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(sub)
        }).then(function (res) {
            if (res.ok) {
                console.log('[Notification] subscription has been saved!');
                displayConfirmNotification();
                currentSubscription = sub;
            } else {
                console.log('[Notification] Cannot save subscription!');
            }
        }).catch(function (error) {
            console.log('[Notification] error while saving the subscription:', error);
            console.log('[Notification] Subscribing for notifications requires an online connection!');

            currentSubscription = sub;
            unsubscribeFromNotification();

            var snackbarContainer = document.querySelector('#confirmation-toast');
            var data = {message: 'Subscribing for notifications requires an online connection!'};
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
        })
    })
}

function subscribeForNotification() {
    Notification.requestPermission(function (result) {
        console.log('[Notification] user choice:', result);
        if (result !== 'granted') {
            console.log('[Notification] no notification permission granted!');
        } else {
            configurePushSub();
            // displayConfirmNotification();
        }
    });
}

function unsubscribeFromNotification() {
    if (currentSubscription) {
        currentSubscription.unsubscribe().then(function () {
            console.log('[Notification] successfully unsubscribed!');
            // TODO delete from the firebase database
            for (var i = 0; i < enableNotificationButtons.length; i++) {
                enableNotificationButtons[i].textContent = 'Enable notifications';
                enableNotificationButtons[i].removeEventListener('click', unsubscribeFromNotification);
                enableNotificationButtons[i].addEventListener('click', subscribeForNotification);
            }
        }).catch((error) => {
            console.error('[Notification] error thrown while unsubscribing from push messaging', error);
        });
    }
}