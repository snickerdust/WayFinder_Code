/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
    navToggle = document.getElementById('nav-toggle'),
    navClose = document.getElementById('nav-close')

/*===== MENU SHOW =====*/
/* Validate if constant exists */
if(navToggle){
    navToggle.addEventListener('click', () =>{
        navMenu.classList.add('show-menu')
    })
}

/*===== MENU HIDDEN =====*/
/* Validate if constant exists */
if(navClose){
    navClose.addEventListener('click', () =>{
        navMenu.classList.remove('show-menu')
    })
}

/*=============== REMOVE MENU MOBILE ===============*/
const navLink = document.querySelectorAll('.nav__link')

const linkAction = () =>{
    const navMenu = document.getElementById('nav-menu')
    // When we click on each nav__link, we remove the show-menu //
    navMenu.classList.remove('show-menu')
}
navLink.forEach(n => n.addEventListener('click', linkAction))

/*=============== ADD BLUR TO HEADER ===============*/
const blurHeader = () =>{
    const header = document.getElementById('header')
    //When the scroll is greater than 50 viewport height, add the blur-header class//
    this.scrollY >= 50 ? header.classList.add('blur-header')
                       : header.classList.remove('blur-header')
}
window.addEventListener('scroll', blurHeader)

/*=============== SHOW SCROLL UP ===============*/ 
const scrollUp = () =>{
    const scrollUp = document.getElementById('scroll-up')
    // When the scroll is higher than 350 viewport height, add //
    this.scrollY >= 350 ? scrollUp.classList.add('show-scroll')
                        : scrollUp.classList.remove('show-scroll')
}
window.addEventListener('scroll', scrollUp)

/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]')

const scrollActive = () =>{
        const scrollY = window.scrollY

        sections.forEach(current =>{
            const sectionHeight = current.offsetHeight,
                  sectionTop = current.offsetTop - 58,
                  sectionId = current.getAttribute('id'),
                  sectionsClass = document.querySelector('.nav__menu a[href*=' + sectionId + ']')

            // Check if sectionClass is not Null
            if (sectionClass) {
                if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight){
                    sectionsClass.classList.add('active-link')
                } else {
                  sectionsClass.classList.remove('active-link')
                }
            } else {
                console.warn(`No element found for selector: .nav__menu a[href*=${sectionId}]`);
            }
 
        })
}
window.addEventListener('scroll', scrollActive)

/*=============== SCROLL REVEAL ANIMATION ===============*/
const sr = ScrollReveal({
    origin: 'top',
    distance: '60px',
    duration: 1500,
    delay: 400,
    // reset: true // Animations repeat
})

sr.reveal(`.home__data, .explore__data, .explore__user, .footer_container`)
sr.reveal(`.home__card`, {delay: 300, distance: '100px', interval: 100})
sr.reveal(`.about__data, .join__image`, {origin: 'right'})
sr.reveal(`.about__image, .join__data`, {origin: 'left'})
sr.reveal(`.popular__card`, {interval: 100})

/*=============== GOOGLE MAP API ===============*/
let map;
let marker;
let userLocation;

function sendLocationToFlask(location) {
    fetch('http://127.0.0.1:5000/recommendations', {  // Periksa URL ini
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location: location })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok - status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Clear existing recommendations
        const recommendationsDiv = document.getElementById('recommendations');
        const tripPlannerDiv = document.getElementById('trip-planner');
        recommendationsDiv.innerHTML = '';
        tripPlannerDiv.innerHTML = '';

        // Check if data has recommendations
        if (data.recommendations.length > 0) {
            data.recommendations.forEach(place => {
                const placeHtml = `
                    <div class="recommendation">
                        <h3>${place.place}</h3>
                        <p><strong>Category:</strong> ${place.category}</p>
                        <p><strong>Rating:</strong> ${place.rating}</p>
                        <p><strong>Address:</strong> ${place.address}</p>
                        <p><strong>Phone Number:</strong> ${place.phone_number}</p>
                        <p><strong>Opening Hours:</strong> ${place.opening_hours}</p>
                        <img src="${place.photo ? 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=' + place.photo + '&key=AIzaSyBfikpq18Zeyg4Tb37Wrbyq0Gsopm8b7YM' : 'default.jpg'}" alt="Photo of ${place.place}">
                        <iframe width="600" height="450" frameborder="0" style="border:0" src="${place.directions}" allowfullscreen></iframe>
                    </div>`;

                recommendationsDiv.insertAdjacentHTML('beforeend', placeHtml);
            });
        } else {
            recommendationsDiv.innerHTML = '<p>No recommendations available.</p>';
        }

        if (data.trip_planner.length > 0) {
            data.trip_planner.forEach(trip => {
                const tripHtml = `
                    <div class="trip">
                        <h3>${trip.place}</h3>
                        <p><strong>Category:</strong> ${trip.category}</p>
                        <p><strong>Opening Hours:</strong> ${trip.opening_hour}</p>
                    </div>`;

                tripPlannerDiv.insertAdjacentHTML('beforeend', tripHtml)
            });
        } else {
            tripPlannerDiv.innerHTML = '<p>No trip planner available.</p>';
        }
    })
    .catch(error => console.error('Error:', error));
}


