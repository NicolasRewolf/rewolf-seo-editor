'use client';

import * as React from 'react';
import { TableCellElement } from './TableNodeCell';

export function TableNodeHeader(
  props: React.ComponentProps<typeof TableCellElement>
) {
  return <TableCellElement {...props} isHeader />;
}
