/**
 * 上传服务
 * 统一处理 S3 和 PicList 的文件上传
 */

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { showMessage } from "siyuan";
import { initS3Client, uploadToPicList, getFileBlob } from "@/api";

/**
 * 上传方法枚举
 */
export enum UploadMethod {
  S3 = "s3",
  PicList = "piclist",
}

/**
 * 上传结果
 */
export interface UploadResult {
  /** 原始路径 */
  originalPath: string;
  /** 上传后的 URL */
  url: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 上传选项
 */
export interface UploadOptions {
  /** 上传方法 */
  method: UploadMethod;
  /** S3 配置（如果使用 S3） */
  s3Config?: any;
  /** PicList 配置（如果使用 PicList） */
  picListConfig?: any;
  /** 是否显示成功消息 */
  showSuccessMessage?: boolean;
  /** 并行上传（仅 S3 支持） */
  parallel?: boolean;
}

/**
 * 上传单个文件到 S3
 * @param filePath 文件路径
 * @param s3Config S3 配置
 * @returns 上传结果
 */
async function uploadFileToS3(
  filePath: string,
  s3Config: any,
): Promise<UploadResult> {
  try {
    // 处理 URL 编码的空格
    let processedPath = filePath;
    if (processedPath.includes("%20")) {
      processedPath = processedPath.replace(/%20/g, " ");
    }

    // 获取文件数据
    const fileData = await getFileBlob("/data/" + processedPath);
    const fileDataBuffer = new Uint8Array(await fileData.arrayBuffer());

    if (!fileData) {
      throw new Error(`无法获取文件数据: ${filePath}`);
    }

    // 初始化 S3 客户端
    const client = initS3Client(
      s3Config.endpoint,
      s3Config.accessKey,
      s3Config.secretKey,
      s3Config.region || "us-east-1",
    );

    // 生成 S3 文件路径
    const fileName = processedPath.split("/").pop() || "unnamed-file";
    const s3Key = `siyuan-assets/${fileName}`;

    // 上传到 S3
    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: s3Key,
      Body: fileDataBuffer,
      ContentType: fileData.type,
    });

    await client.send(command);

    // 生成公共访问 URL
    const s3Url = `${s3Config.endpoint}/${s3Config.bucket}/${s3Key}`;

    console.log(`文件 ${filePath} 已上传到 ${s3Url}`);

    return {
      originalPath: filePath,
      url: s3Url,
      success: true,
    };
  } catch (error) {
    console.error(`上传文件 ${filePath} 到 S3 失败:`, error);
    return {
      originalPath: filePath,
      url: "",
      success: false,
      error: error.message || "未知错误",
    };
  }
}

/**
 * 上传单个文件到 PicList
 * @param filePath 文件路径
 * @param picListConfig PicList 配置
 * @returns 上传结果
 */
async function uploadFileToPicList(
  filePath: string,
  picListConfig: any,
): Promise<UploadResult> {
  try {
    // 处理 URL 编码的空格
    let processedPath = filePath;
    if (processedPath.includes("%20")) {
      processedPath = processedPath.replace(/%20/g, " ");
    }

    // 获取文件数据
    const fileData = await getFileBlob("/data/" + processedPath);
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // 上传到 PicList
    const piclistUrl = await uploadToPicList(
      fileBuffer,
      picListConfig.piclistServerUrl,
      picListConfig.piclistApiKey,
      picListConfig.piclistFileField || "image",
    );

    console.log(`文件 ${filePath} 已上传到 ${piclistUrl}`);

    return {
      originalPath: filePath,
      url: piclistUrl,
      success: true,
    };
  } catch (error) {
    console.error(`上传文件 ${filePath} 到 PicList 失败:`, error);
    return {
      originalPath: filePath,
      url: "",
      success: false,
      error: error.message || "未知错误",
    };
  }
}

