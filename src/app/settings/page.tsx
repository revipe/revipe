import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function SettingsProfilePage() {
  // Mock user data for now (auth disabled)
  const user = {
    firstName: "User",
    lastName: "",
    email: "user@example.com",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                First Name
              </label>
              <p className="mt-1 text-sm font-medium">{user.firstName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Last Name
              </label>
              <p className="mt-1 text-sm font-medium">{user.lastName || "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p className="mt-1 text-sm font-medium">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
