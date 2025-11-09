# SiYuan Plugin Export S3 Markdown

一个用于将思源笔记导出为 Markdown 并上传到 S3 兼容存储的插件。

## 功能特性

- 将思源笔记文档导出为标准 Markdown 格式
- 自动上传文档中的图片资源到 S3 存储服务
- 支持多种 S3 兼容服务（AWS S3、阿里云 OSS、腾讯云 COS、MinIO 等）
- 批量导出多个文档为 ZIP 包
- 可配置的版权前缀和后缀
- 支持自定义 S3 存储路径后缀

## 使用教程

[bilibili 视频教程](https://b23.tv/WTEFxxz)

## 安装方式

1. 在思源笔记中打开集市
2. 搜索 "Export S3 Markdown" 插件
3. 下载并启用插件

## 配置说明

### S3 配置

在插件设置中配置以下信息：

- **endpoint**: S3 服务地址（例如：https://s3.amazonaws.com）
- **accessKey**: 访问密钥 ID
- **secretKey**: 私有访问密钥
- **bucket**: 存储桶名称
- **region**: AWS 区域（可选，默认 us-east-1）
- **版权前缀**: 在导出的 Markdown 文件顶部添加的内容
- **版权后缀**: 在导出的 Markdown 文件底部添加的内容

### 支持的服务

- AWS S3
- 阿里云 OSS
- 腾讯云 COS
- MinIO
- 其他 S3 兼容存储服务

## 使用方法

### 单文档导出

1. 在文档树中右键点击要导出的文档
2. 选择 "导出md文件" 或 "导出md文件到剪切板"
3. 插件会自动上传图片到配置的 S3 存储并更新 Markdown 中的链接

### 批量导出

1. 在文档树中选择多个文档
2. 右键选择 "批量导出为ZIP"
3. 插件会处理所有选中的文档并打包为 ZIP 文件

### 仅上传图片

1. 在文档树中右键点击文档
2. 选择 "仅上传图床"
3. 插件仅上传文档中的图片资源到 S3

## 开发说明

### 技术栈

- 使用 Vite + TypeScript 开发
- 基于思源笔记插件 API
- 集成 AWS SDK for S3 操作
- 使用 JSZip 进行批量导出打包

### 构建部署

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev

# 生产构建
pnpm run build
```


### 目录结构

```
src/
├── index.ts          # 插件主入口
├── api.ts            # S3 和文件操作 API
├── setting-example.svelte  # 设置界面
└── libs/
    └── setting-utils.ts    # 设置工具类
```


## 注意事项

1. 确保 S3 配置信息正确，包括访问权限
2. 导出的 Markdown 文件会自动去除思源笔记的 front matter
3. 图片上传后会替换为 S3 公共访问链接
4. 建议在使用前先测试 S3 连接配置

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=zxbdzh/siyuan-plugin-export-s3-markdown&type=date&legend=top-left)](https://www.star-history.com/#zxbdzh/siyuan-plugin-export-s3-markdown&type=date&legend=top-left)
