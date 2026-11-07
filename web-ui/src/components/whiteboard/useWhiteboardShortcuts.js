import { useEffect } from 'react';
import { parsePastedUrl } from './whiteboardHelpers.js';

/**
 * useWhiteboardShortcuts
 * Hook isolating all keyboard shortcuts, clipboard paste handling, and tool hotkeys.
 */
export function useWhiteboardShortcuts({
  elements,
  selectedId,
  selectedIds,
  setTool,
  setSelectedId,
  setSelectedIds,
  setIsSpacePressed,
  spacePressedRef,
  setShowShortcutsModal,
  setShowTemplateModal,
  setShowLibrary,
  setTextPrompt,
  setContextMenu,
  handleUndo,
  handleRedo,
  handleSave,
  handleDeleteSelected,
  handleDuplicateSelected,
  handleSelectAll,
  handleCopySelected,
  handleCutSelected,
  handlePasteAt,
  handleInsertUrl,
  handleBringForward,
  handleSendBackward,
  handleBringToFront,
  handleSendToBack,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  handleZoomToFit,
  isReadOnly = false,
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't intercept if user is typing in an input, textarea, or contentEditable
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // Help Modal: ?
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // Spacebar hold for temporary hand / pan tool
      if (e.code === 'Space' && !e.repeat && !spacePressedRef.current) {
        e.preventDefault();
        spacePressedRef.current = true;
        setIsSpacePressed(true);
        return;
      }

      // Undo: Ctrl/Cmd + Z (without shift)
      if (cmdOrCtrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (!isReadOnly) handleUndo();
        return;
      }

      // Redo: Ctrl/Cmd + Y OR Ctrl/Cmd + Shift + Z
      if ((cmdOrCtrl && key === 'y') || (cmdOrCtrl && e.shiftKey && key === 'z')) {
        e.preventDefault();
        if (!isReadOnly) handleRedo();
        return;
      }

      // Save: Ctrl/Cmd + S
      if (cmdOrCtrl && key === 's') {
        e.preventDefault();
        if (!isReadOnly) handleSave(false);
        return;
      }

      // Select All: Ctrl/Cmd + A
      if (cmdOrCtrl && key === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Copy: Ctrl/Cmd + C
      if (cmdOrCtrl && key === 'c') {
        e.preventDefault();
        handleCopySelected();
        return;
      }

      // Cut: Ctrl/Cmd + X
      if (cmdOrCtrl && key === 'x') {
        e.preventDefault();
        if (!isReadOnly) handleCutSelected();
        return;
      }

      // Paste: Ctrl/Cmd + V
      if (cmdOrCtrl && key === 'v') {
        e.preventDefault();
        if (!isReadOnly) handlePasteAt();
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (cmdOrCtrl && key === 'd') {
        e.preventDefault();
        if (!isReadOnly) handleDuplicateSelected();
        return;
      }

      // Layer Order: Bring to Front (Ctrl+Shift+]) or Bring Forward (Ctrl+])
      if (cmdOrCtrl && e.key === ']') {
        e.preventDefault();
        if (!isReadOnly) {
          if (e.shiftKey) handleBringToFront();
          else handleBringForward();
        }
        return;
      }

      // Layer Order: Send to Back (Ctrl+Shift+[) or Send Backward (Ctrl+[)
      if (cmdOrCtrl && e.key === '[') {
        e.preventDefault();
        if (!isReadOnly) {
          if (e.shiftKey) handleSendToBack();
          else handleSendBackward();
        }
        return;
      }

      // Zoom in: Ctrl/Cmd + "+" or "="
      if (cmdOrCtrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Zoom out: Ctrl/Cmd + "-"
      if (cmdOrCtrl && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Zoom to 100%: Ctrl/Cmd + 0
      if (cmdOrCtrl && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
        return;
      }

      // Zoom to Fit: Shift + 1 or Ctrl/Cmd + 9
      if ((e.shiftKey && e.key === '1') || (cmdOrCtrl && e.key === '9')) {
        e.preventDefault();
        handleZoomToFit();
        return;
      }

      // Delete / Backspace: Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (!isReadOnly) handleDeleteSelected();
        return;
      }

      // Escape: Deselect, close modals, or switch to select tool
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowShortcutsModal(false);
        setShowTemplateModal(false);
        setShowLibrary('none');
        setTextPrompt(null);
        setContextMenu(null);
        if (selectedIds.length > 0 || selectedId !== null) {
          setSelectedId(null);
          setSelectedIds([]);
        } else {
          setTool('select');
        }
        return;
      }

      // Tool Switching Hotkeys (Single Keys without modifiers) — only allowed for editors
      if (cmdOrCtrl || e.altKey || isReadOnly) return;

      if (key === 'v' || key === '1') {
        setTool('select');
      } else if (key === 'h') {
        setTool('pan');
      } else if (key === 'p' || key === '2') {
        setTool('pen');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'e') {
        setTool('eraser');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'r' || key === '3') {
        setTool('rect');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'o' || key === 'c') {
        setTool('circle');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'a') {
        setTool('arrow');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'f') {
        setTool('frame');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 't' || key === '4') {
        setTool('text');
        setSelectedId(null);
        setSelectedIds([]);
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    const onPaste = (e) => {
      if (isReadOnly) return;
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const pastedText = e.clipboardData?.getData('text');
      if (pastedText) {
        const clean = parsePastedUrl(pastedText);
        if (clean) {
          e.preventDefault();
          handleInsertUrl(clean);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('paste', onPaste);
    };
  }, [
    elements,
    selectedId,
    selectedIds,
    setTool,
    setSelectedId,
    setSelectedIds,
    setIsSpacePressed,
    spacePressedRef,
    setShowShortcutsModal,
    setShowTemplateModal,
    setShowLibrary,
    setTextPrompt,
    setContextMenu,
    handleUndo,
    handleRedo,
    handleSave,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleSelectAll,
    handleCopySelected,
    handleCutSelected,
    handlePasteAt,
    handleInsertUrl,
    handleBringForward,
    handleSendBackward,
    handleBringToFront,
    handleSendToBack,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomToFit,
    isReadOnly,
  ]);
}
