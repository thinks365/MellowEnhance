# 第三方开源软件声明

Mellow 增强插件内置以下第三方开源软件的发行文件。第三方软件仍由其原作者持有版权，并遵循各自许可证；Mellow 增强的 MIT License 不会替代这些许可证。

## Iconify Icon 与 Font Awesome 6 Free 图标集

- Iconify Icon Web Component：https://iconify.design/
- Font Awesome Free：https://fontawesome.com/
- 许可证：Iconify Icon 为 MIT License；Font Awesome Free 图标为 CC BY 4.0
- 使用位置：插件设置页的分组、字段图标

插件设置页通过 Iconify 官方 Web Component 按图标名称加载 Font Awesome 6 Free 图标；相关图标不会随插件发行包内置。

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
