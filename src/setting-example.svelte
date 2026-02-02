<script lang="ts">
    import SettingPanel from "./libs/components/setting-panel.svelte";
    import {pushErrMsg, pushMsg, testS3Connection, testPicListConnection} from "@/api";

    let groups: string[] = ["🌈 s3 设置", "🌈 PicList 设置", "🔧 上传方式选择", "🌈 bm.md 渲染设置"];
    let focusGroup = groups[0];
    let testing = false; // 添加测试状态标记
    let piclistTesting = false; // PicList测试状态标记
    let panelKey = 0; // 用于强制重新渲染组件

    let group1Items: ISettingItem[] = [
        {
            type: 'textinput',
            title: 'endpoint',
            description: 'endpoint地址 (例如: https://s3.amazonaws.com 或 http://域名.oss-cn-beijing.aliyuncs.com),暂只支持虚拟机主机格式',
            key: 'endpoint',
            value: '',
            placeholder: '请输入s3的endpoint，支持AWS S3、阿里云OSS、腾讯云COS、MinIO等'
        },
        {
            type: 'textinput',
            title: 'accessKey',
            description: 'accessKey (访问密钥ID)',
            key: 'accessKey',
            value: '',
            placeholder: '请输入s3的accessKey'
        },
        {
            type: 'textinput',
            title: 'secretKey',
            description: 'secretKey (私有访问密钥)',
            key: 'secretKey',
            value: '',
            placeholder: '请输入s3的secretKey'
        },
        {
            type: 'textinput',
            title: '桶',
            description: '桶名称 (存储空间名称)',
            key: 'bucket',
            value: '',
            placeholder: '请输入s3的bucket名称'
        },
        {
            type: 'textinput',
            title: 'aws区域',
            description: 'AWS区域 (可选，默认us-east-1)',
            key: 'region',
            value: 'us-east-1',
            placeholder: '请输入AWS区域，如us-east-1、cn-north-1等'
        },
        {
            type: 'textarea',
            title: '版权前缀',
            description: '版权前缀(可留空，显示自定义内容在导出markdown最上方)',
            key: 'mdPrefix',
            value: '',
            placeholder: '请输入mdPrefix',
        },
        {
            type: 'textarea',
            title: '版权后缀',
            description: '版权后缀(可留空，显示自定义内容在导出markdown最下方)',
            key: 'mdSuffix',
            value: '',
            placeholder: '请输入mdSuffix',
        },
        {
            type: 'button',
            title: '测试连接',
            description: '测试S3连接是否正常，包括存储桶访问性和读写权限验证',
            key: 'testS3',
            value: '',
            button: {
                label: testing ? "测试中..." : "测试连接",
                callback: async () => {
                    await testS3ConnectionCall();
                }
            }
        },
        {
            type: 'button',
            title: '保存',
            description: '保存S3配置项',
            key: 'saveS3',
            value: '',
            button: {
                label: '保存S3配置',
                callback: async () => {
                    await pushMsg('正在保存S3配置项...', 2000);
                    const data = {
                        endpoint: getValue('endpoint'),
                        accessKey: getValue('accessKey'),
                        secretKey: getValue('secretKey'),
                        bucket: getValue('bucket'),
                        region: getValue('region'),
                        mdPrefix: getValue('mdPrefix'),
                        mdSuffix: getValue('mdSuffix')
                    }

                    console.log('Saving S3 config data:', data);

                    // 通过postMessage发送数据给插件保存
                    window.parent.postMessage({
                        cmd: 'saveS3Config',
                        data: data
                    }, '*');

                    await pushMsg('S3配置保存成功！', 2000);
                }
            }
        }
    ];

    let group2Items: ISettingItem[] = [
        {
            type: 'textinput',
            title: 'PicList服务器地址',
            description: 'PicList内置HTTP服务器地址 (例如: http://127.0.0.1:36677)',
            key: 'piclistServerUrl',
            value: 'http://127.0.0.1:36677',
            placeholder: '请输入PicList服务器地址'
        },
        {
            type: 'textinput',
            title: 'API密钥 (可选)',
            description: '如果PicList服务器启用了鉴权，请输入API密钥',
            key: 'piclistApiKey',
            value: '',
            placeholder: '请输入API密钥，无则留空'
        },
        {
            type: 'textinput',
            title: '上传字段名',
            description: 'HTTP表单上传时使用的文件字段名 (默认: image)',
            key: 'piclistFileField',
            value: 'image',
            placeholder: '默认为 image'
        },
        {
            type: 'textarea',
            title: '版权前缀',
            description: '版权前缀(可留空，显示自定义内容在导出markdown最上方)',
            key: 'piclistMdPrefix',
            value: '',
            placeholder: '请输入mdPrefix',
        },
        {
            type: 'textarea',
            title: '版权后缀',
            description: '版权后缀(可留空，显示自定义内容在导出markdown最下方)',
            key: 'piclistMdSuffix',
            value: '',
            placeholder: '请输入mdSuffix',
        },
        {
            type: 'button',
            title: '测试连接',
            description: '测试PicList服务器连接是否正常',
            key: 'testPiclist',
            value: '',
            button: {
                label: piclistTesting ? "测试中..." : "测试连接",
                callback: async () => {
                    await testPicListConnectionCall();
                }
            }
        },
        {
            type: 'button',
            title: '保存',
            description: '保存PicList配置项',
            key: 'savePiclist',
            value: '',
            button: {
                label: '保存PicList配置',
                callback: async () => {
                    await pushMsg('正在保存PicList配置项...', 2000);
                    const data = {
                        piclistServerUrl: getValueFromGroup('piclistServerUrl', group2Items),
                        piclistApiKey: getValueFromGroup('piclistApiKey', group2Items),
                        piclistFileField: getValueFromGroup('piclistFileField', group2Items),
                        piclistMdPrefix: getValueFromGroup('piclistMdPrefix', group2Items),
                        piclistMdSuffix: getValueFromGroup('piclistMdSuffix', group2Items)
                    }

                    console.log('Saving PicList config data:', data);

                    // 通过postMessage发送数据给插件保存
                    window.parent.postMessage({
                        cmd: 'savePiclistConfig',
                        data: data
                    }, '*');

                    await pushMsg('PicList配置保存成功！', 2000);
                }
            }
        }
    ];

    let group3Items: ISettingItem[] = [
        {
            type: 'select',
            title: '上传方式',
            description: '选择图片上传方式',
            key: 'uploadMethod',
            value: 's3', // 默认使用S3
            options: {
                's3': '使用S3上传',
                'piclist': '使用PicList上传'
            },
            button: {
                label: '保存',
                callback: async () => {
                    await pushMsg('正在保存上传方式选择...', 2000);
                    const uploadMethod = getValueFromGroup('uploadMethod', group3Items);

                    // 通过postMessage发送数据给插件保存
                    window.parent.postMessage({
                        cmd: 'saveUploadMethod',
                        data: { uploadMethod: uploadMethod }
                    }, '*');

                    await pushMsg('上传方式保存成功！', 2000);
                }
            }
        }
    ];

    let group4Items: ISettingItem[] = [
        {
            type: 'checkbox',
            title: '开启校验和修复',
            description: '在渲染前自动校验和修复 Markdown 源文本',
            key: 'enableLint',
            value: false
        },
        {
            type: 'checkbox',
            title: '启用脚注链接',
            description: '是否将文中链接自动转换为脚注形式，便于阅读时查看原始链接',
            key: 'enableFootnoteLinks',
            value: true
        },
        {
            type: 'textinput',
            title: '脚注区域标题',
            description: 'GFM 脚注区域标题',
            key: 'footnoteLabel',
            value: 'Footnotes',
            placeholder: '默认为 Footnotes'
        },
        {
            type: 'checkbox',
            title: '新窗口打开链接',
            description: '是否为所有外部链接添加 target="_blank"，在新窗口打开',
            key: 'openLinksInNewWindow',
            value: true
        },
        {
            type: 'textinput',
            title: '参考区域标题',
            description: '外部链接参考区域标题',
            key: 'referenceTitle',
            value: 'References',
            placeholder: '默认为 References'
        },
        {
            type: 'select',
            title: '代码块高亮主题',
            description: '选择代码块语法高亮使用的主题',
            key: 'codeTheme',
            value: 'kimbie-light',
            options: {
                'kimbie-light': 'Kimbie Light',
                'kimbie-dark': 'Kimbie Dark',
                'catppuccin-frappe': 'Catppuccin Frappe',
                'catppuccin-latte': 'Catppuccin Latte',
                'catppuccin-macchiato': 'Catppuccin Macchiato',
                'catppuccin-mocha': 'Catppuccin Mocha',
                'panda-syntax-dark': 'Panda Syntax Dark',
                'panda-syntax-light': 'Panda Syntax Light',
                'paraiso-dark': 'Paraiso Dark',
                'paraiso-light': 'Paraiso Light',
                'rose-pine': 'Rose Pine',
                'rose-pine-dawn': 'Rose Pine Dawn',
                'tokyo-night-dark': 'Tokyo Night Dark',
                'tokyo-night-light': 'Tokyo Night Light'
            }
        },
        {
            type: 'select',
            title: 'Markdown 排版样式',
            description: '选择 Markdown 文档的排版样式',
            key: 'markdownStyle',
            value: 'ayu-light',
            options: {
                'ayu-light': 'Ayu Light',
                'bauhaus': 'Bauhaus',
                'blueprint': 'Blueprint',
                'botanical': 'Botanical',
                'green-simple': 'Green Simple',
                'maximalism': 'Maximalism',
                'neo-brutalism': 'Neo Brutalism',
                'newsprint': 'Newsprint',
                'organic': 'Organic',
                'playful-geometric': 'Playful Geometric',
                'professional': 'Professional',
                'retro': 'Retro',
                'sketch': 'Sketch',
                'terminal': 'Terminal'
            }
        },
        {
            type: 'select',
            title: '目标发布平台',
            description: '选择渲染后的目标平台格式，会针对平台特性进行适配优化',
            key: 'platform',
            value: 'html',
            options: {
                'html': 'HTML (通用网页)',
                'wechat': '微信公众号',
                'zhihu': '知乎专栏',
                'juejin': '掘金'
            }
        },
        {
            type: 'textarea',
            title: '自定义 CSS',
            description: '自定义 CSS 样式，在主题样式之后应用。选择器需约束在 #bm-md 下，例如：#bm-md h1 { color: red; }',
            key: 'customCss',
            value: '',
            placeholder: '请输入自定义CSS样式，留空则不使用'
        },
        {
            type: 'button',
            title: '保存',
            description: '保存bm.md配置项',
            key: 'saveBmmd',
            value: '',
            button: {
                label: '保存bm.md配置',
                callback: async () => {
                    await pushMsg('正在保存bm.md配置项...', 2000);
                    const data = {
                        enableLint: getValueFromGroup('enableLint', group4Items),
                        enableFootnoteLinks: getValueFromGroup('enableFootnoteLinks', group4Items),
                        footnoteLabel: getValueFromGroup('footnoteLabel', group4Items),
                        openLinksInNewWindow: getValueFromGroup('openLinksInNewWindow', group4Items),
                        referenceTitle: getValueFromGroup('referenceTitle', group4Items),
                        codeTheme: getValueFromGroup('codeTheme', group4Items),
                        markdownStyle: getValueFromGroup('markdownStyle', group4Items),
                        platform: getValueFromGroup('platform', group4Items),
                        customCss: getValueFromGroup('customCss', group4Items)
                    }

                    console.log('Saving bm.md config data:', data);

                    // 通过postMessage发送数据给插件保存
                    window.parent.postMessage({
                        cmd: 'saveBmmdConfig',
                        data: data
                    }, '*');

                    await pushMsg('bm.md配置保存成功！', 2000);
                }
            }
        }
    ];

    // 从配置项中获取当前值的辅助函数
    function getValue(key: string): string {
        const item = group1Items.find(item => item.key === key);
        return item ? item.value : '';
    }

    // 从指定组中获取配置值的辅助函数
    function getValueFromGroup(key: string, group: ISettingItem[]): any {
        const item = group.find(item => item.key === key);
        return item !== undefined ? item.value : '';
    }

    // S3连接测试函数
    async function testS3ConnectionCall() {
        if (testing) {
            return; // 防止重复点击
        }

        testing = true;

        try {
            // 更新按钮状态
            const testButtonItem = group1Items.find(item => item.key === 'testS3');
            if (testButtonItem) {
                testButtonItem.button.label = "测试中...";
                // 强制触发响应式更新
                group1Items = [...group1Items];
                panelKey++; // 增加key值强制重新渲染
            }

            // 获取配置值
            const endpoint = getValue('endpoint');
            const accessKey = getValue('accessKey');
            const secretKey = getValue('secretKey');
            const bucket = getValue('bucket');
            const region = getValue('region') || 'us-east-1';
            const mdPrefix = getValue('mdPrefix');
            const mdSuffix = getValue('mdSuffix');

            console.log('Starting S3 connection test with:', {
                endpoint,
                accessKey: accessKey ? '***' : '',
                secretKey: secretKey ? '***' : '',
                bucket,
                region,
                mdPrefix,
                mdSuffix
            });

            // 基本验证
            if (!endpoint.trim()) {
                throw new Error('请输入endpoint地址');
            }
            if (!accessKey.trim()) {
                throw new Error('请输入accessKey');
            }
            if (!secretKey.trim()) {
                throw new Error('请输入secretKey');
            }
            if (!bucket.trim()) {
                throw new Error('请输入bucket名称');
            }

            // 显示开始测试的消息
            await pushMsg('开始测试S3连接...', 2000);

            // 执行连接测试
            await testS3Connection(
                endpoint.trim(),
                accessKey.trim(),
                secretKey.trim(),
                bucket.trim(),
                region.trim()
            );

        } catch (error) {
            console.error('S3连接测试异常:', error);
            const errorMessage = error.message || '连接测试失败: 未知错误';
            await pushErrMsg(errorMessage, 8000);
        } finally {
            testing = false;

            // 恢复按钮状态
            const testButtonItem = group1Items.find(item => item.key === 'testS3');
            if (testButtonItem) {
                testButtonItem.button.label = "测试连接";
                // 强制触发响应式更新
                group1Items = [...group1Items];
                panelKey++; // 增加key值强制重新渲染
            }
        }
    }

    // PicList连接测试函数
    async function testPicListConnectionCall() {
        if (piclistTesting) {
            return; // 防止重复点击
        }

        piclistTesting = true;

        try {
            // 更新按钮状态
            const testButtonItem = group2Items.find(item => item.key === 'testPiclist');
            if (testButtonItem) {
                testButtonItem.button.label = "测试中...";
                // 强制触发响应式更新
                group2Items = [...group2Items];
                panelKey++; // 增加key值强制重新渲染
            }

            // 获取配置值
            const serverUrl = getValueFromGroup('piclistServerUrl', group2Items);
            const apiKey = getValueFromGroup('piclistApiKey', group2Items);

            console.log('Starting PicList connection test with:', {
                serverUrl,
                apiKey: apiKey ? '***' : ''
            });

            // 基本验证
            if (!serverUrl.trim()) {
                throw new Error('请输入PicList服务器地址');
            }

            // 显示开始测试的消息
            await pushMsg('开始测试PicList连接...', 2000);

            // 执行连接测试
            await testPicListConnection(serverUrl.trim(), apiKey.trim() || undefined);

        } catch (error) {
            console.error('PicList连接测试异常:', error);
            const errorMessage = error.message || '连接测试失败: 未知错误';
            await pushErrMsg(errorMessage, 8000);
        } finally {
            piclistTesting = false;

            // 恢复按钮状态
            const testButtonItem = group2Items.find(item => item.key === 'testPiclist');
            if (testButtonItem) {
                testButtonItem.button.label = "测试连接";
                // 强制触发响应式更新
                group2Items = [...group2Items];
                panelKey++; // 增加key值强制重新渲染
            }
        }
    }

    // 获取S3配置状态的辅助函数
    async function getS3ConfigStatus(): Promise<{ configured: boolean, config: any }> {
        return new Promise((resolve) => {
            // 发送消息请求获取S3配置状态
            window.parent.postMessage({cmd: 'getS3ConfigStatus'}, '*');

            // 监听返回结果
            const handleResponse = (event: MessageEvent) => {
                if (event.data.cmd === 'returnS3ConfigStatus') {
                    window.removeEventListener('message', handleResponse);
                    resolve(event.data.data);
                }
            };

            window.addEventListener('message', handleResponse);
        });
    }

    // 获取PicList配置状态的辅助函数
    async function getPicListConfigStatus(): Promise<{ configured: boolean, config: any }> {
        return new Promise((resolve) => {
            // 发送消息请求获取PicList配置状态
            window.parent.postMessage({cmd: 'getPicListConfigStatus'}, '*');

            // 监听返回结果
            const handleResponse = (event: MessageEvent) => {
                if (event.data.cmd === 'returnPicListConfigStatus') {
                    window.removeEventListener('message', handleResponse);
                    resolve(event.data.data);
                }
            };

            window.addEventListener('message', handleResponse);
        });
    }

    // 获取上传方式配置状态的辅助函数
    async function getUploadMethodStatus(): Promise<{ uploadMethod: string }> {
        return new Promise((resolve) => {
            // 发送消息请求获取上传方式配置状态
            window.parent.postMessage({cmd: 'getUploadMethodStatus'}, '*');

            // 监听返回结果
            const handleResponse = (event: MessageEvent) => {
                if (event.data.cmd === 'returnUploadMethodStatus') {
                    window.removeEventListener('message', handleResponse);
                    resolve(event.data.data);
                }
            };

            window.addEventListener('message', handleResponse);
        });
    }

    // 获取bm.md配置状态的辅助函数
    async function getBmmdConfigStatus(): Promise<{ config: any }> {
        return new Promise((resolve) => {
            // 发送消息请求获取bm.md配置状态
            window.parent.postMessage({cmd: 'getBmmdConfigStatus'}, '*');

            // 监听返回结果
            const handleResponse = (event: MessageEvent) => {
                if (event.data.cmd === 'returnBmmdConfigStatus') {
                    window.removeEventListener('message', handleResponse);
                    resolve(event.data.data);
                }
            };

            window.addEventListener('message', handleResponse);
        });
    }

