
import { Button } from "@/components/ui/button";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Documentation = () => {
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  // Redirect authenticated users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const curlCommand = `curl -X POST https://api.theraiapi.com/swiss \\
  -H "Authorization: Bearer <YOUR-API-KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
        "request":      "body_matrix",
        "birth_date":   "1981-01-15",
        "birth_time":   "06:38",
        "location":     "Melbourne, Australia",
        "system":       "western"
      }'`;

  const pythonCode = `import requests
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
        print(f"Response Body: {e.response.text}")`;

  const javaCode = `import java.net.URI;
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
}`;

  const jsonResponse = `{
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
}`;

  return (
    <div className="flex min-h-screen flex-col">
      <UnifiedNavigation />
      
      <main className="flex-grow">
        {/* Header Section */}
        <section className="py-16 bg-gradient-to-b from-primary/10 to-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-bold text-primary mb-6">Quick Start: Your First API Call</h1>
              <p className="text-xl text-gray-700 mb-4">
                Ready to dive in? This guide walks you through making your first call to the TheRaiAPI using curl. 
                We'll request a "Body Matrix" calculation, a common starting point.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
                <p className="text-yellow-800">
                  <span className="font-bold">Prerequisites:</span>
                </p>
                <ul className="list-disc ml-6 mt-2 text-yellow-800">
                  <li>You have your unique API Key. <Button variant="link" className="p-0 h-auto text-primary font-semibold">Get one from Your Account Page</Button>.</li>
                  <li>You have curl installed (common on Linux/macOS, available for Windows).</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Content */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="space-y-12">
              {/* Step 1 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">1. The Request: Get a Body Matrix</h2>
                <p className="mb-4">
                  Below are examples of how to make the exact same API request using different languages. Choose the tab that matches your preferred tool or language.
                </p>
                
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="w-full mb-2 grid grid-cols-3">
                    <TabsTrigger value="curl">curl (Command Line)</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="java">Java</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="curl">
                    <p className="mb-2">This is the most direct way to test from your terminal.</p>
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                        <span className="text-gray-200 text-sm font-medium">Bash</span>
                        <button 
                          onClick={() => copyToClipboard(curlCommand, "curl")} 
                          className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
                        >
                          {copied === "curl" ? (
                            <>
                              <Check className="h-4 w-4" /> 
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" /> 
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-gray-100 text-sm">
                        <code>{curlCommand}</code>
                      </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="python">
                    <p className="mb-2">This example uses the popular requests library. If you don't have it, install it using pip: <code className="bg-gray-100 px-1 rounded">pip install requests</code></p>
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                        <span className="text-gray-200 text-sm font-medium">Python</span>
                        <button 
                          onClick={() => copyToClipboard(pythonCode, "python")} 
                          className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
                        >
                          {copied === "python" ? (
                            <>
                              <Check className="h-4 w-4" /> 
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" /> 
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-gray-100 text-sm">
                        <code>{pythonCode}</code>
                      </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="java">
                    <p className="mb-2">This example uses Java's modern, built-in HTTP client, available since Java 11.</p>
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                        <span className="text-gray-200 text-sm font-medium">Java</span>
                        <button 
                          onClick={() => copyToClipboard(javaCode, "java")} 
                          className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
                        >
                          {copied === "java" ? (
                            <>
                              <Check className="h-4 w-4" /> 
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" /> 
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-gray-100 text-sm">
                        <code>{javaCode}</code>
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-6">
                  <h3 className="font-semibold text-lg mb-2">What this command does:</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><code className="bg-gray-100 px-1">-X POST</code>: Specifies the HTTP method (required for sending data).</li>
                    <li><code className="bg-gray-100 px-1">https://api.theraiapi.com/swiss</code>: The endpoint URL for Swiss Ephemeris based calculations.</li>
                    <li><code className="bg-gray-100 px-1">-H "Authorization: Bearer &lt;YOUR-API-KEY&gt;"</code>: Authenticates your request. Remember to replace the placeholder!</li>
                    <li><code className="bg-gray-100 px-1">-H "Content-Type: application/json"</code>: Tells the API you're sending JSON data.</li>
                    <li><code className="bg-gray-100 px-1">-d &apos;{"{...}"}&apos;</code>: Contains the JSON payload with your request details.</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Understanding the Request Body</h2>
                <p className="mb-4">
                  The JSON data (<code className="bg-gray-100 px-2 py-1 rounded">-d</code>) tells the API what you want and for whom:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><code className="bg-gray-100 px-1">"request": "body_matrix"</code>: Specifies the desired calculation/product. This is the key field to change when calling other endpoints.</li>
                  <li><code className="bg-gray-100 px-1">"birth_date": "1981-01-15"</code>: The date of birth in YYYY-MM-DD format.</li>
                  <li><code className="bg-gray-100 px-1">"birth_time": "06:38"</code>: The time of birth in 24-hour HH:MM format (local time for the location).</li>
                  <li><code className="bg-gray-100 px-1">"location": "Melbourne, Australia"</code>: A free-text place name. The API will automatically convert this to geographic coordinates (latitude/longitude).</li>
                  <li><code className="bg-gray-100 px-1">"system": "western"</code>: Specifies the astrological system (use "vedic" for the Lahiri sidereal system).</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">3. What Happens Next (Simplified)</h2>
                <p className="mb-4">
                  When you send this request:
                </p>
                <ol className="list-decimal ml-6 space-y-2">
                  <li><span className="font-medium">Authentication</span>: The API gateway checks if your API key is valid.</li>
                  <li><span className="font-medium">Interpretation</span>: It identifies the "request": "body_matrix" and understands the birth details.</li>
                  <li><span className="font-medium">Geocoding</span>: "Melbourne, Australia" is converted into latitude and longitude (using cached results where possible).</li>
                  <li><span className="font-medium">Calculation</span>: The Swiss Ephemeris engine calculates the necessary astrological data (natal chart, transits, etc.) and applies the specific Body Matrix logic.</li>
                  <li><span className="font-medium">Response</span>: The final results are packaged as a JSON object and sent back to you.</li>
                </ol>
              </div>

              {/* Step 4 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Example Response</h2>
                <p className="mb-4">
                  You'll receive a JSON response containing the results. Here's an actual response received from the exact curl command shown above (when run targeting a specific moment):
                </p>
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <span className="text-gray-200 text-sm font-medium">JSON</span>
                    <button 
                      onClick={() => copyToClipboard(jsonResponse, "json")} 
                      className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
                    >
                      {copied === "json" ? (
                        <>
                          <Check className="h-4 w-4" /> 
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> 
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-gray-100 text-sm">
                    <code>{jsonResponse}</code>
                  </pre>
                </div>
                <p className="mt-4 text-sm text-gray-600 italic">
                  Note: The exact data (phases, aspects, rulers, timestamps) will naturally vary depending on when you make the call or if you specify a different analysis_date. However, the structure of the response for a body_matrix request will generally follow this pattern.
                </p>
              </div>

              {/* Step 5 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Customizing Your Request (Optional Shortcuts)</h2>
                <p className="mb-4">
                  Need more control? Here are common adjustments:
                </p>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Skip Geocoding: Provide precise coordinates instead of a place name:</h3>
                    <div className="bg-gray-100 p-3 rounded">
                      <code>
                        "latitude": -37.8136,<br />
                        "longitude": 144.9631
                      </code>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Analyze a Specific Date/Time: Calculate for a moment other than now:</h3>
                    <div className="bg-gray-100 p-3 rounded">
                      <code>
                        "analysis_date": "2025-12-31",<br />
                        "analysis_time": "08:00" // Optional, defaults to noon if date is set but not time
                      </code>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Use Vedic/Lahiri System: Switch the astrological system:</h3>
                    <div className="bg-gray-100 p-3 rounded">
                      <code>"system": "vedic"</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 6 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Exploring Other Endpoints</h2>
                <p className="mb-4">
                  This fundamental pattern works for nearly all API calls:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Use the correct Endpoint URL (e.g., <code className="bg-gray-100 px-1">https://api.theriaapi.com/swiss</code>).</li>
                  <li>Include your API Key in the Authorization header.</li>
                  <li>Send a JSON payload (<code className="bg-gray-100 px-1">-d</code>) containing:
                    <ul className="list-disc ml-6 mt-2">
                      <li>The desired <code className="bg-gray-100 px-1">"request": "..."</code> value (e.g., "natal", "transits", "relationship").</li>
                      <li>The required birth data (birth_date, birth_time, location or lat/lon).</li>
                      <li>Any endpoint-specific parameters.</li>
                    </ul>
                  </li>
                </ul>
                <p className="mt-4 font-medium text-lg text-primary">Now you're ready to explore!</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Documentation;
