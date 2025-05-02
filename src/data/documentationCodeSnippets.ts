
export const codeSnippets = {
  curl: `curl -X POST https://api.theraiapi.com/swiss \\
  -H "Authorization: Bearer <YOUR-API-KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
        "request":      "body_matrix",
        "birth_date":   "1981-01-15",
        "birth_time":   "06:38",
        "location":     "Melbourne, Australia",
        "system":       "western"
      }'`,
      
  python: `import requests
import json

# --- Configuration ---
api_url = "https://api.theraiapi.com/swiss"
# IMPORTANT: Replace with your actual API key
api_key = "<YOUR-API-KEY>"
# -------------------

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "request":      "body_matrix",
    "birth_date":   "1981-01-15",
    "birth_time":   "06:38",
    "location":     "Melbourne, Australia",
    "system":       "western"
}

try:
    # Make the POST request
    response = requests.post(api_url, headers=headers, json=payload)

    # Raise an exception for bad status codes (4xx or 5xx)
    response.raise_for_status()

    # Parse the JSON response
    data = response.json()

    # Pretty print the JSON output
    print(json.dumps(data, indent=2))

except requests.exceptions.RequestException as e:
    print(f"An error occurred: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"Status Code: {e.response.status_code}")
        print(f"Response Body: {e.response.text}")`,
    
  java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class TheRaiApiQuickStart {

    // --- Configuration ---
    private static final String API_URL = "https://api.theraiapi.com/swiss";
    // IMPORTANT: Replace with your actual API key
    private static final String API_KEY = "<YOUR-API-KEY>";
    // -------------------

    public static void main(String[] args) throws Exception { // Added 'throws' for brevity, use try-catch in production

        // 1. Define the JSON payload
        String jsonPayload = """
                {
                    "request":      "body_matrix",
                    "birth_date":   "1981-01-15",
                    "birth_time":   "06:38",
                    "location":     "Melbourne, Australia",
                    "system":       "western"
                }
                """;

        // 2. Create an HttpClient instance
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10)) // Optional: Set connection timeout
                .build();

        // 3. Build the HttpRequest
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .timeout(Duration.ofSeconds(30)) // Optional: Set request timeout
                .header("Authorization", "Bearer " + API_KEY)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        System.out.println("Sending request to: " + API_URL);
        // System.out.println("Payload: " + jsonPayload); // Uncomment to debug payload

        try {
            // 4. Send the request and get the response
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            // 5. Process the response
            System.out.println("Status Code: " + response.statusCode());
            System.out.println("Response Body:");
            // Basic pretty printing attempt for JSON - consider using a library like Jackson or Gson for robust parsing
            String responseBody = response.body();
            if (responseBody != null && responseBody.startsWith("{")) {
                 // Simple indent for readability, not full JSON parsing
                 System.out.println(responseBody.replace(",", ",\\n ")
                                                .replace("{", "{\\n ")
                                                .replace("}", "\\n}"));
            } else {
                 System.out.println(responseBody);
            }
        } catch (Exception e) {
            System.err.println("An error occurred: " + e.getMessage());
            e.printStackTrace();
        }
    }
}`,

  jsonResponse: `{
  "circadian_window": "Dip (PM)",
  "datetime_utc": "2025-05-02T06:13:21+00:00",
  "lunar_phase": "First Quarter",
  "mars_to_natal": [
    {
      "aspect": "Sextile",
      "orb": 4.06,
      "planet": "Jupiter"
    },
    {
      "aspect": "Opposition",
      "orb": 5.54,
      "planet": "Mars"
    },
    {
      "aspect": "Opposition",
      "orb": 2.54,
      "planet": "Mercury"
    },
    {
      "aspect": "Sextile",
      "orb": 3.6,
      "planet": "Saturn"
    },
    {
      "aspect": "Conjunction",
      "orb": 4.83,
      "planet": "TrueNode"
    }
  ],
  "moon_to_natal": {
    "ASC": 165.04,
    "Mars": 151.71,
    "Moon": 60.45
  },
  "rulers": {
    "day": "Venus",
    "hour": "Saturn"
  }
}`
};
