import { useRouteLoaderData } from "react-router";

export default function RouteAccess({ children, userLevels, periodStatuses }) {
  const authData = useRouteLoaderData("auth");
  const periodData = useRouteLoaderData("period");
  const userLevel =
    authData?.activeUser?.userLevel ?? authData?.activeUser?.userlevel;
  const periodStatus = periodData?.data?.status;

  const hasAllowedUserLevel = !userLevels || userLevels.includes(userLevel);
  const hasAllowedPeriodStatus =
    !periodStatuses || periodStatuses.includes(periodStatus);

  if (!hasAllowedUserLevel || !hasAllowedPeriodStatus) {
    return null;
  }

  return children;
}
