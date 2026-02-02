/**
 * bm.md 渲染服务
 * 与 https://bm.md/docs API 集成
 */

import axios from "axios";

/**
 * bm.md API 配置
 */
const BM_MD_API_BASE_URL = "https://bm.md/api";

/**
 * 创建 axios 实例
 */
const axiosInstance = axios.create({
  baseURL: BM_MD_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * bm.md 配置选项
 */
export interface BmMdOptions {
  /** 是否开启校验和修复 Markdown 源文本 */
  enableLint?: boolean;
  /** 是否启用脚注链接 */
  enableFootnoteLinks?: boolean;
  /** 脚注标签名称 */
  footnoteLabel?: string;
  /** 是否在新窗口打开链接 */
  openLinksInNewWindow?: boolean;
  /** 引用标题 */
  referenceTitle?: string;
  /** 代码块高亮主题 ID */
  codeTheme?: string;
  /** Markdown 排版样式 ID */
  markdownStyle?: string;
  /** 目标发布平台 */
  platform?: string;
  /** 自定义 CSS */
  customCss?: string;
}

/**
 * bm.md 渲染结果
 */
export interface BmMdRenderResult {
  /** 渲染后的 HTML 内容 */
  html?: string;
  /** 渲染后的 Markdown 内容 */
  markdown?: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 默认 bm.md 配置
 */
export const defaultBmMdOptions: BmMdOptions = {
  enableLint: false,
  enableFootnoteLinks: true,
  footnoteLabel: "Footnotes",
  openLinksInNewWindow: true,
  referenceTitle: "References",
  codeTheme: "kimbie-light",
  markdownStyle: "ayu-light",
  platform: "html",
  customCss: "",
};

/**
 * 渲染 Markdown 为 HTML（通过 bm.md API）
 * @param markdown Markdown 内容
 * @param options 渲染选项
 * @returns 渲染结果
 */
export async function renderMarkdownToHtml(
  markdown: string,
  options: BmMdOptions = defaultBmMdOptions,
): Promise<BmMdRenderResult> {
  try {
    const response = await axiosInstance.post("/render", {
      markdown,
      ...options,
    });

    if (response.data && response.data.success) {
      return {
        html: response.data.html,
        success: true,
      };
    } else {
      return {
        success: false,
        error: response.data?.error || "渲染失败",
      };
    }
  } catch (error) {
    console.error("bm.md 渲染失败:", error);
    return {
      success: false,
      error: error.message || "网络请求失败",
    };
  }
}

/**
 * 渲染 Markdown 为 Markdown（通过 bm.md API，用于校验和修复）
 * @param markdown Markdown 内容
 * @param options 渲染选项
 * @returns 渲染结果
 */
export async function renderMarkdownToMarkdown(
  markdown: string,
  options: BmMdOptions = defaultBmMdOptions,
): Promise<BmMdRenderResult> {
  try {
    const response = await axiosInstance.post("/render/markdown", {
      markdown,
      ...options,
    });

    if (response.data && response.data.success) {
      return {
        markdown: response.data.markdown,
        success: true,
      };
    } else {
      return {
        success: false,
        error: response.data?.error || "渲染失败",
      };
    }
  } catch (error) {
    console.error("bm.md 渲染失败:", error);
    return {
      success: false,
      error: error.message || "网络请求失败",
    };
  }
}

/**
 * 使用 bm.md 渲染并导出到剪切板
 * @param markdown Markdown 内容
 * @param options 渲染选项
 * @returns 渲染后的 HTML 内容
 */
export async function renderAndCopyToClipboard(
  markdown: string,
  options: BmMdOptions = defaultBmMdOptions,
): Promise<string | null> {
  try {
    const result = await renderMarkdownToHtml(markdown, options);

    if (result.success && result.html) {
      await navigator.clipboard.writeText(result.html);
      return result.html;
    } else {
      throw new Error(result.error || "渲染失败");
    }
  } catch (error) {
    console.error("渲染并复制到剪切板失败:", error);
    throw error;
  }
}

/**
 * 使用 bm.md 渲染并下载为 HTML 文件
 * @param markdown Markdown 内容
 * @param options 渲染选项
 * @param filename 文件名（可选）
 * @returns 文件名
 */
export async function renderAndDownloadHtml(
  markdown: string,
  options: BmMdOptions = defaultBmMdOptions,
  filename?: string,
): Promise<string> {
  try {
    const result = await renderMarkdownToHtml(markdown, options);

    if (result.success && result.html) {
      // 生成文件名
      const finalFilename = filename || `export-${Date.now()}.html`;

      // 创建 HTML 内容
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Document</title>
  ${options.customCss ? `<style>${options.customCss}</style>` : ""}
</head>
<body>
  ${result.html}
</body>
</html>`;

      const blob = new Blob([htmlContent], {
        type: "text/html;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const a = document.createElement("a");
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();

      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      return finalFilename;
    } else {
      throw new Error(result.error || "渲染失败");
    }
  } catch (error) {
    console.error("渲染并下载 HTML 失败:", error);
    throw error;
  }
}