// 组件加载时检查配置状态
    (async () => {
        try {
            // 检查S3配置状态
            const s3Status = await getS3ConfigStatus();
            if (s3Status.configured && s3Status.config) {
                // 填充S3配置项
                group1Items = group1Items.map(item => {
                    if (s3Status.config && s3Status.config[item.key] !== undefined) {
                        return {
                            ...item,
                            value: s3Status.config[item.key]
                        };
                    }
                    return item;
                });

                panelKey++; // 增加key值强制重新渲染
            }

            // 检查PicList配置状态
            const piclistStatus = await getPicListConfigStatus();
            if (piclistStatus.configured && piclistStatus.config) {
                // 填充PicList配置项
                group2Items = group2Items.map(item => {
                    if (piclistStatus.config && piclistStatus.config[item.key] !== undefined) {
                        return {
                            ...item,
                            value: piclistStatus.config[item.key]
                        };
                    }
                    return item;
                });

                panelKey++; // 增加key值强制重新渲染
            }

            // 检查上传方式配置状态
            const uploadMethodStatus = await getUploadMethodStatus();
            if (uploadMethodStatus && uploadMethodStatus.uploadMethod) {
                // 填充上传方式配置项
                group3Items = group3Items.map(item => {
                    if (item.key === 'uploadMethod') {
                        return {
                            ...item,
                            value: uploadMethodStatus.uploadMethod
                        };
                    }
                    return item;
                });

                panelKey++; // 增加key值强制重新渲染
            }

            // 检查bm.md配置状态
            const bmmdStatus = await getBmmdConfigStatus();
            if (bmmdStatus && bmmdStatus.config) {
                // 填充bm.md配置项
                group4Items = group4Items.map(item => {
                    if (bmmdStatus.config && bmmdStatus.config[item.key] !== undefined) {
                        return {
                            ...item,
                            value: bmmdStatus.config[item.key]
                        };
                    }
                    return item;
                });

                panelKey++; // 增加key值强制重新渲染
            }
        } catch (error) {
            // 静默处理错误，不显示给用户
            console.log('未找到已保存的配置或加载配置时出错', error);
        }
    })();

    /********** Events **********/
    interface ChangeEvent {
        group: string;
        key: string;
        value: any;
    }

    const onChanged = ({detail}: CustomEvent<ChangeEvent>) => {
        if (detail.group === groups[0]) { // S3设置
            console.log('S3 Setting changed:', detail.key, '=', detail.value);

            // 更新对应配置项的值
            group1Items = group1Items.map(item => {
                if (item.key === detail.key) {
                    return {
                        ...item,
                        value: detail.value
                    };
                }
                return item;
            });

            panelKey++; // 增加key值强制重新渲染

            // 如果是测试按钮，触发相应的回调
            if (detail.key === 'testS3') {
                // 按钮点击由button.callback处理
                return;
            }

        } else if (detail.group === groups[1]) { // PicList设置
            console.log('PicList Setting changed:', detail.key, '=', detail.value);

            // 更新对应配置项的值
            group2Items = group2Items.map(item => {
                if (item.key === detail.key) {
                    return {
                        ...item,
                        value: detail.value
                    };
                }
                return item;
            });

            panelKey++; // 增加key值强制重新渲染

            // 如果是测试按钮，触发相应的回调
            if (detail.key === 'testPiclist') {
                // 按钮点击由button.callback处理
                return;
            }

} else if (detail.group === groups[2]) { // 上传方式选择
            console.log('Upload Method Setting changed:', detail.key, '=', detail.value);

            // 更新对应配置项的值
            group3Items = group3Items.map(item => {
                if (item.key === detail.key) {
                    return {
                        ...item,
                        value: detail.value
                    };
                }
                return item;
            });

            panelKey++; // 增加key值强制重新渲染

            // 立即保存上传方式选择配置
            const uploadMethod = detail.value;
            window.parent.postMessage({
                cmd: 'saveUploadMethod',
                data: { uploadMethod: uploadMethod }
            }, '*');
        } else if (detail.group === groups[3]) { // bm.md渲染设置
            console.log('bm.md Setting changed:', detail.key, '=', detail.value);

            // 更新对应配置项的值
            group4Items = group4Items.map(item => {
                if (item.key === detail.key) {
                    return {
                        ...item,
                        value: detail.value
                    };
                }
                return item;
            });

            panelKey++; // 增加key值强制重新渲染
        }

        // setting.set(detail.key, detail.value);
        // Please add your code here
        // Update the plugins setting data, don't forget to call plugin.save() for data persistence
    };

    const onButtonClick = ({detail}: CustomEvent<{ key: string }>) => {
        console.log('Button clicked:', detail.key);

        if (detail.key === 'testS3') {
            // S3测试连接按钮点击事件已经由callback处理
            // 这里可以添加额外的处理逻辑
        } else if (detail.key === 'testPiclist') {
            // PicList测试连接按钮点击事件已经由callback处理
            // 这里可以添加额外的处理逻辑
        }
    };
