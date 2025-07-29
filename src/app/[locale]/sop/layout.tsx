// Force dynamic rendering for the entire SOP section
// This is appropriate for an enterprise restaurant management system
// with real-time features, user authentication, and dynamic content
export const dynamic = 'force-dynamic';

export default function SOPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}