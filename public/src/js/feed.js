var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');

var videoPlayer = document.querySelector('#player');
var canvasElement = document.querySelector('#canvas');
var captureButton = document.querySelector('#capture-btn');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');

var picture = null;

var locationBtn = document.querySelector('#location-btn');
var locationLoader = document.querySelector('#location-loader');

var fetchedLocation = {lat: 0, long: 0};

locationBtn.addEventListener('click', function () {
    if (!('geolocation' in navigator)) {
        return;
    }

    var sawAlert = false;

    locationBtn.style.display = 'none';
    locationLoader.style.display = 'block';

    navigator.geolocation.getCurrentPosition(function (position) {
        locationBtn.style.display = 'inline';
        locationLoader.style.display = 'none';
        fetchedLocation = {lat: position.coords.latitude, long: position.coords.longitude};
        //TODO use google api to get the location name based on the coords
        locationInput.value = 'Somewhere in this big mean world';
        document.querySelector('#manual-location').classList.add('is-focused');
    }, function (error) {
        console.log(error);
        locationBtn.style.display = 'inline';
        locationLoader.style.display = 'none';
        if (!sawAlert) {
            alert('Could not fetch location, please enter manually!');
            sawAlert = true;
        }
        fetchedLocation = {lat: 0, long: 0};
    }, {timeout: 7000})

});

function initializeLocation() {
    if (!('geolocation' in navigator)) {
        locationBtn.style.display = 'none';
    }
}

function initializeMedia() {
    if (!('mediaDevices' in navigator)) {
        navigator.mediaDevices = {};
    }

    if (!('getUserMedia' in navigator.mediaDevices)) {
        navigator.mediaDevices.getUserMedia = function (constraints) {
            var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented'));
            }

            return new Promise(function (resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
            });
        }
    }

    navigator.mediaDevices.getUserMedia({video: true})
        .then(function (stream) {
            videoPlayer.srcObject = stream;
            videoPlayer.style.display = 'block';
        }).catch(function (error) {
        imagePickerArea.style.display = 'block';
    });
}

captureButton.addEventListener('click', function (event) {
    canvasElement.style.display = 'block';
    videoPlayer.style.display = 'none';
    captureButton.style.display = 'none';

    var context = canvasElement.getContext('2d');
    context.drawImage(videoPlayer, 0, 0, canvas.width, videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width));
    videoPlayer.srcObject.getVideoTracks().forEach(track => {
        track.stop();
    });
    picture = dataURItoBlob(canvasElement.toDataURL());
});

imagePicker.addEventListener('change', function (event) {
    picture = event.target.files[0];
});

function openCreatePostModal() {
    initializeMedia();
    initializeLocation();
    createPostArea.style.display = 'block';
    // setTimeout(function() {
    setTimeout(function () {
        createPostArea.style.transform = 'translateY(0)';
    }, 1);
    // }, 1);
    if (deferredPrompt) {
        deferredPrompt.prompt();

        deferredPrompt.userChoice.then(function (choiceResult) {
            console.log(choiceResult.outcome);

            if (choiceResult.outcome === 'dismissed') {
                console.log('User cancelled installation');
            } else {
                console.log('User added to home screen');
            }
        });

        deferredPrompt = null;
    }

    // unregister a sw
    // if ('serviceWorker' in navigator) {
    //   navigator.serviceWorker.getRegistrations().then(function (registrations) {
    //     for (var i = 0; i < registrations.length; i++) {
    //       registrations[i].unregister();
    //     }
    //   });
    // }

}

