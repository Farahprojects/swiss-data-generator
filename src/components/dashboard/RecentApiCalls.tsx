
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ApiCall = {
  id: number;
  endpoint: string;
  status: number;
  timestamp: string;
  responseTime: string;
};

const recentCalls: ApiCall[] = [
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

export const RecentApiCalls = () => {
  return (
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
  );
};
