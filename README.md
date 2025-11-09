# SiYuan Plugin: Export Markdown to S3

[中文版](./README_zh_CN.md)

A plugin for exporting SiYuan Notes documents to Markdown format and uploading them to S3-compatible storage services.


## Features
- Export SiYuan Notes documents to **standard Markdown format**
- Automatically upload image resources in documents to S3 storage services
- Support for multiple S3-compatible services (AWS S3, Alibaba Cloud OSS, Tencent Cloud COS, MinIO, etc.)
- Batch export multiple documents into a ZIP package
- Configurable copyright prefix and suffix
- Support for custom S3 storage path suffixes


## Tutorial
[Bilibili Video Tutorial](https://b23.tv/WTEFxxz) (Note: This is a Chinese-language video platform with practical demonstrations of the plugin)


## Installation
1. Open the **Marketplace** (plugin store) in SiYuan Notes
2. Search for the plugin named "Export S3 Markdown"
3. Download and enable the plugin


## Configuration Instructions

### S3 Configuration
Configure the following information in the plugin settings:

- **endpoint**: S3 service address (e.g., https://s3.amazonaws.com)
- **accessKey**: Access key ID
- **secretKey**: Secret access key
- **bucket**: Bucket name
- **region**: AWS region (optional, default: us-east-1)
- **Copyright Prefix**: Content added to the top of the exported Markdown file
- **Copyright Suffix**: Content added to the bottom of the exported Markdown file


### Supported Services
- AWS S3
- Alibaba Cloud OSS
- Tencent Cloud COS
- MinIO
- Other S3-compatible storage services


## Usage Guide

### Single Document Export
1. Right-click the document you want to export in the **Document Tree**
2. Select "Export as MD File" or "Export MD File to Clipboard"
3. The plugin will automatically upload images to the configured S3 storage and update the image links in the Markdown file


### Batch Export
1. Select multiple documents in the **Document Tree** (hold Ctrl/Command to select)
2. Right-click and choose "Batch Export as ZIP"
3. The plugin will process all selected documents and package them into a ZIP file


### Image-only Upload
1. Right-click the document in the **Document Tree**
2. Select "Upload Only to Image Hosting"
3. The plugin will only upload the image resources in the document to S3 (no Markdown file exported)


## Development Notes

### Tech Stack
- Developed with Vite + TypeScript
- Based on the SiYuan Notes Plugin API
- Integrated with AWS SDK for S3 operations
- Uses JSZip for batch export packaging


### Build & Deployment
```bash
# Install dependencies
pnpm install

# Development mode (hot reload)
pnpm run dev

# Production build
pnpm run build
```  


### Directory Structure
```
src/
├── index.ts          # Plugin main entry
├── api.ts            # S3 and file operation APIs
├── setting-example.svelte  # Settings interface (Svelte component)
└── libs/
    └── setting-utils.ts    # Settings utility functions
```  


## Notes
1. Ensure the S3 configuration (especially access permissions) is correct
2. The exported Markdown file will **automatically remove SiYuan Notes-specific front matter**
3. After images are uploaded, their local links will be replaced with S3 public access links
4. It is recommended to test the S3 connection configuration before use


## Star History
[![Star History Chart](https://api.star-history.com/svg?repos=zxbdzh/siyuan-plugin-export-s3-markdown&type=date&legend=top-left)](https://www.star-history.com/#zxbdzh/siyuan-plugin-export-s3-markdown&type=date&legend=top-left)
