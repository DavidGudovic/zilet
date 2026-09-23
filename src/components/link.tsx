import NextLink from 'next/link';
// Public pages render on every request, so prefetching one cannot speed up the visit; it only
// runs the target's metadata queries for each link in view. Clicks still navigate client-side.
export function Link(props: React.ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
