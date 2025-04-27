import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  'https://api.therairai.com/v1/horoscope' \\
  -H 'Authorization: Bearer YOUR_API_KEY'`,
      javascript: `fetch('https://api.therairai.com/v1/horoscope', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
.then(response => response.json())
.then(data => console.log(data));`,
      python: `import requests

url = "https://api.therairai.com/v1/horoscope"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}

response = requests.get(url, headers=headers)
print(response.json())`
    },
    natalChart: {
      curl: `curl -X POST \\
  'https://api.therairai.com/v1/natal-chart' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "date": "1990-01-15",
  "time": "14:30:00",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "houseSystem": "placidus"
}'`,
      javascript: `fetch('https://api.therairai.com/v1/natal-chart', {
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

url = "https://api.therairai.com/v1/natal-chart"
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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Updated Header Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-primary mb-6">All The Cosmos in One API Key</h1>
              <p className="text-xl text-gray-700 mb-8">
                Access our comprehensive Swiss-Ephemeris powered API through a single endpoint.
                Your API key unlocks features based on your subscription plan.
              </p>
              <div className="flex justify-center gap-4">
                <Button>Get API Key</Button>
                <Button variant="outline">View Pricing</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Content */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row">
              {/* Updated Sidebar Navigation */}
              <div className="lg:w-1/4 mb-8 lg:mb-0">
                <div className="sticky top-24 bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-4">Quick Navigation</h3>
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
                  </ul>

                  <h3 className="font-semibold text-lg mt-8 mb-4">Endpoints by Plan</h3>
                  <ul className="space-y-4">
                    <li>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-700">Starter Plan</span>
                        <Badge variant="default">50K calls/mo</Badge>
                      </div>
                      <ul className="pl-4 space-y-1">
                        <li>
                          <a href="#natal-chart" className="text-gray-700 hover:text-primary">Natal Chart (Basic)</a>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-700">Growth Plan</span>
                        <Badge variant="secondary">200K calls/mo</Badge>
                      </div>
                      <ul className="pl-4 space-y-1">
                        <li>
                          <a href="#natal-chart-pro" className="text-gray-700 hover:text-primary">Natal Chart (Advanced)</a>
                        </li>
                        <li>
                          <a href="#transits" className="text-gray-700 hover:text-primary">Transit Calculations</a>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-700">Professional Plan</span>
                        <Badge variant="outline">750K calls/mo</Badge>
                      </div>
                      <ul className="pl-4 space-y-1">
                        <li>
                          <a href="#compatibility" className="text-gray-700 hover:text-primary">Compatibility Analysis</a>
                        </li>
                        <li>
                          <a href="#yearly-cycle" className="text-gray-700 hover:text-primary">Yearly Cycle Analysis</a>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="lg:w-3/4 lg:pl-12">
                <div id="getting-started" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Getting Started</h2>
                  <p className="mb-4">
                    Welcome to the Therairai API documentation. Our unified API provides comprehensive astrological calculations
                    powered by the Swiss Ephemeris, suitable for all types of applications.
                  </p>
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 className="font-semibold mb-4">Quick Start Guide</h3>
                    <ol className="list-decimal pl-6 space-y-2">
                      <li>Sign up and choose your subscription plan</li>
                      <li>Get your API key from the dashboard</li>
                      <li>Use your key to authenticate requests</li>
                      <li>Access endpoints based on your plan tier</li>
                    </ol>
                  </div>
                </div>

                <div id="authentication" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Authentication</h2>
                  <p className="mb-6">
                    All API requests require authentication using your API key. Your key grants access to endpoints based on your subscription plan.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
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

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <p className="text-yellow-700">
                      <span className="font-bold">Important:</span> Keep your API key secure and never expose it in client-side code.
                    </p>
                  </div>
                </div>

                <div id="endpoints" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">API Endpoints</h2>
                  <p className="mb-6">
                    All endpoints are accessible through <code className="bg-gray-100 px-2 py-1 rounded">https://api.therairai.com/v1/</code>
                  </p>

                  <div id="natal-chart" className="mb-12">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-2xl font-bold">Natal Chart</h3>
                      <Badge variant="default">Starter Plan</Badge>
                    </div>
                    
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
                  </div>
                </div>

                {/* Rate Limits Section */}
                <div id="rate-limits" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Rate Limits</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Starter Plan</h4>
                        <p className="text-sm text-gray-600">Basic natal chart calculations</p>
                      </div>
                      <Badge variant="default">50,000 calls/month</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Growth Plan</h4>
                        <p className="text-sm text-gray-600">Advanced calculations & transit forecasts</p>
                      </div>
                      <Badge variant="secondary">200,000 calls/month</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Professional Plan</h4>
                        <p className="text-sm text-gray-600">Full feature access</p>
                      </div>
                      <Badge variant="outline">750,000 calls/month</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-16 text-center text-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6">Ready to harness the power of the cosmos?</h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl">
              Start your free 14-day trial now — no credit card required.
            </p>
            <Button className="bg-white text-primary hover:bg-gray-100 px-8 py-6 text-lg">
              Start Free Trial
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Documentation;
