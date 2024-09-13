import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="flex-grow min-h-screen">
      <Outlet />
    </div>
  ),
});
