'use client';

import * as React from 'react';

import { DndPlugin, useDraggable } from '@platejs/dnd';
import { expandListItemsWithChildren } from '@platejs/list';
import { BlockSelectionPlugin } from '@platejs/selection/react';
import { type TElement, getPluginByType } from 'platejs';
import { type PlateEditor, type PlateElementProps } from 'platejs/react';

import { cn } from '@/lib/utils';

function createDragPreviewElements(
  editor: PlateEditor,
  blocks: TElement[]
): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const ids: string[] = [];

  const removeDataAttributes = (element: HTMLElement) => {
    Array.from(element.attributes).forEach((attr) => {
      if (
        attr.name.startsWith('data-slate') ||
        attr.name.startsWith('data-block-id')
      ) {
        element.removeAttribute(attr.name);
      }
    });

    Array.from(element.children).forEach((child) => {
      removeDataAttributes(child as HTMLElement);
    });
  };

  const resolveElement = (node: TElement, index: number) => {
    const domNode = editor.api.toDOMNode(node)!;
    const newDomNode = domNode.cloneNode(true) as HTMLElement;

    const applyScrollCompensation = (original: Element, cloned: HTMLElement) => {
      const scrollLeft = original.scrollLeft;

      if (scrollLeft > 0) {
        const scrollWrapper = document.createElement('div');
        scrollWrapper.style.overflow = 'hidden';
        scrollWrapper.style.width = `${original.clientWidth}px`;

        const innerContainer = document.createElement('div');
        innerContainer.style.transform = `translateX(-${scrollLeft}px)`;
        innerContainer.style.width = `${original.scrollWidth}px`;

        while (cloned.firstChild) {
          innerContainer.append(cloned.firstChild);
        }

        const originalStyles = window.getComputedStyle(original);
        cloned.style.padding = '0';
        innerContainer.style.padding = originalStyles.padding;

        scrollWrapper.append(innerContainer);
        cloned.append(scrollWrapper);
      }
    };

    applyScrollCompensation(domNode, newDomNode);

    ids.push(node.id as string);
    const wrapper = document.createElement('div');
    wrapper.append(newDomNode);
    wrapper.style.display = 'flow-root';

    const lastDomNode = blocks[index - 1];

    if (lastDomNode) {
      const lastDomNodeRect = editor.api
        .toDOMNode(lastDomNode)!
        .parentElement!.getBoundingClientRect();

      const domNodeRect = domNode.parentElement!.getBoundingClientRect();

      const distance = domNodeRect.top - lastDomNodeRect.bottom;

      if (distance > 15) {
        wrapper.style.marginTop = `${distance}px`;
      }
    }

    removeDataAttributes(newDomNode);
    elements.push(wrapper);
  };

  blocks.forEach((node, index) => {
    resolveElement(node, index);
  });

  editor.setOption(DndPlugin, 'draggingId', ids);

  return elements;
}

function calculatePreviewTop(
  editor: PlateEditor,
  {
    blocks,
    element,
  }: {
    blocks: TElement[];
    element: TElement;
  }
): number {
  const child = editor.api.toDOMNode(element)!;
  const editable = editor.api.toDOMNode(editor)!;
  const firstSelectedChild = blocks[0];

  const firstDomNode = editor.api.toDOMNode(firstSelectedChild)!;
  const editorPaddingTop = Number(
    window.getComputedStyle(editable).paddingTop.replace('px', '')
  );

  const firstNodeToEditorDistance =
    firstDomNode.getBoundingClientRect().top -
    editable.getBoundingClientRect().top -
    editorPaddingTop;

  const firstMarginTopString = window.getComputedStyle(firstDomNode).marginTop;
  const marginTop = Number(firstMarginTopString.replace('px', ''));

  const currentToEditorDistance =
    child.getBoundingClientRect().top -
    editable.getBoundingClientRect().top -
    editorPaddingTop;

  const currentMarginTopString = window.getComputedStyle(child).marginTop;
  const currentMarginTop = Number(currentMarginTopString.replace('px', ''));

  return (
    currentToEditorDistance -
    firstNodeToEditorDistance +
    marginTop -
    currentMarginTop
  );
}

function calcDragButtonTop(editor: PlateEditor, element: TElement): number {
  const child = editor.api.toDOMNode(element)!;

  const currentMarginTopString = window.getComputedStyle(child).marginTop;
  const currentMarginTop = Number(currentMarginTopString.replace('px', ''));

  return currentMarginTop;
}

