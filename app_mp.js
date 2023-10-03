// Chetan Tyagi
// 2 August 2023



// Initialize the map
const map = L.map('map').setView([0, 0], 2);
// Add this line instead
const tileLayer = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.{ext}', {
  subdomains: 'abcd',
  minZoom: 0,
  maxZoom: 18,
  ext: 'png'
}).addTo(map);
L.control.fullscreen({
  position: 'topright',
  title: 'Toggle Fullscreen'

}).addTo(map);

// Initialize game variables
// Initialize high scores from localStorage or an empty array

let guessedCities = {};
let currentPlayer = null;
let playerScore = 0;
let marker = null;
let circle = null;
let initialCity = '';
let initialCountry = '';
let initialCapital = '';
let initialLat = 0;
let initialLng = 0;
let startTime = 0;
let endTime = 0;
let timerInterval = null;
tingtong=0
// Use Nominatim API to retrieve the city, country, and capital for the initial coordinates
async function initializeGame() {
  [initialLat, initialLng] = await getRandomLandCoordinates();
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${initialLat}&lon=${initialLng}`;
  try {
    const response = await fetch(nominatimUrl);
    const data = await response.json();
    initialCity = data.address.city || data.address.town || data.address.village || data.address.hamlet || 'Unknown';
    initialCountry = data.address.country || 'Unknown';

    
    //initialCapital = data.address.country_capital || 'Unknown';
    
  } catch (error) {
    console.error('Error retrieving city, country, and capital for initial coordinates:', error);
  }
}
// Game Logic - Determine Correctness and Calculate Score
async function guessCity(cityName, countryName) {
    if (!currentPlayer) {
      console.error('Player not defined.');
      return;
    }
  
    // Get the game data from Firestore
    const gameRef = db.collection('mp_data').doc(currentPlayer);
    const gameSnapshot = await gameRef.get();
    const gameData = gameSnapshot.data();
  
    // Check if it's the player's turn
    if (currentPlayer !== gameData.currentTurn) {
      console.log('Not your turn.');
      return;
    }
  
    // Compare the guessed city and country with the initial city and country
    const isCorrectGuess = (
      cityName.toLowerCase() === gameData.initialCity.toLowerCase() &&
      countryName.toLowerCase() === gameData.initialCountry.toLowerCase()
    );
  
    // Calculate the score change based on correctness
    const scoreChange = isCorrectGuess ? 10 : -5;
  
    // Update the player's score
    gameData[currentPlayer + 'Score'] += scoreChange;
  
    // Switch turns
    gameData.currentTurn = currentPlayer === gameData.player1 ? gameData.player2 : gameData.player1;
  
    // Update the game data in Firestore
    await gameRef.set(gameData);
  
    console.log(`Guess: ${cityName}, ${countryName}, Score Change: ${scoreChange}`);
  }
  
  // Call createOrJoinGame with the username when a player starts
  createOrJoinGame('Player1');
function startTimer() {
  let seconds = 0;
  const timerElement = document.getElementById('timer');

  timerInterval = setInterval(() => {
    seconds++;
    timerElement.textContent = `Time Elapsed: ${seconds} seconds`;
  }, 1000);
  tingtong=5
}
// Add click event listener to map
map.on('click', function(event) {
  if (marker === null) {
    // Add marker at clicked location
    marker = L.marker(event.latlng).addTo(map);
  } else {
    // Move marker to clicked location
    marker.setLatLng(event.latlng);
  }
});


function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  
}

// Add this code to your existing updateHighScoreList function
// Modify the updateHighScoreList function to include rankings
async function updateHighScoreList() {
  const highScoreList = document.getElementById('high-score-list');
  highScoreList.innerHTML = '';

  // Fetch high scores from Firebase Firestore and update the list
  try {
    const querySnapshot = await db.collection("highScores").orderBy("score", "desc").limit(10).get();
    let rank = 1; // Initialize the ranking counter
    querySnapshot.forEach((doc) => {
      const scoreData = doc.data();
      const listItem = document.createElement('li');
      listItem.innerHTML = `<strong> ${scoreData.name}</strong>: ${scoreData.score} points (${scoreData.date})`;
      highScoreList.appendChild(listItem);
      rank++; // Increment the ranking counter for the next score
    });
  } catch (error) {
    console.error("Error getting high scores: ", error);
  }
}



// Handle guess button click event
const guessButton = document.getElementById('guess-button');
const showCoordinatesCheckbox = document.getElementById('show-coordinates');
guessButton.addEventListener('click', async function () {
  if (marker === null) {
    return;
  }
  const guessLat = marker.getLatLng().lat.toFixed(4);
  const guessLng = marker.getLatLng().lng.toFixed(4);

  const helloDiv = document.querySelector('.text-center2');
  if (helloDiv !== null) {
    helloDiv.textContent = '';
  }

  const loadingElement = document.getElementById('loading');
  loadingElement.style.display = 'block'; // Show loading element

  // Use Nominatim API to retrieve the nearest city, country, and capital to the marker
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${guessLat}&lon=${guessLng}`;
  
  try {
    const response = await fetch(nominatimUrl);
    const data = await response.json();

    const guessCity = data.address.city || data.address.town || data.address.village || data.address.hamlet || 'Unknown';
    const guessCountry = data.address.country || 'Unknown';
    const guessDistance = Math.round(marker.getLatLng().distanceTo([initialLat, initialLng]));
    
    const resultText = [];
      for (const guessedCity in guessedCities) {
    const distance = marker.getLatLng().distanceTo(guessedCities[guessedCity].getLatLng());
    if (distance <= 50000) {
      alert('You are too close to a previously guessed city. Try another location.');
      return;
    }
  }
    if (guessDistance < 50000) {
      endTime = Date.now();
      const timeTaken = (endTime - startTime) / 1000;
      playerScore += 10; // Calculate time taken in seconds
      resultText.push(`<strong>You win! Distance from answer:</strong> ${guessDistance / 1000} kilometers. <strong>Your Guess:</strong> ${guessCity}, ${guessCountry}.`);
      guessedCities[initialCity] = L.marker(marker.getLatLng()).addTo(map);

      stopTimer();

      resultText.push(`Reload the page to start a new round.`);
      const playerScoreElement = document.getElementById('player-score');
      playerScoreElement.textContent = playerScore;
    }else {
      resultText.push(`<strong>Distance from answer:</strong> ${guessDistance / 1000} kilometers. <strong>Your Guess:</strong> ${guessCity}, ${guessCountry}.`);
      if (initialLat.toFixed(4) !== 0.0000 && initialCity !== "" && initialCity !== "Unknown") {
        resultText.push(`<strong>To find:</strong> ${initialCity}, ${initialCountry}.`);
      } else {
        // Fix the loop to properly fetch the data for initial coordinates
        let validInitialCity = false;
        do {
          [initialLat, initialLng] = await getRandomLandCoordinates();
          const nominatimUrlLoop = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${initialLat}&lon=${initialLng}`;
          try {
            const response = await fetch(nominatimUrlLoop);
            const data = await response.json();
            initialCity = data.address.city || data.address.town || data.address.village || data.address.hamlet || 'Unknown';
            validInitialCity = initialCity !== "" && initialCity !== "Unknown";
            initialCountry = data.address.country || 'Unknown';

          } catch (error) {
            console.error('Error retrieving city, country, and capital for initial coordinates:', error);
          }
        } while (!validInitialCity);
        resultText.push(`<strong>To find:</strong> ${initialCity}, ${initialCountry}.`);
      }
    }

    // Add latitude and longitude of guess and initial coordinates if checkbox is checked
    if (showCoordinatesCheckbox.checked) {
      resultText.push(`<strong>Guess Coordinates:</strong> ${guessLat}, ${guessLng}`);
      resultText.push(`<strong>Answer Coordinates:</strong> ${initialLat.toFixed(4)}, ${initialLng.toFixed(4)}`);
    }

    // Remove previous circle if it exists
    if (circle !== null) {
      map.removeLayer(circle);
    }

    // Add new circle at the marker location if the initial city is not "Unknown"
    if (initialCity !== 'Unknown') {
      circle= L.circle(marker.getLatLng(), {
        color: 'red',
        radius: 1000,
      }).addTo(map);
    }

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = resultText.join('<br>');

  } catch (error) {
    console.error('Error retrieving nearest city, country, and capital:', error);
  } finally {
    loadingElement.style.display = 'none'; // Hide loading element
  }
  if (tingtong!=5){  startTimer()    
     startTime = Date.now();
    ; 
  }
});
function sanitizeInput(input) {
  // Replace '<' with '&lt;' and '&' with '&amp;'
  return input.replace(/</g, '&lt;').replace(/&/g, '&amp;');
}
// Generate random coordinates on land
async function getRandomLandCoordinates() {
  const cities =   ['Cordoba', 'Accra', 'Algiers', 'Maputo', 'Antananarivo', 'Phnom Penh', 'Santo Domingo', 'Dhaka', 'Port-au-Prince', 'Santiago de Cuba', 'Kingston', 'Vilnius', 'Skopje', 'San Juan', 'La Paz', 'Port of Spain', 'Anchorage', 'Suva', 'Noumea', 'Hobart', 'Darwin', 'Canberra', 'Georgetown', 'Paramaribo', 'Oranjestad', 'Kingstown', 'Roseau', 'Basseterre', 'Bridgetown', 'Castries', 'St. George\'s', 'Belmopan', 'Port of Spain', 'Asuncion', 'Montevideo', 'Paramaribo', 'Cayenne', 'Nouakchott', 'Bamako', 'Niamey', 'Conakry', 'Monrovia', 'Freetown', 'Banjul', 'Bissau', 'Praia', 'Djibouti', 'Asmara', 'Addis Ababa', 'Mogadishu', 'Hargeisa', 'Juba', 'Khartoum', 'N\'Djamena', 'Bangui', 'Brazzaville', 'Kinshasa', 'Libreville', 'Malabo', 'Yaounde', 'Nouakchott', 'Rabat', 'Algiers', 'Tunis', 'Tripoli', 'Cairo', 'Kampala', 'Lilongwe', 'Harare', 'Gaborone', 'Maseru', 'Mbabane', 'Antananarivo', 'Port Louis', 'Mamoudzou', 'Saint-Denis', 'Porto-Novo', 'Lome', 'Ouagadougou', 'Niamey', 'N\'Djamena', 'Bangui', 'Bujumbura', 'Kigali', 'Luanda', 'Lusaka', 'Windhoek', 'Gaborone', 'Pretoria', 'Maseru', 'Lobamba', 'Mbabane', 'Maputo', 'Antananarivo', 'Moroni', 'Victoria', 'Male', 'Colombo', 'Kathmandu', 'Thimphu', 'Dhaka', 'Naypyidaw', 'Vientiane', 'Phnom Penh', 'Hanoi', 'Ulaanbaatar', 'Pyongyang', 'Seoul', 'Tokyo', 'Beijing', 'Taipei', 'Port Moresby', 'Honiara', 'Port Vila', 'Suva', 'Nukuʻalofa', 'Apia', 'Funafuti', 'Tarawa', 'Majuro', 'Palikir', 'Saipan', 'Hagatna', 'Koror', 'Melekeok', 'Ngerulmud', 'Yaren', 'Kingston', 'St. John\'s', 'Roseau', 'Basseterre', 'Castries', 'Kingstown', 'Bridgetown', 'Port of Spain', 'Georgetown', 'Paramaribo', 'Cayenne', 'Nouakchott', 'Bamako', 'Niamey', 'Accra', 'Conakry', 'Freetown', 'Monrovia', 'Banjul', 'Bissau', 'Praia', 'Dakar', 'Nouakchott', 'Rabat', 'Algiers', 'Tunis', 'Tripoli', 'Cairo', 'Khartoum', 'Djibouti', 'Asmara', 'Addis Ababa', 'Mogadishu', 'Nairobi', 'Kampala', 'Kigali', 'Bujumbura', 'Dodoma', 'Lilongwe', 'Lusaka', 'Harare', 'Gaborone', 'Pretoria', 'Maseru', 'Mbabane', 'Maputo', 'Antananarivo', 'Moroni', 'Victoria', 'Male', 'Colombo', 'Kathmandu', 'Thimphu', 'Dhaka', 'Naypyidaw', 'Vientiane', 'Phnom Penh', 'Hanoi', 'Ulaanbaatar', 'Pyongyang', 'Seoul', 'Tokyo', 'Beijing', 'Taipei', 'Port Moresby', 'Honiara', 'Port Vila', 'Suva', 'Nukuʻalofa', 'Apia', 'FunafutiSure','Dakar', 'Oslo', 'São Paulo', 'Novosibirsk', 'Madrid', 'Copenhagen', 'Port Louis', 'Panama City', 'Nashville', 'Riga', 'Hanoi', 'Geneva', 'Manhattan', 'Frankfurt', 'Sapporo', 'Osaka', 'Berlin', 'Singapore', 'Ankara', 'Tallinn', 'Lyon', 'Las Vegas', 'Ottawa', 'Melbourne', 'Chicago', 'Tunis', 'Bucharest', 'Auckland', 'Jakarta', 'Nassau', 'Nagoya', 'Kiev', 'Perth', 'Abu Dhabi', 'Johannesburg', 'Los Angeles', 'Hamburg', 'Venice', 'Manchester', 'Alexandria', 'Istanbul', 'Luxembourg City', 'Ulaanbaatar', 'Valencia', 'Brussels', 'Dubai', 'Manama', 'London', 'Giza', 'Budapest', 'Guangzhou', 'Helsinki', 'Zurich', 'Prague', 'Izmir', 'Bangkok', 'Edinburgh', 'Abuja', 'Tehran', 'Beijing', 'Zagreb', 'Toronto', 'Cape Town', 'Guatemala City', 'Saint Petersburg', 'Manila', 'Kyoto', 'Athens', 'Sydney', 'Buenos Aires', 'Nicosia', 'Montreal', 'Brasilia', 'Islamabad', 'Kolkata', 'Utrecht', 'Amman', 'Rio de Janeiro', 'Amsterdam', 'Xiamen', 'Dublin', 'Shanghai', 'Kuala Lumpur', 'Sao Paulo', 'Washington, D.C.', 'Fiji', 'Ouagadougou', 'Warsaw', 'Esfahan', 'Seoul', 'Kyiv', 'Paris', 'Delhi', 'Oxford', 'Adelaide', 'Wellington', 'Cairo', 'San Salvador', 'Marseille', 'Lisbon', 'Tbilisi', 'Yokohama', 'Tokyo', 'Hong Kong', 'Sharjah', 'New York', 'Vancouver', 'Bangalore', 'Quebec City','Minsk', 'Quito', 'Havana', 'Birmingham', 'Durban', 'Mexico City', 'Taipei', 'Naples', 'Vienna', 'Reykjavik', 'Glasgow', 'Calgary', 'Incheon', 'Stockholm', 'Doha', 'Jerusalem', 'Lima', 'Munich', 'Yaounde', 'Nairobi', 'Florence', 'Moscow', 'Rome', 'Vatican City', 'Brisbane', 'Monte Carlo', 'Milan', 'Pisa', 'Yerevan', 'Caracas', 'Barcelona', 'Xian', 'Riyadh', 'Santiago', 'Windhoek','Casablanca','Chittagong', 'Bogota', 'Kabul','Karachi', 'Lagos', 'Kinshasa', 'Mumbai', 'Bengaluru', 'Tianjin', 'Chongqing', 'Bogotá', 'Lima', 'Chennai', 'Chengdu', 'Lahore', 'Baghdad', 'Bangalore', 'Surat', 'Hyderabad', 'Ho Chi Minh City', 'Luanda', 'Khartoum', 'Yangon', 'Kanpur', 'Addis Ababa', 'Nairobi', 'Dar es Salaam', 'Salvador', 'Harbin', 'Medellín', 'Jaipur', 'Aleppo', 'Guayaquil', 'Hangzhou', 'Shenyang', 'Suzhou', 'Faisalabad', 'Rawalpindi', 'Lucknow', 'Busan', 'Patna', 'Jeddah', 'Kampala', 'Ibadan', 'Dalian', 'Pune', 'Wuhan', 'Nagpur', 'Indore', 'Qingdao', 'Surat Thani', 'Madurai', 'Tangshan', 'Ningbo', 'Taichung', 'Xuzhou', 'Douala', 'Rajkot', 'Mecca', 'Shenzhen', 'Nanjing', 'Kochi', 'Changsha', 'Guadalajara', 'Monterrey', 'Bhopal', 'Tashkent', 'Lanzhou', 'Thane', 'Baotou']
  const randomCity = cities[Math.floor(Math.random() * cities.length)];
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(randomCity)}&format=json`;
  let lat, lng, city, country;
  try {
    const response = await fetch(nominatimUrl);
    const data = await response.json();
    if (data && data[0]) {
      lat = parseFloat(data[0].lat);
      lng = parseFloat(data[0].lon);

      
    }
  } catch (error) {
    console.error('Error retrieving city information for:', randomCity, error);
  }
  return [lat, lng];
}
// Define a variable to track the visibility state of the high score table
let highScoresVisible = false;

// Function to toggle the visibility of the high score table
function toggleHighScores() {
  const highScoreTable = document.getElementById("score-table");
  const toggleButton = document.getElementById("toggle-high-scores");

  if (highScoresVisible) {
    highScoreTable.style.display = "none";
    toggleButton.textContent = "Show High Scores";
  } else {
    highScoreTable.style.display = "block";
    toggleButton.textContent = "Hide High Scores";
  }

  // Toggle the visibility state
  highScoresVisible = !highScoresVisible;
}


// Initialize the game when the window finishes loading
window.addEventListener('load', async function() {
  await initializeGame();
  updateHighScoreList(); // Add this line

});
// Handle the submit score button click
// Handle the submit score button click
// Handle the submit score button click
const saveScoreButton = document.getElementById('save-score');
saveScoreButton.addEventListener('click', async () => {
  const userNameInput = document.getElementById('user-name');
  const userName = userNameInput.value;
  const sanitizedUserName = sanitizeInput(userName); // Sanitize the user's name

  // Check if the user name exceeds 15 characters
  if (sanitizedUserName && sanitizedUserName.trim() !== '' && sanitizedUserName.length <= 15) {
    const userScore = playerScore;
    const currentDate = new Date().toLocaleDateString();
    const newHighScore = { name: sanitizedUserName, score: userScore, date: currentDate };

    // Save the high score to Firebase
    db.collection("highScores")
      .add(newHighScore)
      .then(function (docRef) {
        console.log("High score saved with ID: ", docRef.id);

        // Hide the input field and button
        userNameInput.style.display = 'none';
        saveScoreButton.style.display = 'none';

        // Show the "Submitted!" message
        const submittedMessage = document.getElementById('submitted-message');
        submittedMessage.style.display = 'block';

        // Add the new high score to the leaderboard
        const highScoreList = document.getElementById('high-score-list');
        const newListItem = document.createElement('li');
        newListItem.textContent = `${sanitizedUserName}, Score: ${userScore}, Date: ${currentDate}`;
        highScoreList.appendChild(newListItem);
      })
      .catch(function (error) {
        console.error("Error adding high score: ", error);
      });
  } else {
    // Display an error message if the user name is too long
    alert('User name must be 15 characters or less.');
  }
});




function startNewGame() {
    // ...

  startTime = 0;
  endTime = 0;
  stopTimer();
  tingtong=1
  const timerElement = document.getElementById('timer');
  timerElement.textContent = 'Time Elapsed: 0 seconds';
  for (const guessedCity in guessedCities) {
    map.removeLayer(guessedCities[guessedCity]);
  }
  guessedCities = {};  
  if (marker !== null) {
    map.removeLayer(marker);
    marker = null;
  }
  if (circle !== null) {
    map.removeLayer(circle);
    circle = null;
  }
  // Reset game variables
  marker = null;
  circle = null;
  initialCity = '';
  initialCountry = '';
  initialCapital = '';
  initialLat = 0;
  initialLng = 0;


  window.addEventListener('load', () => {
    updateHighScoreList();
  });
  
  // Start New Game Function
  function startNewGame() {
    // ... (Your existing code)
  }
  // Reset result text
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = '';

  // Remove previous marker and circle
  if (marker !== null) {
    map.removeLayer(marker);
    marker = null;
  }
  if (circle !== null) {
    map.removeLayer(circle);
    circle = null;
  }
  const helloDiv = document.querySelector('.text-center2');
  if (helloDiv !== null) {
    helloDiv.textContent = 'Select a point on land and click on Guess to Begin';
  }
  
  // Initialize new game
  initializeGame();

}

// Add new game button and text to the HTML
const newGameButton = document.createElement('button');
newGameButton.id = 'new-game-button';
newGameButton.textContent = 'New Game';
newGameButton.addEventListener('click', startNewGame);
const textContainer = document.querySelector('.text-container');
textContainer.insertBefore(newGameButton, textContainer.firstChild);