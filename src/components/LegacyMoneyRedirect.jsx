import { Navigate, useLocation } from 'react-router-dom';

/** Keeps old calculator bookmarks working while Money owns the canonical URLs. */
export default function LegacyMoneyRedirect({ prefix }) {
  const location = useLocation();
  const suffix = location.pathname.slice(prefix.length);
  const target = `/money/tools${suffix}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}
