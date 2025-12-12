import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 pt-20 md:p-8 md:pt-20">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        {/* Content with nav */}
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Navigation */}
          <SettingsNav />

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
