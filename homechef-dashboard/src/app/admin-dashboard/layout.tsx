import { DialogProvider } from "@/components/DialogProvider";
import { Sidebar } from "@/components/Sidebar";
import { DateRangeProvider } from "@/data/analytics";

export default function AdminLayout({ children }: LayoutProps<"/admin-dashboard">) {
  return (
    <DialogProvider>
      <DateRangeProvider>
        <div className="min-h-screen bg-ground lg:flex">
          <Sidebar />
          <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </DateRangeProvider>
    </DialogProvider>
  );
}
