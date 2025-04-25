
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Dashboard = () => {
  const [apiKey] = useState("thp_2156a4f9cb83e7d21f7c8b6e9d4");
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  const toggleKeyVisibility = () => {
    setIsKeyVisible(!isKeyVisible);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    alert("API key copied to clipboard!");
  };

  const apiUsage = {
    total: 10000,
    used: 1247,
    percentage: 12.47,
  };

  const recentCalls = [
    {
      id: 1,
      endpoint: "/natal-chart",
      status: 200,
      timestamp: "2023-04-25 10:23:15",
      responseTime: "187ms",
    },
    {
      id: 2,
      endpoint: "/transits",
      status: 200,
      timestamp: "2023-04-25 10:22:48",
      responseTime: "203ms",
    },
    {
      id: 3,
      endpoint: "/planets",
      status: 200,
      timestamp: "2023-04-25 10:20:12",
      responseTime: "156ms",
    },
    {
      id: 4,
      endpoint: "/synastry",
      status: 400,
      timestamp: "2023-04-25 10:15:36",
      responseTime: "121ms",
    },
    {
      id: 5,
      endpoint: "/natal-chart",
      status: 200,
      timestamp: "2023-04-25 10:10:22",
      responseTime: "192ms",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
          
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Current Plan</CardTitle>
                    <CardDescription>Professional</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">$79/month</p>
                    <p className="text-sm text-gray-500 mt-1">Next billing: May 25, 2023</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">Upgrade Plan</Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">API Usage</CardTitle>
                    <CardDescription>This month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Used</span>
                        <span className="font-medium">{apiUsage.used.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${apiUsage.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-primary font-medium">{apiUsage.percentage}%</span>
                        <span className="text-gray-500">Limit: {apiUsage.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">View Details</Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Support</CardTitle>
                    <CardDescription>Need help?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">Having an issue or question about our API?</p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">Documentation</Button>
                    <Button>Contact Support</Button>
                  </CardFooter>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent API Calls</CardTitle>
                  <CardDescription>View your latest API activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Endpoint</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Time</th>
                          <th className="text-left py-3 px-4 font-medium">Response Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentCalls.map((call) => (
                          <tr key={call.id} className="border-b">
                            <td className="py-3 px-4 font-mono">{call.endpoint}</td>
                            <td className="py-3 px-4">
                              <span 
                                className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                  call.status === 200 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {call.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500">{call.timestamp}</td>
                            <td className="py-3 px-4">{call.responseTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">View All Activity</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="api-keys" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your API Keys</CardTitle>
                  <CardDescription>Manage your API authentication keys</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Live API Key
                      </label>
                      <div className="flex">
                        <div className="relative flex-grow">
                          <input
                            type={isKeyVisible ? "text" : "password"}
                            value={apiKey}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={toggleKeyVisibility}
                          className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 text-sm font-medium hover:bg-gray-200"
                        >
                          {isKeyVisible ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          onClick={copyApiKey}
                          className="px-4 py-2 bg-gray-800 text-white rounded-r-md text-sm font-medium hover:bg-gray-700"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        This key is used to authenticate your API requests. Keep it secure!
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <Button variant="outline">Regenerate API Key</Button>
                      <p className="mt-2 text-sm text-gray-500">
                        Regenerating will invalidate your current key immediately.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Test Mode</CardTitle>
                  <CardDescription>API keys for development and testing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Test mode allows you to test your integration without making real API calls or affecting your usage limits.
                    </p>
                    <Button>Generate Test API Key</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="usage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Usage</CardTitle>
                  <CardDescription>Monitor your API consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-2">Current Period (Apr 1 - Apr 30)</h3>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Used</span>
                          <span className="font-medium">{apiUsage.used.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-primary h-2.5 rounded-full" 
                            style={{ width: `${apiUsage.percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-primary font-medium">{apiUsage.percentage}%</span>
                          <span className="text-gray-500">Limit: {apiUsage.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <h3 className="font-medium mb-4">Usage by Endpoint</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">/natal-chart</span>
                            <span className="text-gray-500">542 calls</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: "43%" }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">/transits</span>
                            <span className="text-gray-500">386 calls</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: "31%" }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">/synastry</span>
                            <span className="text-gray-500">174 calls</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: "14%" }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">/planets</span>
                            <span className="text-gray-500">145 calls</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "12%" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">Download Usage Report</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Manage your plan and billing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <div>
                        <h3 className="font-medium">Professional Plan</h3>
                        <p className="text-sm text-gray-500">50,000 API calls/month</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">$79/month</p>
                        <p className="text-sm text-gray-500">Next billing: May 25, 2023</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 space-y-4">
                      <div className="flex justify-between">
                        <Button variant="outline">Change Plan</Button>
                        <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
                          Cancel Subscription
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Manage your payment settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-8 bg-gray-800 rounded mr-4"></div>
                        <span>•••• •••• •••• 4242</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Expires 09/25</span>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button variant="outline">Update Payment Method</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>View your previous invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Description</th>
                          <th className="text-left py-3 px-4 font-medium">Amount</th>
                          <th className="text-left py-3 px-4 font-medium">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4">Apr 25, 2023</td>
                          <td className="py-3 px-4">Professional Plan - Monthly</td>
                          <td className="py-3 px-4">$79.00</td>
                          <td className="py-3 px-4">
                            <a href="#" className="text-primary hover:underline">PDF</a>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Mar 25, 2023</td>
                          <td className="py-3 px-4">Professional Plan - Monthly</td>
                          <td className="py-3 px-4">$79.00</td>
                          <td className="py-3 px-4">
                            <a href="#" className="text-primary hover:underline">PDF</a>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Feb 25, 2023</td>
                          <td className="py-3 px-4">Professional Plan - Monthly</td>
                          <td className="py-3 px-4">$79.00</td>
                          <td className="py-3 px-4">
                            <a href="#" className="text-primary hover:underline">PDF</a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
