'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { StyleRegistry, createStyleRegistry } from 'styled-jsx';

/**
 * Server-renders `<style jsx>` blocks (VegetableNavigation, CustomerReviews,
 * ProductDetail). Without this the App Router only injects them after
 * hydration, so every first visit flashed unstyled — e.g. the SHOP VEGETABLES
 * menu showed a grey button with a giant arrow until the JS loaded.
 * https://nextjs.org/docs/app/building-your-application/styling/css-in-js#styled-jsx
 */
export default function StyledJsxRegistry({ children }: { children: React.ReactNode }) {
  const [jsxStyleRegistry] = useState(() => createStyleRegistry());

  useServerInsertedHTML(() => {
    const styles = jsxStyleRegistry.styles();
    jsxStyleRegistry.flush();
    return <>{styles}</>;
  });

  return <StyleRegistry registry={jsxStyleRegistry}>{children}</StyleRegistry>;
}
