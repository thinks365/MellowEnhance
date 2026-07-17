# Mellow 增强

Mellow Enhance Plugin（Mellow 增强插件）是 Mellow Typecho 主题的配套插件，集中提供文章下载卡片、LaTeX 与 Mermaid 前端渲染，以及 Markdown 编辑体验增强。

插件设置页采用与 Mellow 主题设置一致的分组侧栏、卡片字段与开关控件，并在窄屏下自动切换为横向标签导航。

## 功能

### 多来源下载卡片

- 在文章编辑页提供独立的重复表单。
- 下载源可不限数量地添加、删除和排序。
- 支持百度网盘、阿里云盘、夸克网盘、迅雷云盘、天翼云盘、123 云盘、蓝奏云、UC 网盘、坚果云、Google Drive、OneDrive、磁力链和直链下载。
- 数据保存在 `mellowDownloadItems` JSON 自定义字段中。
- 兼容 Mellow 旧版单下载源字段，旧文章再次保存时会迁移到 JSON 结构。

### Vditor 编辑模式

插件可在 Typecho 原生 Markdown 编辑器的“撰写 / 预览”左侧加入：

- **所见即所得**：Vditor `wysiwyg` 模式，适合希望像富文本编辑器一样直接排版的用户。
- **即时渲染**：Vditor `ir` 模式，在保留 Markdown 写作习惯的同时即时显示排版结果。

两种 Vditor 模式都会渲染 Mellow 的 `:::note`、`:::tip`、`:::important`、`:::warning`、`:::caution` 提示块，也兼容 GitHub Alert 的 `> [!NOTE]` 等价写法和自定义标题。编辑器内部的适配标记不会写入文章；切换模式、预览或保存时仍会同步原始的 `:::` / GitHub Markdown 语法。

Vditor 与 Typecho 原生 Markdown 工具栏都会增加“插入提示块”和“插入视频卡片”按钮。提示块菜单可选择注意、提示、重要、警告或危险，并用当前选区作为正文；视频菜单可选择 Bilibili 或 YouTube，并接受普通视频链接或平台提供的官方 iframe 代码。

启用插件后，管理员账号的 Typecho 后台标题栏会显示“主题设置”和“Mellow 增强设置”快捷入口，分别进入当前主题设置页与本插件设置页；非管理员账号不会显示这两个入口。

两个模式均可在插件设置中独立开关，也可以分别选择：

- 使用 Vditor 默认内容样式。
- 使用 Mellow 前端文章正文的标题、段落、链接、引用、列表、媒体、折叠内容、代码和表格样式。

还可以启用“自动打开即时渲染模式”，进入文章或独立页面编辑页后直接切换到即时渲染；即时渲染模式关闭时，该选项不会生效。

插件不会替换 Typecho 原生编辑器。切换模式时，Markdown 会同步到原生 `#text` 字段，因此发布、保存草稿、自动保存、原生预览和附件插入继续使用 Typecho 原有流程。

### Bilibili / YouTube 视频卡片

工具栏会将输入规范化为可编辑的 Markdown 视频块：

```markdown
:::video bilibili 可选标题
https://player.bilibili.com/player.html?isOutside=true&bvid=BV1zFNi6mEsD&p=1
:::
```

```markdown
:::video youtube 可选标题
https://www.youtube-nocookie.com/embed/VIDEO_ID
:::
```

- Bilibili 支持标准 BV 视频地址及官方 `player.bilibili.com` iframe，保留合法的 `aid`、`bvid`、`cid` 与分 P 参数，并始终写入 `autoplay=0`，等待读者手动点击播放。
- YouTube 支持 `watch`、`youtu.be`、`shorts`、`live` 和官方 iframe，统一使用 `youtube-nocookie.com` 隐私增强播放器，并保留合法的起播时间与播放列表参数。
- 前端使用 16:9 响应式官方 iframe、浏览器原生懒加载和原视频备用链接；直接粘贴到文章中的受支持官方 iframe 也会包装为同款卡片。
- Vditor 中只显示轻量卡片预览，不加载第三方播放器；每张卡片右上角提供“编辑”和“删除”按钮，编辑会重新打开视频弹窗，删除需二次确认，操作后仍同步原始 `:::video` Markdown。
- 播放器域名和视频 ID 会经过白名单验证，任意 iframe 地址不会被转换为视频卡片。

