import type { FunctionTool } from "@aipexstudio/aipex-core";

// Re-export all tool modules
export * from "./bookmark";
export * from "./element";
export * from "./history";
export * from "./page";
export * from "./screenshot";
export * from "./snapshot";
export * from "./tab";
// Re-export tool utilities
export * from "./utils";

// Import tools for allBrowserTools array
import {
  createBookmarkFolderTool,
  createBookmarkTool,
  deleteBookmarkFolderTool,
  deleteBookmarkTool,
  getBookmarkTool,
  listBookmarksTool,
  searchBookmarksTool,
  updateBookmarkTool,
} from "./bookmark";
import {
  clickElementByUidTool,
  fillElementByUidTool,
  getEditorValueByUidTool,
  hoverElementByUidTool,
} from "./element";
import {
  clearHistoryTool,
  deleteHistoryItemTool,
  getHistoryStatsTool,
  getMostVisitedSitesTool,
  getRecentHistoryTool,
  searchHistoryTool,
} from "./history";
import {
  clickElementTool,
  fillFormFieldTool,
  getPageContentTool,
  getPageInfoTool,
  navigateToUrlTool,
  scrollPageTool,
} from "./page";
import {
  copyScreenshotToClipboardTool,
  takeScreenshotOfTabTool,
  takeScreenshotTool,
} from "./screenshot";
import { searchSnapshotTool, takeSnapshotTool } from "./snapshot";
import {
  closeTabTool,
  createTabTool,
  duplicateTabTool,
  listTabsTool,
  reloadTabTool,
  switchToTabTool,
} from "./tab";

export const allBrowserTools: FunctionTool[] = [
  // Page tools
  getPageInfoTool,
  scrollPageTool,
  navigateToUrlTool,
  getPageContentTool,
  clickElementTool,
  fillFormFieldTool,
  // Tab tools
  listTabsTool,
  switchToTabTool,
  closeTabTool,
  createTabTool,
  reloadTabTool,
  duplicateTabTool,
  // Snapshot tools
  takeSnapshotTool,
  searchSnapshotTool,
  // Element tools (UID-based)
  clickElementByUidTool,
  fillElementByUidTool,
  hoverElementByUidTool,
  getEditorValueByUidTool,
  // Screenshot tools
  takeScreenshotTool,
  takeScreenshotOfTabTool,
  copyScreenshotToClipboardTool,
  // Bookmark tools
  listBookmarksTool,
  searchBookmarksTool,
  createBookmarkTool,
  deleteBookmarkTool,
  getBookmarkTool,
  updateBookmarkTool,
  createBookmarkFolderTool,
  deleteBookmarkFolderTool,
  // History tools
  getRecentHistoryTool,
  searchHistoryTool,
  deleteHistoryItemTool,
  clearHistoryTool,
  getMostVisitedSitesTool,
  getHistoryStatsTool,
] as const;

interface ToolRegistryLike {
  register(tool: (typeof allBrowserTools)[number]): unknown;
}

/**
 * Register all default browser tools with a registry-like object
 */
export function registerDefaultBrowserTools<T extends ToolRegistryLike>(
  registry: T,
): T {
  for (const tool of allBrowserTools) {
    registry.register(tool);
  }
  return registry;
}
