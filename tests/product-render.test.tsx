import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ModernWorkspace from "@/components/product/ModernWorkspace";
import { Sidebar, OrganizationBrand } from "@/components/product/shell";

describe("product rendering", () => {
  it("uses the unchanged canonical wordmark for navigation and ZQX organizations", () => {
    const sidebar=renderToStaticMarkup(<Sidebar control={false} page="Overview" navigate={()=>{}}/>);
    expect(sidebar).toContain('/logos/zqx.svg');
    expect(sidebar).not.toContain('zqx-mark.svg');
    const organization=renderToStaticMarkup(<OrganizationBrand name="ZQX Demo Workspace" initials="ZQ"/>);
    expect(organization).toContain('/logos/zqx.svg');
    expect(organization).toContain('width="80" height="40"');
  });
  it("does not invent a ZQX logo for customer organizations",()=>{
    const html=renderToStaticMarkup(<OrganizationBrand name="Fictional Studio" initials="FS"/>);
    expect(html).toContain('FS');
    expect(html).not.toContain('/logos/zqx.svg');
  });
  it("renders critical dashboard sections from the synthetic dataset", () => {
    const html = renderToStaticMarkup(<ModernWorkspace />);
    for (const label of [
      "Total customers",
      "Active leads",
      "$6,100",
      "$6,200",
      "Revenue trend",
      "Coming up",
      "Your customers",
      "Recent activity",
      "New customer",
      "New appointment",
      "Synthetic data only",
    ])
      expect(html).toContain(label);
  });
  it("renders operational navigation without governance links", () => {
    const html = renderToStaticMarkup(
      <Sidebar control={false} page="Overview" navigate={() => {}} />,
    );
    expect(html).toContain('href="#customers"');
    expect(html).toContain('href="#invoices"');
    expect(html).not.toContain('href="#control/organizations"');
    expect(html).toContain('aria-current="page"');
  });
  it("renders governance navigation separately from CRM", () => {
    const html = renderToStaticMarkup(
      <Sidebar control page="Organizations" navigate={() => {}} />,
    );
    expect(html).toContain('href="#control/organizations"');
    expect(html).toContain('href="#control/audit"');
    expect(html).not.toContain('href="#customers"');
  });
});
