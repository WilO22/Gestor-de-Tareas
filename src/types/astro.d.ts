declare module '*.astro' {
  const Component: any;
  export default Component;
  // allow re-exporting Props from .astro files in the codebase
  export type Props = any;
}
