import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/accessories")({ component: AccessoriesLayout });

function AccessoriesLayout() {
  return <Outlet />;
}
