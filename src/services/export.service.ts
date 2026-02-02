/**
 * 导出服务
 * 处理导出到剪切板、文件下载和批量导出
 */

import JSZip from "jszip";
import { showMessage } from "siyuan";
import {
  generateTimestampFilename,
  sanitizeFilename,
} from "@/utils/file-utils";

/**
 * 复制 Markdown 内容到剪切板
 * @param content Markdown 内容
 * @param successMessage 成功提示消息
 */
export async function copyMarkdownToClipboard(
  content: string,
  successMessage: string = "已复制到剪切板",
): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
    showMessage(successMessage);
  } catch (error) {
    console.error("复制到剪切板失败:", error);
    showMessage("复制到剪切板失败: " + error.message);
  }
}

/**
 * 导出 Markdown 为文件下载
 * @param content Markdown 内容
 * @param filename 文件名（可选，不提供则自动生成）
 */
export async function downloadMarkdownFile(
  content: string,
  filename?: string,
): Promise<void> {
  try {
    const finalFilename = filename || generateTimestampFilename();
    const blob = new Blob([content], {
      type: "text/markdown;charset=utf-8",
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

    showMessage("文件已下载");
  } catch (error) {
    console.error("下载文件失败:", error);
    showMessage("下载文件失败: " + error.message);
  }
}

/**
 * 批量导出多个文档为 ZIP
 * @param documents 文档数组，包含 ID 和内容
 */
export async function batchExportToZip(
  documents: Array<{
    id: string;
    content: string;
  }>,
): Promise<void> {
  try {
    const zip = new JSZip();
    const processedFiles: Array<{
      filename: string;
      content: string;
    }> = [];

    // 处理每个文档
    for (const doc of documents) {
      const filename = `${doc.id}.md`;
      processedFiles.push({
        filename,
        content: doc.content,
      });
    }

    // 将所有内容添加到 zip 中
    processedFiles.forEach(({ filename, content }) => {
      zip.file(filename, content);
    });

    // 生成 zip 文件并下载
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateTimestampFilename("export-batch").replace(
      ".md",
      ".zip",
    );
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    showMessage(
      `批量导出完成 (${processedFiles.length}/${documents.length})，已打包为 ZIP 文件`,
    );
  } catch (error) {
    console.error("ZIP 打包失败:", error);
    showMessage("ZIP 打包失败: " + error.message);
  }
}

/**
 * 批量导出多个文档为 ZIP（带标题）
 * @param documents 文档数组，包含 ID、内容和标题
 */
export async function batchExportToZipWithTitles(
  documents: Array<{
    id: string;
    content: string;
    title: string;
  }>,
): Promise<void> {
  try {
    const zip = new JSZip();
    const processedFiles: Array<{
      filename: string;
      content: string;
    }> = [];

    // 处理每个文档
    for (const doc of documents) {
      const filename = sanitizeFilename(doc.title || doc.id);
      processedFiles.push({
        filename: `${filename}.md`,
        content: doc.content,
      });
    }

    // 将所有内容添加到 zip 中
    processedFiles.forEach(({ filename, content }) => {
      zip.file(filename, content);
    });

    // 生成 zip 文件并下载
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateTimestampFilename("export-batch").replace(
      ".md",
      ".zip",
    );
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    showMessage(
      `批量导出完成 (${processedFiles.length}/${documents.length})，已打包为 ZIP 文件`,
    );
  } catch (error) {
    console.error("ZIP 打包失败:", error);
    showMessage("ZIP 打包失败: " + error.message);
  }
}
