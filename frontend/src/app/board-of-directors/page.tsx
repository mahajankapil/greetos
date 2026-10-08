import type { Metadata } from 'next';
import { OurStorySection, type OurStoryData } from '@/components/OurStorySection';
import { getSettings } from '@/lib/api';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Board of Directors | ${SITE.name}`,
  description: 'Meet the leadership behind Old Spice Agro Fresh LLP.',
  alternates: { canonical: '/board-of-directors' },
};

export default async function BoardOfDirectorsPage() {
  const settings = await getSettings();
  let data: OurStoryData | undefined;

  if (settings?.our_story_section) {
    try {
      const parsed = JSON.parse(settings.our_story_section);
      data = {
        ...parsed,
        title: parsed.title || 'Board Of Directors',
        subtitle: parsed.subtitle || 'Leadership & Vision Behind Old Spice Agro Fresh LLP',
      };
    } catch {
      data = undefined;
    }
  }

  return <OurStorySection data={data} headingLevel={1} />;
}
