# Shared layouts

## `src/App.jsx`

React Router app shell. Authenticated desktop pages render a sticky `Sidebar`; tablet pages render `TabletDashboardNavbar`; mobile/horizontal mode renders `Navbar`. The route content lives in `main#main-content` and uses the global paper surface.

```jsx
<LayoutProvider>
  <Router>
    <ProductModeRouteSync />
    <Navbar />
    <TabletDashboardNavbar />
    <div className="flex min-h-screen bg-surface-body">
      <Sidebar />
      <main id="main-content" className="min-w-0 flex-1"><Routes /></main>
    </div>
  </Router>
</LayoutProvider>
```

## `src/components/Sidebar.jsx`

Desktop authenticated shell. A 304px resizable warm raised rail with Caplet logo, persistent Study/Money switch, primary icon navigation, account link, and collapse control.

```jsx
<aside aria-label="Sidebar navigation" className="relative sticky top-0 hidden h-screen shrink-0 p-3 lg:flex" style={{ width: collapsed ? 96 : sidebarWidth }}>
  <div className="flex h-full w-full flex-col rounded-3xl border border-line-soft bg-surface-raised p-3">
    <Link to="/dashboard">Caplet.</Link>
    <ProductModeSwitch collapsed={collapsed} className="mt-2 w-full" />
    <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1">{/* Dashboard, Study plan, Practice, Mastery, Revision, Essays, Resource library, Classes */}</nav>
    <Link to="/settings">Account</Link>
    <button type="button">Collapse</button>
  </div>
</aside>
```

## `src/components/Navbar.jsx` and `src/components/TabletDashboardNavbar.jsx`

Responsive navigation alternatives. Both retain the Study/Money switch for signed-in users and use the same surface, accent, line, and typography tokens.
