# 第三方软件与服务声明

Mellow 增强插件会使用下列第三方软件或外部服务。第三方软件仍由其原作者持有版权并遵循各自许可证；外部服务遵循其提供方的条款与隐私政策。Mellow 增强的 MIT License 不会替代这些约定。

## Iconify Icon 与 Font Awesome 6 Free 图标集

- Iconify Icon Web Component：https://iconify.design/
- Font Awesome Free：https://fontawesome.com/
- 许可证：Iconify Icon 为 MIT License；Font Awesome Free 图标为 CC BY 4.0
- 使用位置：插件设置页的分组、字段图标

插件设置页通过 Iconify 官方 Web Component 按图标名称加载 Font Awesome 6 Free 图标；相关图标不会随插件发行包内置。

## Cloudflare Turnstile（可选外部服务）

- 服务：Cloudflare Turnstile
- 文档：https://developers.cloudflare.com/turnstile/
- 资源地址：`https://challenges.cloudflare.com/turnstile/v0/api.js`
- 使用位置：启用评论安全验证后的 Mellow 评论表单

Turnstile 脚本不会随插件发行包内置，仅在管理员启用 Turnstile、填写 Site Key 与 Secret Key、要求发表评论验证，并且当前页面实际显示受保护评论表单时从 Cloudflare 加载。评论提交时，服务器会把一次性令牌和 Typecho 识别到的访客 IP 地址发送到 Cloudflare Siteverify 接口进行验证。该服务受 Cloudflare 相应条款与隐私政策约束。

## Vditor 3.11.2

- 项目：Vditor
- 作者：Vanessa219 / B3log 开源社区
- 项目地址：https://github.com/Vanessa219/vditor
- 使用版本：3.11.2
- 许可证：MIT License
- 内置位置：`vendor/vditor/`

Vditor 发行包中附带的第三方运行时及其许可证文件按上游目录结构保留。完整 Vditor MIT 许可证见 [`vendor/vditor/LICENSE`](vendor/vditor/LICENSE)。

## KaTeX 0.16.9

- 项目：KaTeX
- 项目地址：https://github.com/KaTeX/KaTeX
- 使用版本：0.16.9
- 许可证：MIT License
- 内置位置：`vendor/vditor/dist/js/katex/`

本插件直接复用 Vditor 发行包中的 KaTeX 脚本、样式与字体，用于可选的前端 LaTeX 公式渲染。

## Mermaid 11.6.0

- 项目：Mermaid
- 项目地址：https://github.com/mermaid-js/mermaid
- 使用版本：11.6.0
- 许可证：MIT License
- 内置位置：`vendor/vditor/dist/js/mermaid/`

本插件直接复用 Vditor 发行包中的 Mermaid 脚本，用于可选的前端图表渲染。
