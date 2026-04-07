'use client';

import { PlateLeaf, type PlateLeafProps } from 'platejs/react';

export function KeywordFocusLeaf(props: PlateLeafProps) {
  return (
    <PlateLeaf {...props} as="span" className="kw-focus">
      {props.children}
    </PlateLeaf>
  );
}

export function KeywordLongtailLeaf(props: PlateLeafProps) {
  return (
    <PlateLeaf {...props} as="span" className="kw-longtail">
      {props.children}
    </PlateLeaf>
  );
}
