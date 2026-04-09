'use client';
/* eslint-disable react-hooks/refs -- Ref usage for color picker component refs */

import React from 'react';

import type { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';

import { useComposedRef } from '@udecode/cn';
import debounce from 'lodash/debounce';
import { EraserIcon, PlusIcon } from 'lucide-react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ToolbarButton, ToolbarMenuGroup } from './toolbar';
import { ColorPickerStatic } from './color-picker/ColorPickerStatic';
import {
  computeIsBrightColor,
  DEFAULT_COLORS,
  DEFAULT_CUSTOM_COLORS,
  MAX_CUSTOM_COLORS,
  normalizeColor,
} from './color-picker/constants';
import type { TColor } from './color-picker/constants';
import { useColorPicker } from './color-picker/useColorPicker';

export { DEFAULT_COLORS } from './color-picker/constants';
export { ColorPickerStatic as ColorDropdownMenuItems } from './color-picker/ColorPickerStatic';

export function FontColorToolbarButton({
  children,
  nodeType,
  tooltip,
}: {
  nodeType: string;
  tooltip?: string;
} & DropdownMenuProps) {
  const {
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
  } = useColorPicker(nodeType);

  return (
    <DropdownMenu modal onOpenChange={onToggle} open={open}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip={tooltip}>
          {children}
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <ColorPicker
          clearColor={clearColor}
          color={selectedColor || color}
          colors={DEFAULT_COLORS}
          colorsQueue={colorsQueue}
          customColors={DEFAULT_CUSTOM_COLORS}
          recordColorUsage={recordColorUsage}
          updateColor={updateColorAndClose}
          updateCustomColor={updateColor}
          updatedColor={updatedColor}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PureColorPicker({
  className,
  clearColor,
  color,
  colors,
  colorsQueue,
  customColors,
  recordColorUsage,
  updateColor,
  updateCustomColor,
  updatedColor,
  ...props
}: React.ComponentProps<'div'> & {
  colors: TColor[];
  colorsQueue: string[];
  customColors: TColor[];
  clearColor: () => void;
  recordColorUsage: (color: string) => void;
  updateColor: (color: string) => void;
  updateCustomColor: (color: string) => void;
  color?: string;
  updatedColor?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <ToolbarMenuGroup label="Custom Colors">
        <ColorCustom
          className="px-2"
          color={color}
          colors={colors}
          colorsQueue={colorsQueue}
          customColors={customColors}
          recordColorUsage={recordColorUsage}
          updateColor={updateColor}
          updateCustomColor={updateCustomColor}
          updatedColor={updatedColor}
        />
      </ToolbarMenuGroup>
      <ToolbarMenuGroup label="Default Colors">
        <ColorPickerStatic
          className="px-2"
          color={color}
          colors={colors}
          updateColor={updateColor}
        />
      </ToolbarMenuGroup>
      {color && (
        <ToolbarMenuGroup>
          <DropdownMenuItem className="p-2" onClick={clearColor}>
            <EraserIcon />
            <span>Clear</span>
          </DropdownMenuItem>
        </ToolbarMenuGroup>
      )}
    </div>
  );
}

const ColorPicker = React.memo(
  PureColorPicker,
  (prev, next) =>
    prev.color === next.color &&
    prev.colors === next.colors &&
    prev.colorsQueue === next.colorsQueue &&
    prev.customColors === next.customColors &&
    prev.updatedColor === next.updatedColor
);

function ColorCustom({
  className,
  color,
  colors,
  colorsQueue,
  customColors,
  recordColorUsage,
  updateColor,
  updateCustomColor,
  updatedColor,
  ...props
}: {
  colors: TColor[];
  colorsQueue: string[];
  customColors: TColor[];
  recordColorUsage: (color: string) => void;
  updateColor: (color: string) => void;
  updateCustomColor: (color: string) => void;
  color?: string;
  updatedColor?: string;
} & React.ComponentPropsWithoutRef<'div'>) {
  const [value, setValue] = React.useState<string>(color || '#000000');

  const fullCustomColors = React.useMemo(
    () =>
      colorsQueue
        .filter((c) => normalizeColor(c) !== normalizeColor(updatedColor || ''))
        .filter(
          (c) =>
            !DEFAULT_COLORS.some(
              (dc) => normalizeColor(dc.value) === normalizeColor(c)
            )
        )
        .filter(
          (c) =>
            !DEFAULT_CUSTOM_COLORS.some(
              (dc) => normalizeColor(dc.value) === normalizeColor(c)
            )
        )
        .map((c) => ({
          isBrightColor: computeIsBrightColor(c),
          name: c,
          value: c,
        }))
        .slice(
          0,
          MAX_CUSTOM_COLORS - customColors.length - (updatedColor ? 1 : 0)
        ),
    [colorsQueue, customColors, updatedColor]
  );

  const isColorInCollections = React.useCallback(
    (targetColor: string) =>
      colors.some(
        (c) => normalizeColor(c.value) === normalizeColor(targetColor)
      ) ||
      customColors.some(
        (c) => normalizeColor(c.value) === normalizeColor(targetColor)
      ) ||
      fullCustomColors.some(
        (c) => normalizeColor(c.value) === normalizeColor(targetColor)
      ),
    [colors, customColors, fullCustomColors]
  );

  const [customColor, setCustomColor] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!updatedColor || isColorInCollections(updatedColor)) {
      setCustomColor(null);

      return;
    }

    setCustomColor(updatedColor);
  }, [isColorInCollections, updatedColor]);

  const computedColors = React.useMemo(
    () =>
      customColor
        ? [
            ...customColors,
            {
              isBrightColor: computeIsBrightColor(customColor),
              name: customColor,
              value: customColor,
            },
            ...fullCustomColors,
          ]
        : [...customColors, ...fullCustomColors],
    [customColor, fullCustomColors, customColors]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateCustomColorDebounced = React.useCallback(
    debounce(updateCustomColor, 100),
    [updateCustomColor]
  );

  return (
    <div className={cn('flex flex-col gap-4', className)} {...props}>
      <ColorPickerStatic
        color={color}
        colors={computedColors}
        updateColor={(c) => {
          updateColor(c);
          recordColorUsage(normalizeColor(c));
        }}
      >
        <ColorInput
          className="col-start-10"
          onChange={(e) => {
            setValue(e.target.value);
            updateCustomColorDebounced(e.target.value);
          }}
          value={value}
        >
          <DropdownMenuItem
            className={cn(
              buttonVariants({
                size: 'icon',
                variant: 'outline',
              }),
              'flex size-8 items-center justify-center rounded-full'
            )}
            onSelect={(e) => {
              e.preventDefault();
            }}
          >
            <span className="sr-only">Custom</span>
            <PlusIcon />
          </DropdownMenuItem>
        </ColorInput>
      </ColorPickerStatic>
    </div>
  );
}

function ColorInput({
  children,
  className,
  value = '#000000',
  ...props
}: React.ComponentProps<'input'> & { className?: string }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {React.Children.map(children, (child) => {
        if (!child) return child;

        return React.cloneElement(
          child as React.ReactElement<{
            onClick: () => void;
          }>,
          {
            onClick: () => inputRef.current?.click(),
          }
        );
      })}
      <input
        {...props}
        className="size-0 overflow-hidden border-0 p-0"
        ref={useComposedRef(props.ref, inputRef)}
        type="color"
        value={value}
      />
    </div>
  );
}
