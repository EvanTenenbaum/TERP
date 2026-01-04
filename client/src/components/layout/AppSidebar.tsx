import React from "react";
import { Sidebar, type SidebarProps } from "./Sidebar";

export type AppSidebarProps = SidebarProps;

export function AppSidebar(props: SidebarProps) {
  return <Sidebar {...props} />;
}
