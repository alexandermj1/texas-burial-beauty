// Leaflet needs a real browser at import time. While pages are rendered to
// HTML at build time, maps are not drawn, so this inert stand-in is used.
const inert: any = new Proxy(function () {}, {
  get: (_t, key) => (key === "prototype" ? {} : key === Symbol.toPrimitive ? () => "" : inert),
  apply: () => inert,
  construct: () => inert,
});
export default inert;
