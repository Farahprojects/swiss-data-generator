
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mail, FileText, CreditCard } from "lucide-react";

export const QuickActions = () => {
  const actions = [
    {
      title: "Add New Client",
      href: "/dashboard/clients?action=new",
      icon: Plus,
      variant: "default" as const
    },
    {
      title: "View Messages",
      href: "/dashboard/messages",
      icon: Mail,
      variant: "outline" as const
    },
    {
      title: "Create Report",
      href: "/dashboard/reports/create", // Ensure this is correct!
      icon: FileText,
      variant: "outline" as const
    },
    {
      title: "Manage Billing",
      href: "/dashboard/billing",
      icon: CreditCard,
      variant: "outline" as const
    }
  ];

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            asChild
            variant={action.variant}
            className="w-full justify-start"
            size="sm"
          >
            <Link to={action.href}>
              <action.icon className="h-4 w-4 mr-2" />
              {action.title}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