function dumpUserLocationAsJSON() {
    const radius = document.getElementById('radius').value; // Pastikan Anda mendapatkan radius dari input
    const userLocationJSON = {
        location: userLocation,
        radius: radius
    };
    console.log("User Location JSON:", JSON.stringify(userLocationJSON));
    sendLocationToFlask(userLocationJSON.location, userLocationJSON.radius);
}

// Fungsi untuk mengonversi dan mengirim data lokasi sebagai JSON ke Flask app
function dumpUserLocationAsJSON() {
    const userLocationJSON = {
        location: userLocation
    };
    console.log("User Location JSON:", JSON.stringify(userLocationJSON));

    // Panggil fungsi untuk mengirim data ke Flask app
    sendLocationToFlask(userLocationJSON.location);
}

function initMap() {
    console.log("Initializing map...");
    const initialLocation = { lat: -7.265282109266087, lng: 112.78467615690352 };
    map = new google.maps.Map(document.getElementById("map"), {
        center: initialLocation,
        zoom: 13,
    });
    marker = new google.maps.Marker({
        position: initialLocation,
        map: map,
        draggable: true,
    });
    userLocation = `${initialLocation.lat},${initialLocation.lng}`;
    console.log("Initial location set to:", userLocation);

    marker.addListener('dragend', function() {
        userLocation = `${marker.getPosition().lat()},${marker.getPosition().lng()}`;
        console.log("Marker dragged to:", userLocation);
        dumpUserLocationAsJSON();
    });

    const input = document.getElementById('location');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            console.log("No details available for input: '" + place.name + "'");
            return;
        }

        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }
        marker.setPosition(place.geometry.location);
        userLocation = `${place.geometry.location.lat()},${place.geometry.location.lng()}`;
        console.log("Place selected:", userLocation);
        dumpUserLocationAsJSON();
    });
}

function loadScript(src, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    script.onload = callback;
    script.onerror = function () {
        console.error('Error loading script:', src);
    };
    document.head.appendChild(script);
}

function initialize() {
    const apiKey = 'AIzaSyBfikpq18Zeyg4Tb37Wrbyq0Gsopm8b7YM';
    loadScript(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`);
}

document.addEventListener('DOMContentLoaded', initialize);

document.getElementById('current-location-btn').addEventListener('click', function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(pos);
                marker.setPosition(pos);
                userLocation = `${pos.lat},${pos.lng}`;
                console.log("User's current location (HTML5):", userLocation);
                dumpUserLocationAsJSON();
            }, 
            error => {
                console.error("Error with HTML5 Geolocation:", error);
                handleGeolocationError(error);
            }, 
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        console.error("Browser doesn't support Geolocation");
        alert("Geolocation is not supported by your browser.");
    }
});

function handleGeolocationError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation. Please enable location permissions in your browser or device settings.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable. Please try again later or check your network connection.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out. Please try again.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred while fetching your location.");
            break;
    }
    console.error("Error fetching user's location:", error);
}



// Fungsi untuk menggunakan Google Geolocation API sebagai fallback
function fetchGeolocation() {
    const apiKey = 'AIzaSyBfikpq18Zeyg4Tb37Wrbyq0Gsopm8b7YM';
    const geolocationUrl = `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`;

    fetch(geolocationUrl, {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.location) {
            const pos = {
                lat: data.location.lat,
                lng: data.location.lng,
            };
            map.setCenter(pos);
            marker.setPosition(pos);
            userLocation = `${pos.lat},${pos.lng}`;
            console.log("User's current location (Google API):", userLocation);
        } else {
            console.error("Failed to fetch geolocation data:", data);
            alert("Failed to get your location. Please try again.");
        }
    })
    .catch(error => {
        console.error("Error fetching geolocation data:", error);
        alert("Error fetching your location. Please try again.");
    });
}
