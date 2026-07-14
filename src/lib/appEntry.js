/**
 * appEntry — the pathname the page load actually entered at.
 *
 * Must be imported eagerly from main.jsx: route pages are lazy(), so a module
 * evaluated from a route chunk would run after SPA navigation and see the
 * current path, not the entry path. useStartupRedirect relies on this to fire
 * only on a genuine app open at "/".
 */
export const entryPath = window.location.pathname
