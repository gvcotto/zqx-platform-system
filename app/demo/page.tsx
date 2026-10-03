import { notFound } from "next/navigation";
import ModernWorkspace from "@/components/product/ModernWorkspace";
import { demoAllowed } from "@/lib/demo/model";
import "./product.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ZQX · Product demo",
  robots: { index: false, follow: false },
};
export default function DemoPage() {
  // Independent synthetic sandbox, not an authentication/authorization bypass.
  if (!demoAllowed(process.env)) notFound();
  return <ModernWorkspace />;
}
