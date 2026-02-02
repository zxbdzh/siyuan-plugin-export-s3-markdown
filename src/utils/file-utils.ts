import axios from "axios";

/**
 * 获取文档标题
 * @param id 文档ID
 * @returns 文档标题，如果获取失败则返回空字符串
 */
export async function getDocTitle(id: string): Promise<string> {
  try {
    const response = await axios.post("/api/block/getBlockInfo", {
      id: id,
    });
    if (response.data && response.data.data) {
      return response.data.data.rootTitle || response.data.data.name || id;
    }
  } catch (error) {
    console.warn("获取文档标题失败，使用默认文件名:", error);
  }
  return id;
}

/**
 * 清理文件名中的非法字符
 * @param filename 原始文件名
 * @returns 清理后的文件名
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[/\\?%*:|"<>]/g, "-");
}

/**
 * 生成带时间戳的文件名
 * @param prefix 文件名前缀（可选）
 * @returns 带时间戳的文件名
 */
export function generateTimestampFilename(prefix: string = "export"): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  return `${prefix}-${timestamp}.md`;
}

/**
 * 从 Markdown 内容中提取图片文件路径
 * @param content Markdown 内容
 * @returns 图片文件路径数组
 */
export function getFilePathsFromMd(content: string): string[] {
  return (
    content.match(/!\[.*?]\((.*?)\)/g)?.map((match) => {
      return match.match(/\((.*?)\)/)[1];
    }) ?? []
  );
}