### LaTeX 公式

在插件设置中启用“前端渲染：LaTeX 公式”后，可使用以下写法：

- 行内公式：`$E = mc^2$`
- 独立公式：在两行 `$$` 之间书写公式
- 公式代码块：使用语言名称为 `math` 的 Markdown 围栏代码块

公式由插件内置的 KaTeX 在浏览器端渲染，不依赖公共 CDN。独立公式会使用与 Mellow 正文一致的主题色、表面色、圆角与横向滚动处理。

### Mermaid 图表

在插件设置中启用“前端渲染：Mermaid 图表”后，使用标准 Mermaid 围栏代码块：

````markdown
```mermaid
flowchart LR
    A[撰写 Markdown] --> B[Typecho 输出]
    B --> C[MellowEnhance 渲染]
```
````

Mermaid 从插件本地加载，并使用严格安全模式生成 SVG。除总开关外，还提供两个相互独立的选项：

- **图表 / 代码切换**：默认关闭；启用后可在每个 Mermaid 组件顶部切换图表与源代码，代码视图会显示复制按钮。
- **跟随 Mellow 主题**：默认开启；图表读取 Mellow 当前主题变量，并在切换明暗模式或主题色后自动重新渲染。关闭后使用 Mermaid 原版默认主题，不再响应 Mellow 配色变化。

通过 PJAX 进入新文章时，Mermaid 会按当前插件设置渲染新内容。

LaTeX 与 Mermaid 开关相互独立且默认关闭。未启用的功能不会向前端加载对应运行库。

Mellow 主题会为覆盖升级后仍沿用旧钩子缓存的 MellowEnhance 提供兼容入口，因此公式与图表无需停用、重启插件即可生效。其他主题若要使用这两项前端能力，覆盖升级后需在 Typecho 后台停用并重新启用一次插件，以注册新增的前端资源钩子；现有插件设置和文章数据不会因此删除。

## 环境要求

- Typecho 1.2 / 1.3
- PHP 7.4 或更高版本
- Typecho 后台已开启 Markdown
- 支持现代 JavaScript 和 CSS 的浏览器

如果 Typecho 的全局 Markdown 功能已关闭，Vditor 模式不会载入，以避免把 Markdown 内容按普通 HTML 保存。

## 安装

1. 将整个 `MellowEnhance` 文件夹复制到 Typecho 的 `usr/plugins/` 目录。
2. 进入 Typecho 后台“控制台 → 插件”。
3. 启用 **Mellow 增强**。
4. 点击插件右侧的“设置”，按需打开 LaTeX、Mermaid、Mermaid 图表 / 代码切换、主题跟随、所见即所得、即时渲染及对应的前端正文样式选项。
5. 编辑文章或独立页面，在原生“撰写 / 预览”左侧选择新增模式。

下载卡片默认关闭，可在每篇文章正文编辑器下方单独开启。

### 从 Mellow Downloads 升级

`MellowEnhance` 是原 `MellowDownloads` 插件的后继版本：

1. 停用并移除旧的 `MellowDownloads` 插件目录。
2. 安装并启用 `MellowEnhance`。
3. 已保存的文章下载字段无需迁移，Mellow 增强会直接读取。

## 第三方开源软件

插件内置 [Vditor 3.11.2](https://github.com/Vanessa219/vditor) 发行资源，编辑器的 CSS、JavaScript 与常用运行资源均从插件本地载入，不从公共 CDN 引入 Vditor 主文件。Vditor 支持所见即所得、即时渲染和分屏预览等 Markdown 编辑模式，本插件使用其中的 `wysiwyg` 与 `ir` 模式，并复用发行包中的 KaTeX 0.16.9 与 Mermaid 11.6.0 前端资源。

Vditor 使用 MIT License。详细版权、版本和许可证信息见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) 与 [Vditor License](vendor/vditor/LICENSE)。

## 数据与停用行为

- 停用插件不会删除文章内容、下载配置或其他自定义字段。
- 已经保存的下载卡片仍可由 Mellow 主题读取和展示。
- Vditor 关闭或不可用时，可继续使用 Typecho 原生编辑器编辑 Markdown。

## 协议

Mellow 增强使用 [MIT License](LICENSE)。
