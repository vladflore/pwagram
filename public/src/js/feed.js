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

const url = 'https://udemy-pwagram-29b2e.firebaseio.com/posts.json';
var networkDataReceived = false;

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
        var key = 'AIzaSyD38rUJZodx_MSKzlJ0Fm0Qn9kVb7NvGXU';
        var locationLink = [`https://maps.googleapis.com/maps/api/geocode/json?latlng=${fetchedLocation.lat},${fetchedLocation.long}`,
            `key=${key}`]
            .join('&');
        fetch(locationLink)
            .then(function (response) {
                return response.json();
            })
            .then(function (responseData) {
                console.log('[Geolocation] fetched location', responseData);
                if (responseData.status === 'OK') {
                    locationInput.value = responseData.results[0].formatted_address;
                } else {
                    console.log('[Geolocation] no locations could be determined');
                }
            })
            .catch(function (error) {
                console.log('[Geolocation] error while fetching location', error);
                locationInput.value = 'Somewhere in this big mean world';
            });

        document.querySelector('#manual-location').classList.add('is-focused');
    }, function (error) {
        console.log('[Geolocation] error', error);
        locationBtn.style.display = 'inline';
        locationLoader.style.display = 'none';
        if (!sawAlert) {
            alert('Could not fetch location, please enter manually!');
            sawAlert = true;
        }
        fetchedLocation = {lat: 0, long: 0};
    }, {timeout: 7000})

});

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

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

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
                console.log('[Feed] before writing to indexddb, data:', post);
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
                        console.log('[Feed] error:', error);
                    });
            }).catch(function (error) {
            console.log('[Feed] sw not ready:', error);
        });
    } else {
        // sendData();
    }
});

fetch(url)
    .then(function (res) {
        return res.json();
    })
    .then(function (data) {
        networkDataReceived = true;
        console.log('[Feed] data from server', data);
        updateUI(data);
    });


if ('indexedDB' in window) {
    readAllData('posts').then(function (data) {
        if (!networkDataReceived) {
            console.log('[Feed] data from cache', data);
            updateUI(data);
        }
    })
}

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

function openCreatePostModal() {
    initializeMedia();
    initializeLocation();

    createPostArea.style.display = 'block';
    // setTimeout(function() {
    setTimeout(function () {
        createPostArea.style.transform = 'translateY(0)';
    }, 1);
    // }, 1);

    // handle the deferred prompt for 'add to home screen' feature
    // if (deferredPrompt) {
    //     deferredPrompt.prompt();
    //     deferredPrompt.userChoice.then(function (choiceResult) {
    //         console.log('[Feed] prompt user choice result:' + choiceResult.outcome);
    //         if (choiceResult.outcome === 'dismissed') {
    //             console.log('[Feed] user cancelled installation');
    //         } else {
    //             console.log('[Feed] user added to home screen');
    //         }
    //     });
    //     deferredPrompt = null;
    // }

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
    console.log('[Feed] updating UI');
    clearCards();
    var dataArray = [];
    for (var key in data) {
        dataArray.push(data[key]);
    }
    for (var i = 0; i < dataArray.length; i++) {
        createCard(dataArray[i]);
    }

    // console.log('[Feed] no cards will be created because no data is available');
    // document.querySelector('#share-moments-headline').innerText = 'Currently no moments have been captured!';
}

// TODO update this method
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
        console.log('[Feed] Sent data the normal way', res);
        updateUI();
    });
}