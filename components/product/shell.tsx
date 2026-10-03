"use client";
// product-localization-applied
import {ProductText,useProductLocale} from './locale';
import { useState, type ReactNode } from "react";
import {
  clientNavigation,
  controlNavigation,
  organizations,
} from "@/lib/demo/model";
import { Avatar, Icon, Modal, SearchInput } from "./ui";
import type { WorkspaceOrganization } from "@/lib/application/workspace";
import {ProductLanguageSwitcher,useProductLocale as useLocale} from './locale';

export function OrganizationBrand({name,initials}:{name:string;initials:string}) {
 return ['ZQX Demo Workspace','ZQX Consulting'].includes(name)
  ? <img className="pq-organization-logo" src="/logos/zqx.svg" alt="ZQX" width="80" height="40"/>
  : <span className="pq-org-icon" aria-hidden="true">{initials}</span>;
}

export function Sidebar({
  control,
  page,
  navigate,
  close,
  remote=false,
  canControl=true,
}: {
  control: boolean;
  page: string;
  navigate: (page: string, control?: boolean) => void;
  close?: () => void;
  remote?:boolean;
  canControl?:boolean;
}) {
  const {t}=useProductLocale();

  const groups = control ? controlNavigation : clientNavigation;
  return (
    <>
      <a
        className="pq-brand"
        href="#overview"
        onClick={(e) => {
          e.preventDefault();
          navigate("Overview", false);
          close?.();
        }}
      >
        <img src="/logos/zqx.svg" alt="ZQX Platform" width="128" height="64" />
      </a>
      <div className="pq-experience">
        <span className="pq-live-dot" />
        {t(control ? "Control Center" : "Client Workspace")}
      </div>
      <nav
        aria-label={
          t(control ? "Control Center navigation" : "Workspace navigation")
        }
      >
        {groups.map((group) => (
          <div className="pq-nav-group" key={group.group}>
            <p>{t(group.group)}</p>
            {group.items.map((item) => (
              <a
                href={`#${control ? "control/" : ""}${item.toLowerCase()}`}
                key={item}
                aria-label={t(item)}
                aria-current={page === item ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item);
                  close?.();
                }}
              >
                <Icon name={item} />
                <span>{t(item)}</span>
                {item === "Tasks" && !remote && <small><ProductText text={"Demo"} /></small>}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="pq-sidebar-bottom">
        {canControl && <button
          className="pq-mode-switch"
          onClick={() => {
            navigate("Overview", !control);
            close?.();
          }}
        >
          <Icon name={control ? "Organizations" : "System"} />
          <span>
            {t(control ? "Open Client Workspace" : "ZQX Control Center")}
          </span>
          <Icon name="Arrow" size={14} />
        </button>}
        <div className="pq-demo-note">
          {t(remote?"Connected workspace":"Local product preview")}
        </div>
      </div>
    </>
  );
}
export function TopBar({
  authenticatedDemo,
  control,
  page,
  org,
  switchOrg,
  navigate,
  openMenu,
  globalSearch,
  workspaceOrganizations=organizations,
  currentUser,
  remote=false,
  canControl=true,
}: {
  authenticatedDemo?: boolean;
  control: boolean;
  page: string;
  org: string;
  switchOrg: (id: string) => void;
  navigate: (page: string, control?: boolean) => void;
  openMenu: () => void;
  globalSearch: (query: string) => void;
  workspaceOrganizations?:readonly WorkspaceOrganization[];
  currentUser?:string;
  remote?:boolean;
  canControl?:boolean;
}) {
  const {t}=useProductLocale();

  const [query, setQuery] = useState("");
  const [popover, setPopover] = useState("");
  const [signOutError, setSignOutError] = useState("");
  return (
    <header className="pq-topbar">
      <button
        className="pq-icon-button pq-mobile-menu"
        aria-label={t("Open navigation")}
        onClick={openMenu}
      >
        <Icon name="Menu" />
      </button>
      <div className="pq-workspace-selector">
        <OrganizationBrand name={workspaceOrganizations.find(o=>o.id===org)?.name||''} initials={workspaceOrganizations.find(o=>o.id===org)?.initials||''}/>
        <label>
          <span className="pq-sr-only"><ProductText text={"Workspace"} /></span>
          <select
            aria-label={t("Workspace")}
            value={org}
            onChange={(e) => switchOrg(e.target.value)}
          >
            {workspaceOrganizations.map((o) => (
              <option value={o.id} key={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <span className="pq-breadcrumb">
        {t(control ? "Control Center" : "Workspace")}
        <span>/</span>
        {t(page)}
      </span>
      <div className="pq-topbar-tools">
        <ProductLanguageSwitcher/>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            globalSearch(query);
          }}
        >
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search workspace"
          />
        </form>
        {(!remote || workspaceOrganizations.find(o=>o.id===org)?.name==='ZQX Demo Workspace') && <span className="pq-demo-pill">{t("Demo")}</span>}
        <button
          className="pq-icon-button"
          aria-label={t("Notifications")}
          aria-expanded={popover === "notifications"}
          onClick={() =>
            setPopover(popover === "notifications" ? "" : "notifications")
          }
        >
          <Icon name="Bell" />
        </button>
        <button
          className="pq-user-button"
          aria-label={t("User menu")}
          aria-expanded={popover === "user"}
          onClick={() => setPopover(popover === "user" ? "" : "user")}
        >
          <Avatar name={currentUser||"Demo Operator"} />
        </button>
      </div>
      {popover && (
        <Modal
          title={popover === "user" ? currentUser||"Demo operator" : "Notifications"}
          close={() => setPopover("")}
        >
          {popover === "user" ? (
            <div className="pq-dialog-body">
              <p>{t(remote?"Verified account. Access is enforced by the server.":"This local preview does not use a real identity.")}</p>
              {(authenticatedDemo||remote) && (
                <>
                  <button
                    className="pq-button"
                    onClick={async () => {
                      try {
                        const response = await fetch("/api/auth/logout", {
                          method: "POST",
                        });
                        if (!response.ok) throw new Error("Sign out failed");
                        window.location.assign("/login");
                      } catch {
                        setSignOutError(
                          "Could not sign out. Please try again.",
                        );
                      }
                    }}
                  >
                    {t(remote?"Sign out":"Sign out of demo")}
                  </button>
                  {signOutError && <p role="alert">{t(signOutError)}</p>}
                </>
              )}
              {canControl && <button
                className="pq-button"
                onClick={() => {
                  navigate("Overview", !control);
                  setPopover("");
                }}
              >
                <ProductText text={"Switch experience"} /></button>}
            </div>
          ) : (
            <div className="pq-dialog-body">
              <h3><ProductText text={"You’re all caught up"} /></h3>
              <p>
                <ProductText text={"Notification delivery is coming later. No messages are sent by this demo."} /></p>
            </div>
          )}
        </Modal>
      )}
    </header>
  );
}
export function AppShell({
  authenticatedDemo,
  persistent = false,
  remote=false,
  workspaceOrganizations,
  currentUser,
  canControl=true,
  children,
  control,
  page,
  org,
  switchOrg,
  navigate,
  globalSearch,
}: {
  authenticatedDemo?: boolean;
  persistent?: boolean;
  remote?:boolean;
  workspaceOrganizations?:readonly WorkspaceOrganization[];
  currentUser?:string;
  canControl?:boolean;
  children: ReactNode;
  control: boolean;
  page: string;
  org: string;
  switchOrg: (id: string) => void;
  navigate: (page: string, control?: boolean) => void;
  globalSearch: (query: string) => void;
}) {
  const [mobile, setMobile] = useState(false);
  const {locale,t}=useLocale();
  return (
    <div className="pq-app" lang={locale}>
      <a
        className="pq-skip-link"
        href="#pq-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("pq-content")?.focus();
        }}
      >
        <ProductText text={"Skip to content"} /></a>
      <aside className="pq-sidebar">
        <Sidebar control={control} page={page} navigate={navigate} remote={remote} canControl={canControl}/>
      </aside>
      <div className="pq-main">
        <TopBar
          remote={remote}
          workspaceOrganizations={workspaceOrganizations}
          currentUser={currentUser}
          canControl={canControl}
          authenticatedDemo={authenticatedDemo}
          control={control}
          page={page}
          org={org}
          switchOrg={switchOrg}
          navigate={navigate}
          globalSearch={globalSearch}
          openMenu={() => setMobile(true)}
        />
        <main id="pq-content" className="pq-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="pq-footer">
          <span>
            <ProductText text={"ZQX Platform"} /></span>
          <span>{t(!remote || workspaceOrganizations?.find(o=>o.id===org)?.name==='ZQX Demo Workspace'?"Synthetic data only":"Connected workspace")}{persistent?' · PostgreSQL':''}</span>
        </footer>
      </div>
      {mobile && (
        <Modal title="Navigation" drawer close={() => setMobile(false)}>
          <div className="pq-mobile-sidebar">
            <Sidebar
              control={control}
              page={page}
              navigate={navigate}
              close={() => setMobile(false)}
              remote={remote}
              canControl={canControl}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