</script>

<div class="fn__flex-1 fn__flex config__panel">
    <ul class="b3-tab-bar b3-list b3-list--background">
        {#each groups as group}
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <li
                    data-name="editor"
                    class:b3-list-item--focus={group === focusGroup}
                    class="b3-list-item"
                    on:click={() => {
                    focusGroup = group;
                }}
                    on:keydown={() => {}}
            >
                <span class="b3-list-item__text">{group}</span>
            </li>
        {/each}
    </ul>
    <div class="config__tab-wrap">
        <SettingPanel
                group={groups[0]}
                settingItems={group1Items}
                display={focusGroup === groups[0]}
                on:changed={onChanged}
                on:click={onButtonClick}
        >
            <div class="fn__flex b3-label">
                💡 s3设置.
            </div>
        </SettingPanel>
        <SettingPanel
                group={groups[1]}
                settingItems={group2Items}
                display={focusGroup === groups[1]}
                on:changed={onChanged}
                on:click={onButtonClick}
        >
            <div class="fn__flex b3-label">
                💡 PicList设置.
            </div>
        </SettingPanel>
        <SettingPanel
                group={groups[2]}
                settingItems={group3Items}
                display={focusGroup === groups[2]}
                on:changed={onChanged}
                on:click={onButtonClick}
        >
            <div class="fn__flex b3-label">
                💡 上传方式选择.
            </div>
        </SettingPanel>
        <SettingPanel
                group={groups[3]}
                settingItems={group4Items}
                display={focusGroup === groups[3]}
                on:changed={onChanged}
                on:click={onButtonClick}
        >
            <div class="fn__flex b3-label">
                💡 bm.md渲染设置.
            </div>
        </SettingPanel>
    </div>
</div>

<style lang="scss">
  .config__panel {
    height: 100%;
  }

  .config__panel > ul > li {
    padding-left: 1rem;
  }

   .config__panel :global(textarea) {
     width: 45% !important;
     min-height: 50px;         // 最小高度
     max-height: 70px;        // 最大高度
     overflow-y: auto;         // 垂直滚动条
     resize: vertical;         // 允许垂直调整大小
     white-space: pre-wrap;    // 保持换行符
   }
   </style>