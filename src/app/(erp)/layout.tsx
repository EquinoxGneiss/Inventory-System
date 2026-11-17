import { ERPAppShell } from "@/components/erp/app-shell/erp-app-shell";

export default function ERPLayout({ children }: { children: React.ReactNode }) {
  return <ERPAppShell>{children}</ERPAppShell>;
}
