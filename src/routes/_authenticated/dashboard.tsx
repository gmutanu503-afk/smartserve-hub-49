import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchCurrentUser, homePathFor } from "@/lib/auth/use-auth";

/** Role-aware entry point: sends each user to the right workspace. */
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    throw redirect({ to: homePathFor(user), replace: true });
  },
  component: () => null,
});