function closeCreatePostModal() {
    // createPostArea.style.display = 'none';
    imagePickerArea.style.display = 'none';
    videoPlayer.style.display = 'none';
    canvasElement.style.display = 'none';
    locationBtn.style.display = 'inline';
    locationLoader.style.display = 'none';
    captureButton.style.display = 'inline';
    if (videoPlayer.srcObject) {
        videoPlayer.srcObject.getVideoTracks().forEach(track => {
            track.stop();
        });
    }
    setTimeout(function () {
        createPostArea.style.transform = 'translateY(100vh)';
    }, 1);
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

function clearCards() {
    while (sharedMomentsArea.hasChildNodes()) {
        sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
    }
}

function createCard(data) {
    var cardWrapper = document.createElement('div');
    cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
    var cardTitle = document.createElement('div');
    cardTitle.className = 'mdl-card__title';
    cardTitle.style.backgroundImage = 'url(' + data.image + ')';
    cardTitle.style.backgroundSize = 'cover';
    cardTitle.style.height = '180px';
    cardWrapper.appendChild(cardTitle);
    var cardTitleTextElement = document.createElement('h2');
    cardTitleTextElement.className = 'mdl-card__title-text';
    cardTitleTextElement.textContent = data.title;
    cardTitleTextElement.style.color = 'white';
    cardTitle.appendChild(cardTitleTextElement);
    var cardSupportingText = document.createElement('div');
    cardSupportingText.className = 'mdl-card__supporting-text';
    cardSupportingText.textContent = data.location;
    cardSupportingText.style.textAlign = 'center';
    // var cardSaveButton = document.createElement('button');
    // cardSaveButton.textContent='Save';
    // cardSaveButton.addEventListener('click',onSaveButtonClicked);
    // cardSupportingText.appendChild(cardSaveButton);
    cardWrapper.appendChild(cardSupportingText);
    componentHandler.upgradeElement(cardWrapper);
    sharedMomentsArea.appendChild(cardWrapper);
}

//currently not used any more
// function onSaveButtonClicked() {
//   console.log('button clicked');
//   if ('caches' in window) {
//     caches.open('user-requested').then(function (cache) {
//       cache.add('https://httpbin.org/get');
//       cache.add('/src/images/sf-boat.jpg');
//     });

//   }
// }

function updateUI(data) {
    clearCards();
    var dataArray = [];
    for (var key in data) {
        dataArray.push(data[key]);
    }
    for (var i = 0; i < dataArray.length; i++) {
        createCard(dataArray[i]);
    }
}

const url = 'https://udemy-pwagram-29b2e.firebaseio.com/posts.json';
var networkDataReceived = false;

fetch(url)
    .then(function (res) {
        return res.json();
    })
    .then(function (data) {
        networkDataReceived = true;
        console.log('From web', data);
        updateUI(data);
    });


if ('indexedDB' in window) {
    readAllData('posts').then(function (data) {
        if (!networkDataReceived) {
            console.log('From cache', data);
            updateUI(data);
        }
    })
}

function sendData() {

    var postData = new FormData();
    var id = new Date().toISOString();
    postData.append('id', id);
    postData.append('title', titleInput.value);
    postData.append('location', locationInput.value);
    postData.append('rawLocationLat', fetchedLocation.lat);
    postData.append('rawLocationLong', fetchedLocation.long);
    postData.append('file', picture, id + '.png');

    fetch('https://us-central1-udemy-pwagram-29b2e.cloudfunctions.net/storePostData', {
        method: 'POST',
        body: postData
    }).then(function (res) {
        console.log('Sent data', res);
        updateUI();
    });
}

form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
        alert('Please enter valid data!');
        return;
    }
    closeCreatePostModal();

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
            .then(function (sw) {
                var post = {
                    id: new Date().toISOString(),
                    title: titleInput.value,
                    location: locationInput.value,
                    picture: picture,
                    rawLocation: fetchedLocation
                };
                //write data to indexeddb
                writeData('sync-posts', post)
                    .then(function () {
                        //register this event on the service worker
                        return sw.sync.register('sync-new-posts');
                    })
                    .then(function () {
                        var snackbarContainer = document.querySelector('#confirmation-toast');
                        var data = {message: 'Your post was saved for syncing!'};
                        snackbarContainer.MaterialSnackbar.showSnackbar(data);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
            });
    } else {
        sendData();
    }
});