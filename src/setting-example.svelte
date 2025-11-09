<script lang="ts">
    import SettingPanel from "./libs/components/setting-panel.svelte";
    import {pushErrMsg, pushMsg, testS3Connection} from "@/api";

    let groups: string[] = ["🌈 s3 设置"];
    let focusGroup = groups[0];
    let testing = false; // 添加测试状态标记
    let panelKey = 0; // 用于强制重新渲染组件

    let group1Items: ISettingItem[] = [
        {
            type: 'textinput',
            title: 'endpoint',
            description: 'endpoint地址 (例如: https://s3.amazonaws.com 或 https://oss-cn-hangzhou.aliyuncs.com)',
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
            key: 'test',
            value: '',
            button: {
                label: testing ? "测试中..." : "测试连接",
                callback: async () => {
                    await testConnection();
                }
            }
        },
        {
            type: 'button',
            title: '保存',
            description: '保存配置项',
            key: 'save',
            value: '',
            button: {
                label: '保存',
                callback: async () => {
                    await pushMsg('正在保存配置项...', 2000);
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

                    await pushMsg('保存成功！', 2000);
                }
            }
        }
    ];

    // 从配置项中获取当前值的辅助函数
    function getValue(key: string): string {
        const item = group1Items.find(item => item.key === key);
        return item ? item.value : '';
    }

    // S3连接测试函数
    async function testConnection() {
        if (testing) {
            return; // 防止重复点击
        }

        testing = true;

        try {
            // 更新按钮状态
            const testButtonItem = group1Items.find(item => item.key === 'test');
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
            const result = await testS3Connection(
                endpoint.trim(),
                accessKey.trim(),
                secretKey.trim(),
                bucket.trim(),
                region.trim()
            );

            console.log('S3 connection test result:', result);

        } catch (error) {
            console.error('S3连接测试异常:', error);
            const errorMessage = error.message || '连接测试失败: 未知错误';
            await pushErrMsg(errorMessage, 8000);
        } finally {
            testing = false;

            // 恢复按钮状态
            const testButtonItem = group1Items.find(item => item.key === 'test');
            if (testButtonItem) {
                testButtonItem.button.label = "测试连接";
                // 强制触发响应式更新
                group1Items = [...group1Items];
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

    // 组件加载时检查S3配置状态
    (async () => {
        try {
            const status = await getS3ConfigStatus();
            if (status.configured) {
                // 填充配置项
                group1Items = group1Items.map(item => {
                    if (status.config[item.key] !== undefined) {
                        return {
                            ...item,
                            value: status.config[item.key]
                        };
                    }
                    return item;
                });

                panelKey++; // 增加key值强制重新渲染
            }
        } catch (error) {
            // 静默处理错误，不显示给用户
            console.log('未找到已保存的配置或加载配置时出错');
        }
    })();

    /********** Events **********/
    interface ChangeEvent {
        group: string;
        key: string;
        value: any;
    }

    const onChanged = ({detail}: CustomEvent<ChangeEvent>) => {
        if (detail.group === groups[0]) {
            console.log('Setting changed:', detail.key, '=', detail.value);

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
            if (detail.key === 'test') {
                // 按钮点击由button.callback处理
                return;
            }

            // setting.set(detail.key, detail.value);
            // Please add your code here
            // Update the plugins setting data, don't forget to call plugin.save() for data persistence
        }
    };

    const onButtonClick = ({detail}: CustomEvent<{ key: string }>) => {
        console.log('Button clicked:', detail.key);

        if (detail.key === 'test') {
            // 测试连接按钮点击事件已经由callback处理
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
