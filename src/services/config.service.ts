/**
 * 配置管理服务
 * 统一处理插件配置的加载、保存和验证
 */

export interface ConfigServiceOptions<T> {
  /** 配置文件名 */
  filename: string;
  /** 默认配置值 */
  defaultConfig: T;
  /** 插件实例，用于加载数据 */
  plugin: any;
  /** 配置验证函数（可选） */
  validator?: (config: T) => boolean;
}

/**
 * 创建配置服务实例
 */
export function createConfigService<T>(options: ConfigServiceOptions<T>) {
  const { filename, defaultConfig, plugin, validator } = options;

  /**
   * 加载配置
   */
  async function loadConfig(): Promise<T> {
    try {
      const config = await plugin.loadData(filename);
      if (config) {
        console.log(`Loaded ${filename}:`, config);
        return config;
      }
    } catch (error) {
      console.log(`Error loading ${filename}:`, error);
    }
    // 返回默认配置的深拷贝
    return JSON.parse(JSON.stringify(defaultConfig));
  }

  /**
   * 保存配置
   */
  async function saveConfig(config: T): Promise<void> {
    try {
      await plugin.saveData(filename, config);
      console.log(`Saved ${filename}:`, config);
      // 更新插件实例中的数据
      plugin.data = { ...plugin.data, ...config };
    } catch (error) {
      console.error(`Failed to save ${filename}:`, error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  function validateConfig(config: T): boolean {
    if (validator) {
      return validator(config);
    }
    return true;
  }

  /**
   * 获取配置
   */
  function getConfig(): T | null {
    return plugin.data || null;
  }

  /**
   * 检查配置是否已设置
   */
  function isConfigured(): boolean {
    const config = getConfig();
    if (validator) {
      return validateConfig(config);
    }
    return !!config;
  }

  return {
    loadConfig,
    saveConfig,
    validateConfig,
    getConfig,
    isConfigured,
  };
}

/**
 * 创建配置消息处理器
 * 自动处理 saveXxxConfig 和 getXxxConfigStatus 消息
 */
export function createConfigMessageHandlers(
  configName: string,
  configService: ReturnType<typeof createConfigService<any>>,
) {
  const saveCmd = `save${configName}Config`;
  const getStatusCmd = `get${configName}ConfigStatus`;
  const returnStatusCmd = `return${configName}ConfigStatus`;

  return {
    saveCmd,
    getStatusCmd,
    returnStatusCmd,
    handleSave: async (event: MessageEvent) => {
      if (event.data.cmd === saveCmd) {
        try {
          await configService.saveConfig(event.data.data);
        } catch (error) {
          console.error(`Failed to handle ${saveCmd}:`, error);
        }
      }
    },
    handleGetStatus: async (event: MessageEvent) => {
      if (event.data.cmd === getStatusCmd) {
        try {
          const config = configService.getConfig();
          const configured = configService.isConfigured();

          console.log(`Returning ${configName} config status:`, {
            configured,
            config,
          });

          event.source.postMessage(
            {
              cmd: returnStatusCmd,
              data: {
                configured,
                config: config || {},
              },
            },
            { targetOrigin: "*" },
          );
        } catch (error) {
          console.error(`Failed to handle ${getStatusCmd}:`, error);
          event.source.postMessage(
            {
              cmd: returnStatusCmd,
              data: {
                configured: false,
                config: {},
              },
            },
            { targetOrigin: "*" },
          );
        }
      }
    },
  };
}

// S3 配置相关
export interface S3Config {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  mdPrefix: string;
  mdSuffix: string;
}

export const defaultS3Config: S3Config = {
  endpoint: "",
  accessKey: "",
  secretKey: "",
  bucket: "",
  region: "us-east-1",
  mdPrefix: "",
  mdSuffix: "",
};

export function validateS3Config(config: S3Config): boolean {
  return !!(
    config?.endpoint &&
    config?.accessKey &&
    config?.secretKey &&
    config?.bucket
  );
}

// PicList 配置相关
export interface PicListConfig {
  piclistServerUrl: string;
  piclistApiKey: string;
  piclistFileField: string;
  piclistMdPrefix: string;
  piclistMdSuffix: string;
}

export const defaultPicListConfig: PicListConfig = {
  piclistServerUrl: "http://127.0.0.1:36677",
  piclistApiKey: "",
  piclistFileField: "image",
  piclistMdPrefix: "",
  piclistMdSuffix: "",
};

export function validatePicListConfig(config: PicListConfig): boolean {
  return !!config?.piclistServerUrl;
}

// 上传方式配置相关
export interface UploadMethodConfig {
  uploadMethod: "s3" | "piclist";
}

export const defaultUploadMethodConfig: UploadMethodConfig = {
  uploadMethod: "s3",
};

// bm.md 配置相关
export interface BmMdConfig {
  enableLint: boolean;
  enableFootnoteLinks: boolean;
  footnoteLabel: string;
  openLinksInNewWindow: boolean;
  referenceTitle: string;
  codeTheme: string;
  markdownStyle: string;
  platform: string;
  customCss: string;
}

export const defaultBmMdConfig: BmMdConfig = {
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
