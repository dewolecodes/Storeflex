import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import AdminSidebar from "@/domains/admin/components/sideBar";
import AdminShell from './AdminShell';
import { authOptions } from "@/shared/lib/authOptions";

export const metadata: Metadata = {
  title: "Admin",
};

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/");
  }
  return (
    // Keep metadata in this server file; render a client AdminShell to handle the interactive sidebar
    <AdminShell>
      {children}
    </AdminShell>
  );
};

export default AdminLayout;
