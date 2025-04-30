
export const codeSnippets = {
  authentication: {
    curl: `curl -X GET \\
  'https://api.theriaapi.com/api/horoscope' \\
  -H 'Authorization: Bearer yourtheriaapikeyhere'`,
    javascript: `fetch('https://api.theriaapi.com/api/horoscope', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer yourtheriaapikeyhere'
  }
})
.then(response => response.json())
.then(data => console.log(data));`,
    python: `import requests

url = "https://api.theriaapi.com/api/horoscope"
headers = {
    "Authorization": "Bearer yourtheriaapikeyhere"
}

response = requests.get(url, headers=headers)
print(response.json())`
  },
  natalChart: {
    curl: `curl -X POST \\
  'https://api.theriaapi.com/api/natal-chart' \\
  -H 'Authorization: Bearer yourtheriaapikeyhere' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "date": "1990-01-15",
  "time": "14:30:00",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "houseSystem": "placidus"
}'`,
    javascript: `fetch('https://api.theriaapi.com/api/natal-chart', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer yourtheriaapikeyhere',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: "1990-01-15",
    time: "14:30:00",
    latitude: 40.7128,
    longitude: -74.0060,
    houseSystem: "placidus"
  })
})
.then(response => response.json())
.then(data => console.log(data));`,
    python: `import requests
import json

url = "https://api.theriaapi.com/api/natal-chart"
headers = {
    "Authorization": "Bearer yourtheriaapikeyhere",
    "Content-Type": "application/json"
}
payload = {
    "date": "1990-01-15",
    "time": "14:30:00",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "houseSystem": "placidus"
}

response = requests.post(url, headers=headers, data=json.dumps(payload))
print(response.json())`
  }
};

// Documentation content organized by section
export const docContent = {
  header: {
    title: "All The Cosmos in One API Key",
    description: "Access our comprehensive Swiss-Ephemeris powered API through a single endpoint. Your API key unlocks features based on your subscription plan."
  },
  cta: {
    title: "Ready to harness the power of the cosmos?",
    description: "Start your free 14-day trial now — no credit card required."
  }
};
