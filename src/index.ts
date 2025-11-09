import {
    adaptHotkey,
    confirm,
    Dialog,
    getBackend,
    getFrontend,
    ICard,
    ICardData,
    Menu,
    Plugin,
    Protyle,
    showMessage
} from "siyuan";
import "./index.scss";
import {IMenuItem} from "siyuan/types";

import SettingExample from "@/setting-example.svelte";

import {SettingUtils} from "./libs/setting-utils";
import {exportMdContent, getFileBlob, initS3Client, pushErrMsg} from "@/api";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import axios from 'axios';
import JSZip from "jszip";

const STORAGE_NAME = "menu-config";
const DOCK_TYPE = "dock_tab";

const axios_plus = axios.create({
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

function getFilePathsFromMd(content: string) {

    return content.match(/!\[.*?]\((.*?)\)/g)?.map(match => {
        return match.match(/\((.*?)\)/)[1];
    }) ?? [];

}

export default class PluginSample extends Plugin {

    private isMobile: boolean;
    private settingUtils: SettingUtils;


    updateProtyleToolbar(toolbar: Array<string | IMenuItem>) {
        toolbar.push("|");
        toolbar.push({
            name: "insert-smail-emoji",
            icon: "iconEmoji",
            hotkey: "⇧⌘I",
            tipPosition: "n",
            tip: this.i18n.insertEmoji,
            click(protyle: Protyle) {
                protyle.insert("😊");
            }
        });
        return toolbar;
    }

    async get_active_page() {
        const i18n = this.i18n;

        // 获取当前页的ID
        const url = "api/system/getConf"

        let data = "{}"
        let active_page_list: IConfActivePage = {
            children: [],
            height: "",
            instance: "",
            width: ""
        }
        // 设置headers
        let headers = {}
        headers['Content-Type'] = 'application/json'

        return axios_plus.post(url, data, headers)
            .then(function (response) {
                active_page_list = response.data.data.conf.uiLayout.layout.children[0].children[1].children[0]

                for (let i = 0; i < active_page_list.children.length; i++) {
                    if (active_page_list.children[i].active == true) {
                        let id = active_page_list.children[i].children.blockId;
                        if (id == "") {
                            pushErrMsg(i18n.error_no_active_page)
                            console.error(i18n.error_no_active_page);
                            return ""
                        }
                        return active_page_list.children[i].children.blockId
                    }
                }
                pushErrMsg(i18n.error_no_active_page)
                console.error(i18n.error_no_active_page);
                return ""

            })
            .catch(function (error) {
                console.error(error);
                return ""
            });
    }

    async onload() {
        this.data[STORAGE_NAME] = {readonlyText: "Readonly"};

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        this.eventBus.on("open-menu-doctree", this.doctreeMenuEventListener);

        // 监听来自Svelte组件的消息
        const handleMessage = async (event: MessageEvent) => {
            // 保存S3配置
            if (event.data.cmd === 'saveS3Config') {
                try {
                    await this.saveData('s3-config.json', event.data.data);
                    console.log('S3配置已保存:', event.data.data);
                    // 更新插件实例中的数据
                    this.data.s3Config = event.data.data;
                } catch (error) {
                    console.error('保存S3配置失败:', error);
                }
            }
            // 获取S3配置状态
            else if (event.data.cmd === 'getS3ConfigStatus') {
                try {
                    const s3Config = this.getS3Config();
                    const configured = s3Config &&
                        s3Config.endpoint &&
                        s3Config.accessKey &&
                        s3Config.secretKey &&
                        s3Config.bucket;

                    // 将配置状态发送回请求的组件
                    event.source.postMessage({
                        cmd: 'returnS3ConfigStatus',
                        data: {
                            configured: !!configured,
                            config: s3Config || {}
                        }
                    }, {targetOrigin: '*'});

                } catch (error) {
                    console.error('获取S3配置状态失败:', error);
                    event.source.postMessage({
                        cmd: 'returnS3ConfigStatus',
                        data: {
                            configured: false,
                            config: {}
                        }
                    }, {targetOrigin: '*'});
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // 在插件卸载时清理事件监听器
        const originalOnunload = this.onunload;
        this.onunload = async () => {
            this.eventBus.off("open-menu-doctree", this.doctreeMenuEventListener);
            window.removeEventListener('message', handleMessage);
            if (originalOnunload) {
                await originalOnunload.call(this);
            }
        };

        // 图标的制作参见帮助文档
        this.addIcons(`
<!--<symbol id="iconFace" viewBox="0 0 32 32">-->
<!--<path d="M13.667 17.333c0 0.92-0.747 1.667-1.667 1.667s-1.667-0.747-1.667-1.667 0.747-1.667 1.667-1.667 1.667 0.747 1.667 1.667zM20 15.667c-0.92 0-1.667 0.747-1.667 1.667s0.747 1.667 1.667 1.667 1.667-0.747 1.667-1.667-0.747-1.667-1.667-1.667zM29.333 16c0 7.36-5.973 13.333-13.333 13.333s-13.333-5.973-13.333-13.333 5.973-13.333 13.333-13.333 13.333 5.973 13.333 13.333zM14.213 5.493c1.867 3.093 5.253 5.173 9.12 5.173 0.613 0 1.213-0.067 1.787-0.16-1.867-3.093-5.253-5.173-9.12-5.173-0.613 0-1.213 0.067-1.787 0.16zM5.893 12.627c2.28-1.293 4.040-3.4 4.88-5.92-2.28 1.293-4.040 3.4-4.88 5.92zM26.667 16c0-1.040-0.16-2.040-0.44-2.987-0.933 0.2-1.893 0.32-2.893 0.32-4.173 0-7.893-1.92-10.347-4.92-1.4 3.413-4.187 6.093-7.653 7.4 0.013 0.053 0 0.12 0 0.187 0 5.88 4.787 10.667 10.667 10.667s10.667-4.787 10.667-10.667z"></path>-->
<!--</symbol>-->
<svg id="iconFace" t="1757337697711" class="icon" viewBox="50 100 900 900" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8006"><path d="M92 192C42.24 192 0 232.128 0 282.016v459.968C0 791.904 42.24 832 92 832h840C981.76 832 1024 791.872 1024 741.984V282.016C1024 232.16 981.76 192 932 192z m0 64h840c16.512 0 28 12.256 28 26.016v459.968c0 13.76-11.52 26.016-28 26.016H92C75.488 768 64 755.744 64 741.984V282.016c0-13.76 11.52-25.984 28-25.984zM160 352v320h96v-212.992l96 127.008 96-127.04V672h96V352h-96l-96 128-96-128z m544 0v160h-96l144 160 144-160h-96v-160z" p-id="8007"></path></svg>
<symbol id="iconSaving" viewBox="0 0 32 32">
<path d="M20 13.333c0-0.733 0.6-1.333 1.333-1.333s1.333 0.6 1.333 1.333c0 0.733-0.6 1.333-1.333 1.333s-1.333-0.6-1.333-1.333zM10.667 12h6.667v-2.667h-6.667v2.667zM29.333 10v9.293l-3.76 1.253-2.24 7.453h-7.333v-2.667h-2.667v2.667h-7.333c0 0-3.333-11.28-3.333-15.333s3.28-7.333 7.333-7.333h6.667c1.213-1.613 3.147-2.667 5.333-2.667 1.107 0 2 0.893 2 2 0 0.28-0.053 0.533-0.16 0.773-0.187 0.453-0.347 0.973-0.427 1.533l3.027 3.027h2.893zM26.667 12.667h-1.333l-4.667-4.667c0-0.867 0.12-1.72 0.347-2.547-1.293 0.333-2.347 1.293-2.787 2.547h-8.227c-2.573 0-4.667 2.093-4.667 4.667 0 2.507 1.627 8.867 2.68 12.667h2.653v-2.667h8v2.667h2.68l2.067-6.867 3.253-1.093v-4.707z"></path>
</symbol>`);
        document.createElement("div");

        this.addCommand({
            langKey: "getTab",
            hotkey: "⇧⌘M",
            globalCallback: () => {
                console.log(this.getOpenedTab());
            },
        });

        this.addDock({
            config: {
                position: "LeftBottom",
                size: {width: 200, height: 0},
                icon: "iconSaving",
                title: "Custom Dock",
                hotkey: "⌥⌘W",
            },
            data: {
                text: "This is my custom dock"
            },
            type: DOCK_TYPE,
            resize() {
                console.log(DOCK_TYPE + " resize");
            },
            update() {
                console.log(DOCK_TYPE + " update");
            },
            init: (dock) => {
                if (this.isMobile) {
                    dock.element.innerHTML = `<div class="toolbar toolbar--border toolbar--dark">
                    <svg class="toolbar__icon"><use xlink:href="#iconEmoji"></use></svg>
                        <div class="toolbar__text">Custom Dock</div>
                    </div>
                    <div class="fn__flex-1 plugin-sample__custom-dock">
                        ${dock.data.text}
                    </div>
                    </div>`;
                } else {
                    dock.element.innerHTML = `<div class="fn__flex-1 fn__flex-column">
                    <div class="block__icons">
                        <div class="block__logo">
                            <svg class="block__logoicon"><use xlink:href="#iconEmoji"></use></svg>
                            Custom Dock
                        </div>
                        <span class="fn__flex-1 fn__space"></span>
                        <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Min ${adaptHotkey("⌘W")}"><svg class="block__logoicon"><use xlink:href="#iconMin"></use></svg></span>
                    </div>
                    <div class="fn__flex-1 plugin-sample__custom-dock">
                        ${dock.data.text}
                    </div>
                    </div>`;
                }
            },
            destroy() {
                console.log("destroy dock:", DOCK_TYPE);
            }
        });

        this.settingUtils = new SettingUtils({
            plugin: this, name: STORAGE_NAME
        });
        this.settingUtils.addItem({
            key: "Input",
            value: "",
            type: "textinput",
            title: "Readonly text",
            description: "Input description",
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
                    let value = this.settingUtils.takeAndSave("Input");
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "InputArea",
            value: "",
            type: "textarea",
            title: "Readonly text",
            description: "Input description",
            // Called when focus is lost and content changes
            action: {
                callback: () => {
                    // Read data in real time
                    let value = this.settingUtils.take("InputArea");
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "Check",
            value: true,
            type: "checkbox",
            title: "Checkbox text",
            description: "Check description",
            action: {
                callback: () => {
                    // Return data and save it in real time
                    let value = !this.settingUtils.get("Check");
                    this.settingUtils.set("Check", value);
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "Select",
            value: 1,
            type: "select",
            title: "Select",
            description: "Select description",
            options: {
                1: "Option 1",
                2: "Option 2"
            },
            action: {
                callback: () => {
                    // Read data in real time
                    let value = this.settingUtils.take("Select");
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "Slider",
            value: 50,
            type: "slider",
            title: "Slider text",
            description: "Slider description",
            direction: "column",
            slider: {
                min: 0,
                max: 100,
                step: 1,
            },
            action: {
                callback: () => {
                    // Read data in real time
                    let value = this.settingUtils.take("Slider");
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "Btn",
            value: "",
            type: "button",
            title: "Button",
            description: "Button description",
            button: {
                label: "Button",
                callback: () => {
                    showMessage("Button clicked");
                }
            }
        });
        this.settingUtils.addItem({
            key: "Custom Element",
            value: "",
            type: "custom",
            direction: "row",
            title: "Custom Element",
            description: "Custom Element description",
            //Any custom element must offer the following methods
            createElement: (currentVal: any) => {
                let div = document.createElement('div');
                div.style.border = "1px solid var(--b3-theme-primary)";
                div.contentEditable = "true";
                div.textContent = currentVal;
                return div;
            },
            getEleVal: (ele: HTMLElement) => {
                return ele.textContent;
            },
            setEleVal: (ele: HTMLElement, val: any) => {
                ele.textContent = val;
            }
        });
        this.settingUtils.addItem({
            key: "Hint",
            value: "",
            type: "hint",
            title: this.i18n.hintTitle,
            description: this.i18n.hintDesc,
        });

        try {
            await this.settingUtils.load();
        } catch (error) {
            console.error("Error loading settings storage, probably empty config json:", error);
        }


        this.protyleSlash = [{
            filter: ["insert emoji 😊", "插入表情 😊", "crbqwx"],
            html: `<div class="b3-list-item__first"><span class="b3-list-item__text">${this.i18n.insertEmoji}</span><span class="b3-list-item__meta">😊</span></div>`,
            id: "insertEmoji",
            callback(protyle: Protyle) {
                protyle.insert("😊");
            }
        }];

        this.protyleOptions = {
            toolbar: ["block-ref",
                "a",
                "|",
                "text",
                "strong",
                "em",
                "u",
                "s",
                "mark",
                "sup",
                "sub",
                "clear",
                "|",
                "code",
                "kbd",
                "tag",
                "inline-math",
                "inline-memo",
            ],
        };

        console.log(this.i18n.helloPlugin);

        // 加载s3配置
        try {
            const s3Config = await this.loadData('s3-config.json');
            if (s3Config) {
                console.log('Loaded S3 config:', s3Config);
                this.data.s3Config = s3Config;
            } else {
                console.log('No S3 config found');
            }
        } catch (error) {
            console.log('Error loading S3 config:', error);
        }


    }

    onLayoutReady() {
        const topBarElement = this.addTopBar({
            icon: "iconFace",
            title: 'markdown s3导出插件',
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    this.addMenu();
                } else {
                    let rect = topBarElement.getBoundingClientRect();
                    // 如果被隐藏，则使用更多按钮
                    if (rect.width === 0) {
                        rect = document.querySelector("#barMore").getBoundingClientRect();
                    }
                    if (rect.width === 0) {
                        rect = document.querySelector("#barPlugins").getBoundingClientRect();
                    }
                    this.addMenu(rect);
                }
            }
        });

        const statusIconTemp = document.createElement("template");
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="Remove plugin-sample Data">
    <svg>
        <use xlink:href="#iconTrashcan"></use>
    </svg>
</div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", () => {
            confirm("⚠️", this.i18n.confirmRemove.replace("${name}", this.name), () => {
                this.removeData(STORAGE_NAME).then(() => {
                    this.data[STORAGE_NAME] = {readonlyText: "Readonly"};
                    showMessage(`[${this.name}]: ${this.i18n.removedData}`);
                });
            });
        });
        this.addStatusBar({
            element: statusIconTemp.content.firstElementChild as HTMLElement,
        });
        // this.loadData(STORAGE_NAME);
        this.settingUtils.load();
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);

        console.log(
            "Official settings value calling example:\n" +
            this.settingUtils.get("InputArea") + "\n" +
            this.settingUtils.get("Slider") + "\n" +
            this.settingUtils.get("Select") + "\n"
        );
    }

    async onunload() {
        console.log(this.i18n.byePlugin);
        showMessage("Goodbye SiYuan Plugin");
        console.log("onunload");
    }

    uninstall() {
        console.log("uninstall");
    }

    async updateCards(options: ICardData) {
        options.cards.sort((a: ICard, b: ICard) => {
            if (a.blockID < b.blockID) {
                return -1;
            }
            if (a.blockID > b.blockID) {
                return 1;
            }
            return 0;
        });
        return options;
    }

    /**
     * A custom setting pannel provided by svelte
     */
    openSetting(): void {
        let dialog = new Dialog({
            title: "设置菜单",
            content: `<div id="SettingPanel" style="height: 100%;"></div>`,
            width: "800px",
            destroyCallback: (options) => {
                console.log("destroyCallback", options);
                //You'd better destroy the component when the dialog is closed
                pannel.$destroy();
            }
        });
        let pannel = new SettingExample({
            target: dialog.element.querySelector("#SettingPanel"),
        });
    }

    /**
     * 获取S3配置
     * @returns S3配置对象，如果未配置则返回null
     */
    public getS3Config(): any {
        return this.data.s3Config || null;
    }

    /**
     * 检查S3配置是否已设置
     * @returns boolean
     */
    public isS3Configured(): boolean {
        const config = this.getS3Config();
        return config &&
            config.endpoint &&
            config.accessKey &&
            config.secretKey &&
            config.bucket;
    }

    /* 文档树菜单弹出事件监听器 */
    protected readonly doctreeMenuEventListener = (e: IOpenMenuDocTreeEvent) => {
        // this.logger.debug(e);

        const submenu: siyuan.IMenuItemOption[] = [];
        switch (e.detail.type) {
            case "doc": { // 单文档
                const id = e.detail.elements.item(0)?.dataset?.nodeId;

                if (id) {
                    submenu.push(
                        {
                            icon: "iconCopy",
                            label: "导出md文件到剪切板",
                            click: async () => {
                                // 获取当前聚焦的id
                                exportMdContent(id).then(async res => {
                                    const processedContent = await this.processMarkdownContent(res.content);
                                    if (processedContent) {
                                        // 复制到剪切板
                                        await navigator.clipboard.writeText(processedContent);
                                        showMessage("已复制到剪切板");
                                    }
                                });
                            }
                        },
                        {
                            icon: "iconFile",
                            label: "导出md文件",
                            click: async () => {
                                exportMdContent(id).then(async res => {
                                    const processedContent = await this.processMarkdownContent(res.content);
                                    if (processedContent) {
                                        // 系统弹窗保存位置
                                        const blob = new Blob([processedContent], {type: 'text/markdown;charset=utf-8'});
                                        const url = URL.createObjectURL(blob);

                                        // 创建下载链接
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
                                        document.body.appendChild(a);
                                        a.click();

                                        // 清理
                                        setTimeout(() => {
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        }, 100);

                                        showMessage("文件已下载");
                                    }
                                });
                            }
                        },
                        {
                            icon: "iconUpload",
                            label: "仅上传图床",
                            click: async () => {
                                exportMdContent(id).then(async res => {
                                    await this.processMarkdownContent(res.content);
                                });
                            }
                        }
                    )
                }
                break;
            }
            case "docs": { // 多文档
                const ids: string[] = [];
                // 遍历所有选中的元素
                for (let i = 0; i < e.detail.elements.length; i++) {
                    const element = e.detail.elements.item(i);
                    if (element && element.dataset.nodeId) {
                        ids.push(element.dataset.nodeId);
                    }
                }

                if (ids.length > 0) {
                    submenu.push({
                        icon: "iconFile",
                        label: "批量导出为ZIP",
                        click: async () => {
                            try {
                                // 动态导入JSZip
                                // const JSZip = (await import('jszip')).default;
                                const zip = new JSZip();

                                let successCount = 0;
                                const processedContents: { filename: string; content: string }[] = [];

                                // 处理每个文档
                                for (const id of ids) {
                                    try {
                                        const res = await exportMdContent(id);
                                        const processedContent = await this.processMarkdownContent(res.content);
                                        if (processedContent) {
// 修改为:
                                            let filename = `${id}.md`; // 默认使用ID作为文件名
                                            try {
                                                // 尝试获取文档标题
                                                const response = await axios_plus.post('/api/block/getBlockInfo', {
                                                    id: id
                                                });
                                                if (response.data && response.data.data) {
                                                    const title = response.data.data.rootTitle || response.data.data.name || id;
                                                    // 清理文件名中的非法字符
                                                    filename = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
                                                }
                                            } catch (error) {
                                                console.warn('获取文档标题失败，使用默认文件名:', error);
                                            }
                                            processedContents.push({filename, content: processedContent});
                                            successCount++;
                                        }
                                    } catch (error) {
                                        console.error(`处理文档 ${id} 失败:`, error);
                                    }
                                }

                                // 将所有内容添加到zip中
                                processedContents.forEach(({filename, content}) => {
                                    zip.file(filename, content);
                                });

                                // 生成zip文件并下载
                                const blob = await zip.generateAsync({type: 'blob'});
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `export-batch-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`;
                                document.body.appendChild(a);
                                a.click();

                                // 清理
                                setTimeout(() => {
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                }, 100);

                                showMessage(`批量导出完成 (${successCount}/${ids.length})，已打包为ZIP文件`);
                            } catch (error) {
                                console.error('ZIP打包失败:', error);
                                showMessage('ZIP打包失败: ' + error.message);
                            }
                        }
                    });
                }
                break;
            }
            default:
                break;
        }

        if (submenu.length > 0) {
            e.detail.menu.addItem({
                icon: "iconCode",
                label: this.displayName,
                submenu,
            });
        }
    }

    private addMenu(rect?: DOMRect) {
        const menu = new Menu("topBarSample", () => {
            console.log(this.i18n.byeMenu);
        });
        menu.addItem({
            icon: "iconSettings",
            label: "打开插件设置",
            click: () => {
                this.openSetting();
            }
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconCopy",
            label: "导出md文件到剪切板",
            click: async () => {
                // 获取当前聚焦的id
                const docId = await this.get_active_page();
                exportMdContent(docId).then(async res => {
                    const processedContent = await this.processMarkdownContent(res.content);
                    if (processedContent) {
                        // 复制到剪切板
                        await navigator.clipboard.writeText(processedContent);
                        showMessage("已复制到剪切板");
                    }
                });
            }
        });
        menu.addItem({
            icon: "iconFile",
            label: "导出md文件",
            click: async () => {
                const docId = await this.get_active_page()
                exportMdContent(docId).then(async res => {
                    const processedContent = await this.processMarkdownContent(res.content);
                    if (processedContent) {
                        // 系统弹窗保存位置
                        const blob = new Blob([processedContent], {type: 'text/markdown;charset=utf-8'});
                        const url = URL.createObjectURL(blob);

                        // 创建下载链接
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
                        document.body.appendChild(a);
                        a.click();

                        // 清理
                        setTimeout(() => {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }, 100);

                        showMessage("文件已下载");
                    }
                });
            }
        });
        menu.addItem({
            icon: "iconUpload",
            label: "仅上传图床",
            click: async () => {
                // 获取当前聚焦的id
                const docId = await this.get_active_page();
                exportMdContent(docId).then(async res => {
                    await this.processMarkdownContent(res.content);
                });
            }
        });

        if (this.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }

    /**
     * 处理Markdown内容，上传其中的图片到S3并更新链接
     * @param content 原始Markdown内容
     * @returns 处理后的Markdown内容，如果出错则返回null
     */
    /**
     * 处理Markdown内容，上传其中的图片到S3并更新链接
     * @param content 原始Markdown内容
     * @returns 处理后的Markdown内容，如果出错则返回null
     */
    private async processMarkdownContent(content: string): Promise<string | null> {
        try {
            // 1. 检查是否配置s3
            if (!this.isS3Configured()) {
                showMessage("请先配置S3配置");
                this.openSetting();
                return null;
            }

            // 删除front matter (--- title, date, lastmod ---)
            let processedContent = content.replace(/^---\s*\ntitle:.*?\nlastmod:.*?\n---\s*\n/gs, '');

            // 2. 获取所有链接中的文件
            const filePaths = getFilePathsFromMd(processedContent);
            // 3. 上传到s3
            const {endpoint, accessKey, secretKey, bucket, region, mdPrefix, mdSuffix} = this.getS3Config();
            const client = initS3Client(endpoint, accessKey, secretKey, region || 'us-east-1');

            // 创建path到S3 URL的映射
            const pathToS3UrlMap = new Map<string, string>();

            // 使用Promise.all并行处理所有文件上传
            const uploadPromises = filePaths.map(async (item) => {
                try {
                    // 有空格%20就修改为空格
                    if (item.includes('%20')) {
                        item.replace(/%20/g, ' ')
                    }
                    // 获取Blob
                    const fileData = await getFileBlob('/data/' + item);
                    const fileDataBuffer = new Uint8Array(await fileData.arrayBuffer())

                    // 确保数据有效后再上传
                    if (!fileData) {
                        throw new Error(`无法获取文件数据: ${item}`);
                    }

                    // 生成S3中的文件路径（可以保持原文件名或添加时间戳等）
                    const fileName = item.split('/').pop() || 'unnamed-file';
                    const s3Key = `siyuan-assets/${fileName}`;

                    const command = new PutObjectCommand({
                        Bucket: bucket,
                        Key: s3Key,
                        Body: fileDataBuffer,
                        ContentType: fileData.type
                    });

                    await client.send(command);

                    // 生成公共访问URL
                    const s3Url = `${endpoint}/${bucket}/${s3Key}`;
                    pathToS3UrlMap.set(item, s3Url);

                    // console.log(`文件 ${item} 已上传到 ${s3Url}`);
                } catch (error) {
                    console.error(`上传文件 ${item} 失败:`, error);
                }
            });

            await Promise.all(uploadPromises);
            showMessage("文件上传完成！");

            // 4. 替换原本的链接为S3 URL
            let updatedContent = processedContent;
            pathToS3UrlMap.forEach((s3Url, originalPath) => {
                // 转义特殊字符以安全地用于正则表达式
                const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`!\\[.*?\\]\\(${escapedPath}\\)`, 'g');
                updatedContent = updatedContent.replace(regex, (match) => {
                    // 提取原始的alt文本
                    const altText = match.match(/!\[(.*?)\]/)?.[1] || '';
                    return `![${altText}](${s3Url})`;
                });
            });

            console.debug(updatedContent)

            // 如果有前缀或后缀，再最上或最下方添加
            if (mdPrefix) updatedContent = mdPrefix + '\n' + updatedContent;
            if (mdSuffix) updatedContent = updatedContent + '\n' + mdSuffix;
            console.log(updatedContent)

            return updatedContent;
        } catch (error) {
            console.error("上传过程中发生错误:", error);
            showMessage("上传失败: " + error.message);
            return null;
        }
    }
}

interface Children {
    active: boolean;
    children: Children;
    docIcon: string;
    instance: string;
    pin: boolean;
    title: string;
    action: string;
    blockId: string;
    mode: string;
    notebookId: string;
    rootId: string;
}

interface IConfActivePage {
    children: Children[];
    height: string;
    instance: string;
    width: string;
}