/**
 * 上传多个文件
 * @param filePaths 文件路径数组
 * @param options 上传选项
 * @returns 上传结果数组
 */
export async function uploadFiles(
  filePaths: string[],
  options: UploadOptions,
): Promise<UploadResult[]> {
  const {
    method,
    s3Config,
    picListConfig,
    showSuccessMessage = true,
    parallel = true,
  } = options;

  if (filePaths.length === 0) {
    showMessage("没有找到需要上传的文件");
    return [];
  }

  let results: UploadResult[] = [];

  if (method === UploadMethod.S3) {
    if (
      !s3Config ||
      !s3Config.endpoint ||
      !s3Config.accessKey ||
      !s3Config.secretKey ||
      !s3Config.bucket
    ) {
      throw new Error("S3 配置不完整，请先配置 S3 设置");
    }

    if (parallel) {
      // 并行上传
      const uploadPromises = filePaths.map((filePath) =>
        uploadFileToS3(filePath, s3Config),
      );
      results = await Promise.all(uploadPromises);
    } else {
      // 串行上传
      results = [];
      for (const filePath of filePaths) {
        const result = await uploadFileToS3(filePath, s3Config);
        results.push(result);
      }
    }

    if (showSuccessMessage) {
      const successCount = results.filter((r) => r.success).length;
      showMessage(`S3 文件上传完成！(${successCount}/${filePaths.length})`);
    }
  } else if (method === UploadMethod.PicList) {
    if (!picListConfig || !picListConfig.piclistServerUrl) {
      throw new Error("PicList 配置不完整，请先配置 PicList 设置");
    }

    // PicList 建议串行上传，避免服务器并发问题
    results = [];
    for (const filePath of filePaths) {
      const result = await uploadFileToPicList(filePath, picListConfig);
      results.push(result);
    }

    if (showSuccessMessage) {
      const successCount = results.filter((r) => r.success).length;
      showMessage(
        `PicList 文件上传完成！(${successCount}/${filePaths.length})`,
      );
    }
  } else {
    throw new Error("未知的上传方法");
  }

  // 检查是否有失败的上传
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.error("部分文件上传失败:", failures);
  }

  return results;
}

/**
 * 替换 Markdown 内容中的图片链接
 * @param content 原始 Markdown 内容
 * @param uploadResults 上传结果数组
 * @returns 替换后的 Markdown 内容
 */
export function replaceImageLinks(
  content: string,
  uploadResults: UploadResult[],
): string {
  let updatedContent = content;

  // 创建成功上传的路径到 URL 的映射
  const pathToUrlMap = new Map<string, string>();
  uploadResults.forEach((result) => {
    if (result.success && result.url) {
      pathToUrlMap.set(result.originalPath, result.url);
    }
  });

  // 替换内容中的图片链接
  pathToUrlMap.forEach((newUrl, originalPath) => {
    // 转义特殊字符以安全地用于正则表达式
    const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`!\\[.*?\\]\\(${escapedPath}\\)`, "g");
    updatedContent = updatedContent.replace(regex, (match) => {
      // 提取原始的 alt 文本
      const altText = match.match(/!\[(.*?)\]/)?.[1] || "";
      return `![${altText}](${newUrl})`;
    });
  });

  return updatedContent;
}

/**
 * 处理 Markdown 内容（上传图片 + 替换链接）
 * @param content Markdown 内容
 * @param filePaths 文件路径数组
 * @param options 上传选项
 * @returns 处理后的 Markdown 内容
 */
export async function processMarkdownWithUpload(
  content: string,
  filePaths: string[],
  options: UploadOptions,
): Promise<string | null> {
  try {
    // 上传文件
    const uploadResults = await uploadFiles(filePaths, options);

    // 替换链接
    return replaceImageLinks(content, uploadResults);
  } catch (error) {
    console.error("处理 Markdown 时发生错误:", error);
    showMessage("处理失败: " + error.message);
    return null;
  }
}