export function useBlockDraggable({
  editor,
  element,
  path,
}: Pick<PlateElementProps, 'editor' | 'element' | 'path'>) {
  const blockSelectionApi = editor.getApi(BlockSelectionPlugin).blockSelection;

  const [previewTop, setPreviewTop] = React.useState(0);
  const [dragButtonTop, setDragButtonTop] = React.useState(0);

  const resetPreview = React.useCallback(
    (previewRef: React.RefObject<HTMLDivElement | null>) => {
      if (previewRef.current) {
        previewRef.current.replaceChildren();
        previewRef.current.classList.add('hidden');
      }
    },
    []
  );

  const { isAboutToDrag, isDragging, nodeRef, previewRef, handleRef } =
    useDraggable({
      element,
      onDropHandler: (_, { dragItem }) => {
        const id = (dragItem as { id: string[] | string }).id;

        if (blockSelectionApi) {
          blockSelectionApi.add(id);
        }
        resetPreview(previewRef);
      },
    });

  React.useEffect(() => {
    if (!isDragging) {
      resetPreview(previewRef);
    }
  }, [isDragging, previewRef, resetPreview]);

  React.useEffect(() => {
    if (isAboutToDrag) {
      previewRef.current?.classList.remove('opacity-0');
    }
  }, [isAboutToDrag, previewRef]);

  const isInColumn = React.useMemo(() => path.length === 3, [path.length]);
  const isInTable = React.useMemo(() => path.length === 4, [path.length]);

  const containerClassName = React.useMemo(
    () =>
      cn(
        'relative',
        isDragging && 'opacity-50',
        getPluginByType(editor, element.type)?.node.isContainer
          ? 'group/container'
          : 'group'
      ),
    [editor, element.type, isDragging]
  );

  const previewStyle = React.useMemo(
    () => ({ top: `${-previewTop}px` }),
    [previewTop]
  );

  const dragButtonStyle = React.useMemo(
    () => ({ top: `${dragButtonTop + 3}px` }),
    [dragButtonTop]
  );

  const onContainerMouseEnter = React.useCallback(() => {
    if (isDragging) return;
    setDragButtonTop(calcDragButtonTop(editor, element));
  }, [editor, element, isDragging]);

  const onHandleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      editor.getApi(BlockSelectionPlugin).blockSelection.focus();
    },
    [editor]
  );

  const onHandleMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      resetPreview(previewRef);

      if ((e.button !== 0 && e.button !== 2) || e.shiftKey) return;

      const blockSelection = editor
        .getApi(BlockSelectionPlugin)
        .blockSelection.getNodes({ sort: true });

      let selectionNodes =
        blockSelection.length > 0
          ? blockSelection
          : editor.api.blocks({ mode: 'highest' });

      if (!selectionNodes.some(([node]) => node.id === element.id)) {
        selectionNodes = [[element, editor.api.findPath(element)!]];
      }

      const blocks = expandListItemsWithChildren(editor, selectionNodes).map(
        ([node]) => node
      );

      if (blockSelection.length === 0) {
        editor.tf.blur();
        editor.tf.collapse();
      }

      const elements = createDragPreviewElements(editor, blocks);
      previewRef.current?.append(...elements);
      previewRef.current?.classList.remove('hidden');
      previewRef.current?.classList.add('opacity-0');
      editor.setOption(DndPlugin, 'multiplePreviewRef', previewRef);

      editor
        .getApi(BlockSelectionPlugin)
        .blockSelection.set(blocks.map((block) => block.id as string));
    },
    [editor, element, previewRef, resetPreview]
  );

  const onHandleMouseEnter = React.useCallback(() => {
    if (isDragging) return;

    const blockSelection = editor
      .getApi(BlockSelectionPlugin)
      .blockSelection.getNodes({ sort: true });

    let selectedBlocks =
      blockSelection.length > 0
        ? blockSelection
        : editor.api.blocks({ mode: 'highest' });

    if (!selectedBlocks.some(([node]) => node.id === element.id)) {
      selectedBlocks = [[element, editor.api.findPath(element)!]];
    }

    const processedBlocks = expandListItemsWithChildren(editor, selectedBlocks);
    const ids = processedBlocks.map((block) => block[0].id as string);

    if (ids.length > 1 && ids.includes(element.id as string)) {
      const nextPreviewTop = calculatePreviewTop(editor, {
        blocks: processedBlocks.map((block) => block[0]),
        element,
      });
      setPreviewTop(nextPreviewTop);
    } else {
      setPreviewTop(0);
    }
  }, [editor, element, isDragging]);

  const onHandleMouseUp = React.useCallback(() => {
    resetPreview(previewRef);
  }, [previewRef, resetPreview]);

  return {
    isDragging,
    isInColumn,
    isInTable,
    nodeRef,
    previewRef,
    handleRef,
    containerClassName,
    previewStyle,
    dragButtonStyle,
    onContainerMouseEnter,
    onHandleClick,
    onHandleMouseDown,
    onHandleMouseEnter,
    onHandleMouseUp,
  };
}
