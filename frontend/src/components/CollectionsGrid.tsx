import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { COLLECTIONS } from '@/data/collections';

export interface CategoryItem {
  title: string;
  href: string;
  image: string;
  subtitle?: string;
}

interface CollectionsGridProps {
  categories?: CategoryItem[];
}

const defaultCategories: CategoryItem[] = COLLECTIONS
  .filter((collection) => collection.slug !== 'organic-baskets')
  .map((collection) => ({
    title: collection.title,
    href: `/collections/${collection.slug}`,
    image: collection.image,
    subtitle: collection.subtitle,
  }));

export const CollectionsGrid: React.FC<CollectionsGridProps> = ({ categories: customCategories }) => {
  const categories = customCategories?.length ? customCategories : defaultCategories;

  return (
    <section className="vegetable-categories" aria-labelledby="vegetable-categories-title">
      <div className="vegetable-categories__inner">
        <div className="vegetable-categories__heading">
          {/* <p className="vegetable-categories__eyebrow">FRESH PICKS FOR YOUR KITCHEN</p> */}
          <h2 id="vegetable-categories-title">Shop by Category</h2>
          {/* <p>From leafy greens to everyday essentials, find your favourites.</p> */}
        </div>
        <ul className="vegetable-categories__list">
          {categories.map((category) => {
            const fallback = defaultCategories.find((item) => item.href === category.href);
            const subtitle = category.subtitle || fallback?.subtitle;
            const isAllItems = ['/collections/all', '/collections/all-items'].includes(category.href);

            return (
              <li
                key={category.href}
                className={`vegetable-categories__item${isAllItems ? ' vegetable-categories__item--all' : ''}`}
              >
                <Link href={category.href} className="vegetable-categories__link">
                  <span className="vegetable-categories__image">
                    <img src={category.image || fallback?.image} alt="" width={148} height={148} loading="lazy" />
                  </span>
                  <span className="vegetable-categories__name">{category.title}</span>
                  {subtitle && <span className="vegetable-categories__description">{subtitle}</span>}
                  {isAllItems && <ArrowRight className="vegetable-categories__all-icon" size={20} aria-hidden="true" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
