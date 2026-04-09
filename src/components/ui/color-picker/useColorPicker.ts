'use client';

import React from 'react';

import type { PlateEditor } from 'platejs/react';
import { useEditorRef, useEditorSelector } from 'platejs/react';

import {
  DEFAULT_COLORS,
  normalizeColor,
  isValidHexColor,
} from './constants';

function getEditorColorMarks(editor: PlateEditor, nodeType: string): string[] {
  const usedColors = new Set<string>();

  for (const [node] of editor.api.nodes({
    at: [],
    match: (n) =>
      'text' in n &&
      typeof (n as Record<string, unknown>)[nodeType] === 'string',
    mode: 'all',
  })) {
    const color = (node as Record<string, unknown>)[nodeType] as string;
    usedColors.add(normalizeColor(color));
  }

  return Array.from(usedColors);
}

export function useColorPicker(nodeType: string) {
  const editor = useEditorRef();

  const selectionDefined = useEditorSelector(
    (editor) => !!editor.selection,
    []
  );

  const color = useEditorSelector(
    (editor) => editor.api.mark(nodeType) as string,
    [nodeType]
  );

  const [selectedColor, setSelectedColor] = React.useState<string>();
  const [updatedColor, setUpdatedColor] = React.useState<string>();
  const [open, setOpen] = React.useState(false);
  const [colorsQueue, setColorsQueue] = React.useState<string[]>([]);

  const recordColorUsage = React.useCallback((value: string) => {
    const normalized = normalizeColor(value);

    if (!isValidHexColor(normalized)) return;

    setColorsQueue((prev) => {
      const filtered = prev
        .filter((c) => c !== normalized)
        .filter(
          (c) => !DEFAULT_COLORS.some((dc) => normalizeColor(dc.value) === c)
        );

      return [normalized, ...filtered].slice(0, 30);
    });
  }, []);

  const appendColors = React.useCallback((colors: string[]) => {
    setColorsQueue((prev) => {
      const normalized = colors.map(normalizeColor).filter(isValidHexColor);
      const existingSet = new Set(prev);
      const newColors = normalized
        .filter((c) => !existingSet.has(c))
        .filter(
          (c) => !DEFAULT_COLORS.some((dc) => normalizeColor(dc.value) === c)
        );

      return [...newColors, ...prev].slice(0, 30);
    });
  }, []);

  const onToggle = React.useCallback(
    (value = !open) => {
      setOpen(value);

      if (value) {
        const colorUsed = getEditorColorMarks(editor, nodeType);
        appendColors(colorUsed);

        if (selectedColor) {
          recordColorUsage(normalizeColor(selectedColor));
        }
      }
      if (!value) {
        setUpdatedColor(undefined);

        if (editor.selection) {
          setTimeout(() => {
            editor.tf.focus();
          }, 100);
        }
      }
    },
    [open, editor, nodeType, appendColors, selectedColor, recordColorUsage]
  );

  const updateColor = React.useCallback(
    (value: string) => {
      if (editor.selection) {
        setSelectedColor(value);
        setUpdatedColor(value);

        editor.tf.select(editor.selection);
        editor.tf.addMarks({ [nodeType]: value });
      }
    },
    [editor, nodeType]
  );

  const updateColorAndClose = React.useCallback(
    (value: string) => {
      updateColor(value);
      onToggle();
    },
    [onToggle, updateColor]
  );

  const clearColor = React.useCallback(() => {
    if (editor.selection) {
      editor.tf.select(editor.selection);
      editor.tf.removeMarks(nodeType);
      onToggle();
    }
  }, [editor, onToggle, nodeType]);

  React.useEffect(() => {
    if (selectionDefined) {
      setSelectedColor(color);
    }
  }, [color, selectionDefined]);

  return {
    color,
    selectedColor,
    updatedColor,
    open,
    colorsQueue,
    onToggle,
    updateColor,
    updateColorAndClose,
    clearColor,
    recordColorUsage,
  };
}
