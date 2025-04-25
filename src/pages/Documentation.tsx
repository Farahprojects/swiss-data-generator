import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Documentation = () => {
  const [copySuccess, setCopySuccess] = useState("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess("Copied!");
    setTimeout(() => {
      setCopySuccess("");
    }, 2000);
  };

  const codeSnippets = {
    authentication: {
      curl: `curl -X GET \\
  'https://api.theraiapi.com/v1/natal-chart' \\
  -H 'Authorization: Bearer YOUR_API_KEY'`,
      javascript: `fetch('https://api.theraiapi.com/v1/natal-chart', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
.then(response => response.json())
.then(data => console.log(data));`,
      python: `import requests

url = "https://api.theraiapi.com/v1/natal-chart"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}

response = requests.get(url, headers=headers)
print(response.json())`
    },
    natalChart: {
      curl: `curl -X POST \\
  'https://api.theraiapi.com/v1/natal-chart' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "date": "1990-01-15",
  "time": "14:30:00",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "houseSystem": "placidus"
}'`,
      javascript: `fetch('https://api.theraiapi.com/v1/natal-chart', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
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

url = "https://api.theraiapi.com/v1/natal-chart"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header Section */}
        <section className="bg-accent py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-6">API Documentation</h1>
              <p className="text-xl text-gray-700 mb-8">
                Everything you need to integrate Theraiapi into your applications.
              </p>
              <div className="flex justify-center">
                <Button className="mr-4">Get API Key</Button>
                <Button variant="outline">API Reference</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Content */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row">
              {/* Sidebar Navigation */}
              <div className="lg:w-1/4 mb-8 lg:mb-0">
                <div className="sticky top-24 bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-4">Documentation</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="#getting-started" className="text-primary hover:underline">Getting Started</a>
                    </li>
                    <li>
                      <a href="#authentication" className="text-primary hover:underline">Authentication</a>
                    </li>
                    <li>
                      <a href="#endpoints" className="text-primary hover:underline">API Endpoints</a>
                    </li>
                    <li>
                      <a href="#examples" className="text-primary hover:underline">Example Requests</a>
                    </li>
                    <li>
                      <a href="#errors" className="text-primary hover:underline">Error Handling</a>
                    </li>
                    <li>
                      <a href="#rate-limits" className="text-primary hover:underline">Rate Limits</a>
                    </li>
                  </ul>

                  <h3 className="font-semibold text-lg mt-8 mb-4">API Reference</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="#natal-chart" className="text-gray-700 hover:text-primary">Natal Chart</a>
                    </li>
                    <li>
                      <a href="#transits" className="text-gray-700 hover:text-primary">Transits</a>
                    </li>
                    <li>
                      <a href="#synastry" className="text-gray-700 hover:text-primary">Synastry</a>
                    </li>
                    <li>
                      <a href="#progressions" className="text-gray-700 hover:text-primary">Progressions</a>
                    </li>
                    <li>
                      <a href="#planets" className="text-gray-700 hover:text-primary">Planetary Positions</a>
                    </li>
                    <li>
                      <a href="#moon-phases" className="text-gray-700 hover:text-primary">Moon Phases</a>
                    </li>
                    <li>
                      <a href="#returns" className="text-gray-700 hover:text-primary">Return Charts</a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:w-3/4 lg:pl-12">
                <div id="getting-started" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Getting Started</h2>
                  <p className="mb-4">
                    Welcome to the Theraiapi documentation. Our API provides accurate astrological calculations powered by the Swiss Ephemeris, suitable for professional applications, astrologers, and developers.
                  </p>
                  <p className="mb-4">
                    To get started with our API:
                  </p>
                  <ol className="list-decimal pl-6 mb-6 space-y-2">
                    <li>Sign up for an account and choose a subscription plan</li>
                    <li>Generate an API key from your dashboard</li>
                    <li>Use the API key to authenticate your requests</li>
                    <li>Start making calls to our endpoints</li>
                  </ol>
                  <p>
                    Our API is RESTful and returns responses in JSON format. All API requests must be made over HTTPS.
                  </p>
                </div>

                <div id="authentication" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Authentication</h2>
                  <p className="mb-6">
                    All API requests require authentication using your API key. You can obtain an API key from your dashboard after signing up.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold mb-4">Authentication Method</h3>
                    <p className="mb-4">
                      Include your API key in the Authorization header of your HTTP request:
                    </p>

                    <div className="mb-4">
                      <Tabs defaultValue="curl">
                        <TabsList className="mb-2">
                          <TabsTrigger value="curl">cURL</TabsTrigger>
                          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                          <TabsTrigger value="python">Python</TabsTrigger>
                        </TabsList>
                        <TabsContent value="curl">
                          <div className="relative">
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                              <code>{codeSnippets.authentication.curl}</code>
                            </pre>
                            <button
                              onClick={() => copyToClipboard(codeSnippets.authentication.curl)}
                              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                            >
                              {copySuccess || "Copy"}
                            </button>
                          </div>
                        </TabsContent>
                        <TabsContent value="javascript">
                          <div className="relative">
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                              <code>{codeSnippets.authentication.javascript}</code>
                            </pre>
                            <button
                              onClick={() => copyToClipboard(codeSnippets.authentication.javascript)}
                              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                            >
                              {copySuccess || "Copy"}
                            </button>
                          </div>
                        </TabsContent>
                        <TabsContent value="python">
                          <div className="relative">
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                              <code>{codeSnippets.authentication.python}</code>
                            </pre>
                            <button
                              onClick={() => copyToClipboard(codeSnippets.authentication.python)}
                              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                            >
                              {copySuccess || "Copy"}
                            </button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-yellow-700">
                          <span className="font-bold">Important:</span> Keep your API key secure. Do not expose it in client-side code.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div id="endpoints" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">API Endpoints</h2>
                  <p className="mb-6">
                    The Theraiapi provides the following main endpoints. All endpoints are relative to the base URL: <code className="bg-gray-100 px-2 py-1 rounded">https://api.theraiapi.com/v1/</code>
                  </p>

                  <table className="min-w-full border border-gray-200 mb-8">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 border-b border-r text-left">Endpoint</th>
                        <th className="px-4 py-2 border-b border-r text-left">Method</th>
                        <th className="px-4 py-2 border-b text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>/natal-chart</code></td>
                        <td className="px-4 py-2 border-b border-r">POST</td>
                        <td className="px-4 py-2 border-b">Calculate a natal chart based on birth data</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>/transits</code></td>
                        <td className="px-4 py-2 border-b border-r">POST</td>
                        <td className="px-4 py-2 border-b">Calculate transits for a specific date</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>/synastry</code></td>
                        <td className="px-4 py-2 border-b border-r">POST</td>
                        <td className="px-4 py-2 border-b">Calculate synastry between two charts</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>/progressions</code></td>
                        <td className="px-4 py-2 border-b border-r">POST</td>
                        <td className="px-4 py-2 border-b">Calculate progressed charts</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>/planets</code></td>
                        <td className="px-4 py-2 border-b border-r">POST</td>
                        <td className="px-4 py-2 border-b">Get planetary positions for a date</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>/moon-phases</code></td>
                        <td className="px-4 py-2 border-b border-r">POST</td>
                        <td className="px-4 py-2 border-b">Calculate moon phases</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>/returns</code></td>
                        <td className="px-4 py-2 border-b border-r">POST</td>
                        <td className="px-4 py-2 border-b">Calculate planetary returns</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div id="examples" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Example Requests</h2>
                  
                  <div id="natal-chart" className="mb-10">
                    <h3 className="text-xl font-semibold mb-4">Natal Chart Request</h3>
                    <p className="mb-4">
                      This example shows how to request a natal chart calculation:
                    </p>

                    <Tabs defaultValue="curl">
                      <TabsList className="mb-2">
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                      </TabsList>
                      <TabsContent value="curl">
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <code>{codeSnippets.natalChart.curl}</code>
                          </pre>
                          <button
                            onClick={() => copyToClipboard(codeSnippets.natalChart.curl)}
                            className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                          >
                            {copySuccess || "Copy"}
                          </button>
                        </div>
                      </TabsContent>
                      <TabsContent value="javascript">
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <code>{codeSnippets.natalChart.javascript}</code>
                          </pre>
                          <button
                            onClick={() => copyToClipboard(codeSnippets.natalChart.javascript)}
                            className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                          >
                            {copySuccess || "Copy"}
                          </button>
                        </div>
                      </TabsContent>
                      <TabsContent value="python">
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <code>{codeSnippets.natalChart.python}</code>
                          </pre>
                          <button
                            onClick={() => copyToClipboard(codeSnippets.natalChart.python)}
                            className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                          >
                            {copySuccess || "Copy"}
                          </button>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <h4 className="font-semibold mt-6 mb-2">Example Response:</h4>
                    <div className="relative">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`{
  "success": true,
  "data": {
    "sun": {
      "sign": "Capricorn",
      "degree": 25.34,
      "house": 6,
      "isRetrograde": false
    },
    "moon": {
      "sign": "Taurus",
      "degree": 15.78,
      "house": 10,
      "isRetrograde": false
    },
    "mercury": {
      "sign": "Capricorn",
      "degree": 12.56,
      "house": 5,
      "isRetrograde": false
    },
    // Other planets and points...
    "houses": [
      {
        "number": 1,
        "sign": "Leo",
        "degree": 15.22
      },
      // Additional houses...
    ],
    "aspects": [
      {
        "aspectType": "conjunction",
        "orb": 1.23,
        "planet1": "sun",
        "planet2": "venus",
        "precision": "exact"
      },
      // Additional aspects...
    ]
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div id="errors" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Error Handling</h2>
                  <p className="mb-6">
                    When an error occurs, the API will return an appropriate HTTP status code along with a JSON response containing details about the error.
                  </p>
                  
                  <table className="min-w-full border border-gray-200 mb-8">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 border-b border-r text-left">Status Code</th>
                        <th className="px-4 py-2 border-b text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>400 Bad Request</code></td>
                        <td className="px-4 py-2 border-b">The request was invalid or missing required parameters</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>401 Unauthorized</code></td>
                        <td className="px-4 py-2 border-b">Authentication failed or API key is missing</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>403 Forbidden</code></td>
                        <td className="px-4 py-2 border-b">Your API key doesn't have permission to access this resource</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>429 Too Many Requests</code></td>
                        <td className="px-4 py-2 border-b">You've exceeded your rate limit</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-b border-r"><code>500 Server Error</code></td>
                        <td className="px-4 py-2 border-b">Something went wrong on our end</td>
                      </tr>
                    </tbody>
                  </table>

                  <h3 className="font-semibold mb-2">Example Error Response:</h3>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <code>{`{
  "success": false,
  "error": {
    "code": "invalid_parameters",
    "message": "The latitude parameter must be between -90 and 90 degrees",
    "details": {
      "parameter": "latitude",
      "provided": "95.5",
      "allowed": "-90 to 90"
    }
  }
}`}</code>
                    </pre>
                  </div>
                </div>

                <div id="rate-limits" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Rate Limits</h2>
                  <p className="mb-4">
                    API requests are subject to rate limits based on your subscription plan:
                  </p>
                  <ul className="list-disc pl-6 mb-6 space-y-2">
                    <li><strong>Starter:</strong> 10,000 requests/month (10 requests/second)</li>
                    <li><strong>Professional:</strong> 50,000 requests/month (20 requests/second)</li>
                    <li><strong>Enterprise:</strong> Unlimited requests (custom rate limits)</li>
                  </ul>

                  <p className="mb-4">
                    Rate limit information is included in the headers of each response:
                  </p>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
                    <code>{`X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9990
X-RateLimit-Reset: 1628697600`}</code>
                  </pre>

                  <p>
                    If you exceed your rate limit, you'll receive a 429 Too Many Requests response. You can contact support to upgrade your plan if you need higher limits.
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg mb-8">
                  <h3 className="font-semibold mb-4">Need more help?</h3>
                  <p className="mb-4">
                    If you have any questions or need assistance with our API, please contact our support team.
                  </p>
                  <div className="flex space-x-4">
                    <Button variant="outline">Contact Support</Button>
                    <Button>Join Community</Button>
                  </div>
                </div>
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
