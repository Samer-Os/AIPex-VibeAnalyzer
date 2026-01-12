import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { executeScriptInActiveTab, getActiveTab } from "./utils";

/**
 * Get information about the current active page
 */
export const getPageInfoTool = tool({
  name: "get_page_info",
  description:
    "Get information about the current active page (URL, title, etc.)",
  parameters: z.object({}),
  execute: async () => {
    const tab = await getActiveTab();

    return {
      url: tab.url,
      title: tab.title,
      id: tab.id,
      favIconUrl: tab.favIconUrl,
    };
  },
});

/**
 * Scroll the current page
 */
export const scrollPageTool = tool({
  name: "scroll_page",
  description:
    "Scroll the current page in a specific direction or to a position",
  parameters: z.object({
    direction: z
      .enum(["up", "down", "top", "bottom"])
      .describe("Direction to scroll"),
    pixels: z
      .number()
      .nullable()
      .optional()
      .describe("Number of pixels to scroll (for up/down)"),
  }),
  execute: async ({
    direction,
    pixels = 500,
  }: {
    direction: "up" | "down" | "top" | "bottom";
    pixels?: number | null;
  }) => {
    const scrollPixels = pixels ?? 500;
    await executeScriptInActiveTab(
      (dir: string, px: number) => {
        switch (dir) {
          case "up":
            window.scrollBy({ top: -px, behavior: "smooth" });
            break;
          case "down":
            window.scrollBy({ top: px, behavior: "smooth" });
            break;
          case "top":
            window.scrollTo({ top: 0, behavior: "smooth" });
            break;
          case "bottom":
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            });
            break;
        }
      },
      [direction, scrollPixels],
    );

    return { success: true, direction, scrolled: scrollPixels };
  },
});

/**
 * Navigate to a specific URL
 */
export const navigateToUrlTool = tool({
  name: "navigate_to_url",
  description: "Navigate the current tab to a specific URL",
  parameters: z.object({
    url: z.string().url().describe("The URL to navigate to"),
    newTab: z
      .boolean()
      .nullable()
      .optional()
      .describe("Whether to open in a new tab"),
  }),
  execute: async ({
    url,
    newTab = false,
  }: {
    url: string;
    newTab?: boolean | null;
  }) => {
    if (newTab) {
      const tab = await chrome.tabs.create({ url });
      return { success: true, tabId: tab.id, url };
    } else {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        throw new Error("No active tab found");
      }

      await chrome.tabs.update(tab.id, { url });
      return { success: true, tabId: tab.id, url };
    }
  },
});

/**
 * Get the text content of the current page
 */
export const getPageContentTool = tool({
  name: "get_page_content",
  description: "Get the text content of the current page",
  parameters: z.object({
    selector: z
      .string()
      .nullable()
      .nullable()
      .optional()
      .describe("CSS selector to get content from (default: body)"),
  }),
  execute: async ({ selector = "body" }: { selector?: string | null }) => {
    // Helper function to extract content with better heuristics
    const extractionResult = await executeScriptInActiveTab(
      (sel: string) => {
        let element: Element | null = null;
        let usedSelector = sel;

        // If generic selector, try heuristics for main content
        if (!sel || sel === "body") {
          const candidates = [
            "article",
            "main",
            '[role="main"]',
            "#content", // Wikipedia/MediaWiki
            "#main",
            ".main-content",
            "body",
          ];

          for (const candidate of candidates) {
            const found = document.querySelector(candidate);
            if (found) {
              element = found;
              usedSelector = candidate;
              break;
            }
          }
        } else {
          element = document.querySelector(sel);
        }

        if (!element) return null;

        // innerText is generally better than textContent as it respects styling (hidden elements)
        // and preserves some formatting (newlines)
        const content =
          (element as HTMLElement).innerText || element.textContent;
        return { content, usedSelector };
      },
      [selector ?? "body"],
    );

    if (!extractionResult?.content) {
      throw new Error(`No content found for selector: ${selector}`);
    }

    const { content, usedSelector } = extractionResult;
    const maxLength = 25000; // Limit to 25k chars (~5k tokens) to ensure model responsiveness
    const isTruncated = content.length > maxLength;
    const finalContent = isTruncated
      ? content.slice(0, maxLength) +
        "\n\n[SYSTEM NOTE: Content truncated. Please summarize the text above.]"
      : content;

    return {
      content: finalContent,
      selector: usedSelector,
      isTruncated,
      totalLength: content.length,
    };
  },
});

/**
 * Click an element on the page
 */
export const clickElementTool = tool({
  name: "click_element",
  description: "Click an element on the current page using a CSS selector",
  parameters: z.object({
    selector: z.string().describe("CSS selector of the element to click"),
  }),
  execute: async ({ selector }: { selector: string }) => {
    const result = await executeScriptInActiveTab(
      (sel: string) => {
        const element = document.querySelector(sel);
        if (!element) {
          return { success: false, error: "Element not found" };
        }
        if (element instanceof HTMLElement) {
          element.click();
          return { success: true };
        }
        return { success: false, error: "Element is not clickable" };
      },
      [selector],
    );

    if (!result?.success) {
      throw new Error(result?.error ?? "Failed to click element");
    }

    return { success: true, selector };
  },
});

/**
 * Fill a form field on the page
 */
export const fillFormFieldTool = tool({
  name: "fill_form_field",
  description: "Fill a form field on the current page",
  parameters: z.object({
    selector: z.string().describe("CSS selector of the input field"),
    value: z.string().describe("Value to fill in the field"),
  }),
  execute: async ({ selector, value }: { selector: string; value: string }) => {
    const result = await executeScriptInActiveTab(
      (sel: string, val: string) => {
        const element = document.querySelector(sel);
        if (!element) {
          return { success: false, error: "Element not found" };
        }
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ) {
          element.value = val;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return { success: true };
        }
        return { success: false, error: "Element is not an input field" };
      },
      [selector, value],
    );

    if (!result?.success) {
      throw new Error(result?.error ?? "Failed to fill form field");
    }

    return { success: true, selector, value };
  },
});
