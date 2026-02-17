import { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    ? `${slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} | Founder Profile`
    : 'Founder Profile';
  return {
    title,
    description: 'Executive and founder profile with career journey, education, and strategic insights.',
  };
}

export default function FounderSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
