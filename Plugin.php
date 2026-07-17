<?php

namespace TypechoPlugin\MellowEnhance;

use Typecho\Common;
use Typecho\Plugin\PluginInterface;
use Typecho\Widget\Helper\Form;
use Typecho\Widget\Helper\Form\Element\Radio;
use Widget\Options;

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

/**
 * Mellow 主题配套增强插件，提供下载卡片、Vditor 编辑模式与前端内容渲染。
 *
 * @package Mellow 增强
 * @author thinks365
 * @version 2.4.3
 * @link https://github.com/thinks365/Mellow
 */
class Plugin implements PluginInterface
{
    /** @var bool 防止 Mellow 兼容入口与 Typecho 原生钩子重复输出。 */
    private static $frontendHeadRendered = false;

    /** @var bool 防止 Mellow 兼容入口与 Typecho 原生钩子重复输出。 */
    private static $frontendAssetsRendered = false;

    /**
     * 注册下载面板、编辑器资源，以及文章页公式和图表的前端资源。
     */
    public static function activate()
    {
        \Typecho\Plugin::factory('admin/write-post.php')->content = __CLASS__ . '::renderDownloads';
        \Typecho\Plugin::factory('admin/write-post.php')->bottom = __CLASS__ . '::renderEditorAssets';
        \Typecho\Plugin::factory('admin/write-page.php')->bottom = __CLASS__ . '::renderEditorAssets';
        \Typecho\Plugin::factory('admin/menu.php')->navBar = __CLASS__ . '::renderAdminNav';
        \Typecho\Plugin::factory('Widget_Archive')->header = __CLASS__ . '::renderFrontendHead';
        \Typecho\Plugin::factory('Widget_Archive')->footer = __CLASS__ . '::renderFrontendAssets';

        return _t('Mellow 增强已启用，请进入插件设置选择编辑模式和前端内容渲染功能。');
    }

    public static function deactivate()
    {
        return _t('Mellow 增强已停用，下载卡片及文章内容数据不会被删除。');
    }

    /**
     * Typecho 原生独立插件设置页。
     */
    public static function config(Form $form)
    {
        $enableLatex = new Radio(
            'enableLatex',
            array('1' => '启用', '0' => '关闭'),
            '0',
            _t('前端渲染：LaTeX 公式'),
            _t('启用后使用插件内置 KaTeX 渲染正文中的 $...$、$$...$$ 和 math 代码块，并自动适配 Mellow 明暗主题。')
        );
        $form->addInput($enableLatex);

        $enableMermaid = new Radio(
            'enableMermaid',
            array('1' => '启用', '0' => '关闭'),
            '0',
            _t('前端渲染：Mermaid 图表'),
            _t('启用后渲染 Markdown 的 mermaid 围栏代码块；资源从插件本地加载，并跟随 Mellow 主题色和明暗模式。')
        );
        $form->addInput($enableMermaid);

        $enableMermaidSourceToggle = new Radio(
            'enableMermaidSourceToggle',
            array('1' => '启用', '0' => '关闭'),
            '0',
            _t('Mermaid：图表 / 代码切换'),
            _t('启用后在图表顶部显示视图切换；代码视图会提供独立的复制按钮。仅在 Mermaid 图表渲染已启用时生效。')
        );
        $form->addInput($enableMermaidSourceToggle);

        $mermaidFollowMellowTheme = new Radio(
            'mermaidFollowMellowTheme',
            array('1' => '启用', '0' => '关闭'),
            '1',
            _t('Mermaid：跟随 Mellow 主题'),
            _t('启用后图表跟随 Mellow 的主题色和明暗模式；关闭后使用 Mermaid 原版默认主题。仅在 Mermaid 图表渲染已启用时生效。')
        );
        $form->addInput($mermaidFollowMellowTheme);

        $enableWysiwyg = new Radio(
            'enableWysiwyg',
            array('1' => '启用', '0' => '关闭'),
            '0',
            _t('编辑器：所见即所得模式'),
            _t('启用后，在原生“撰写 / 预览”左侧加入“所见即所得”。由 Vditor 的 wysiwyg 模式提供。')
        );
        $form->addInput($enableWysiwyg);

        $wysiwygFrontendStyle = new Radio(
            'wysiwygFrontendStyle',
            array('1' => '使用 Mellow 正文样式', '0' => '使用 Vditor 默认样式'),
            '1',
            _t('所见即所得：内容样式'),
            _t('选择 Mellow 正文样式时，编辑区会使用与前端文章正文一致的排版、主题色、圆角和明暗配色。')
        );
        $form->addInput($wysiwygFrontendStyle);

        $enableInstantRender = new Radio(
            'enableInstantRender',
            array('1' => '启用', '0' => '关闭'),
            '0',
            _t('编辑器：即时渲染模式'),
            _t('启用后，在原生“撰写 / 预览”左侧加入“即时渲染”。由 Vditor 的 ir 模式提供，适合熟悉 Markdown 的用户。')
        );
        $form->addInput($enableInstantRender);

        $autoOpenInstantRender = new Radio(
            'autoOpenInstantRender',
            array('1' => '启用', '0' => '关闭'),
            '0',
            _t('编辑器：自动打开即时渲染模式'),
            _t('启用后，进入文章或独立页面编辑页时自动切换到“即时渲染”。该选项仅在即时渲染模式已启用时生效。')
        );
        $form->addInput($autoOpenInstantRender);

        $instantRenderFrontendStyle = new Radio(
            'instantRenderFrontendStyle',
            array('1' => '使用 Mellow 正文样式', '0' => '使用 Vditor 默认样式'),
            '1',
            _t('即时渲染：内容样式'),
            _t('该选项与所见即所得模式相互独立，可分别决定是否使用前端文章正文样式。')
        );
        $form->addInput($instantRenderFrontendStyle);

        self::renderConfigLayout($form);
    }

    public static function personalConfig(Form $form)
    {
    }

    /**
     * 使用与 Mellow 主题设置一致的分组卡片布局包装插件原生字段。
     */
    private static function renderConfigLayout(Form $form): void
    {
        $layoutClass = class_exists('Typecho\\Widget\\Helper\\Layout')
            ? 'Typecho\\Widget\\Helper\\Layout'
            : 'Typecho_Widget_Helper_Layout';
        $groups = array(
            'rendering' => array(
                'icon' => 'fa6-solid:wand-magic-sparkles',
                'label' => '内容渲染',
                'description' => '按需启用文章正文中的公式与图表渲染；关闭的功能不会加载对应运行库。',
                'fields' => array('enableLatex', 'enableMermaid')
            ),
            'mermaid' => array(
                'icon' => 'fa6-solid:diagram-project',
                'label' => 'Mermaid',
                'description' => '调整 Mermaid 图表的视图切换、复制体验以及与 Mellow 主题的配色联动。',
                'fields' => array('enableMermaidSourceToggle', 'mermaidFollowMellowTheme')
            ),
            'editor' => array(
                'icon' => 'fa6-solid:pen-to-square',
                'label' => 'Vditor 编辑器',
                'description' => '选择需要加入 Typecho 写作页的增强编辑模式及默认打开行为。',
                'fields' => array('enableWysiwyg', 'enableInstantRender', 'autoOpenInstantRender')
            ),
            'editor-style' => array(
                'icon' => 'fa6-solid:palette',
                'label' => '编辑器样式',
                'description' => '分别设置两种 Vditor 模式是否模拟 Mellow 前端文章正文样式。',
                'fields' => array('wysiwygFrontendStyle', 'instantRenderFrontendStyle')
            )
        );

        $tabs = new $layoutClass('div', array(
            'class' => 'mellow-config-tabs mellow-enhance-config-tabs'
        ));
        $tabsHeader = new $layoutClass('div', array('class' => 'mellow-config-tabs__header'));
        $tabsTitle = new $layoutClass('strong', array('class' => 'mellow-config-tabs__title'));
        $tabsTitle->html('Mellow 增强设置');
        $tabsHint = new $layoutClass('span', array('class' => 'mellow-config-tabs__hint'));
        $tabsHint->html('按需开启功能后记得保存设置');
        $tabsHeader->addItem($tabsTitle);
        $tabsHeader->addItem($tabsHint);
        $tabs->addItem($tabsHeader);

        $tabList = new $layoutClass('div', array(
            'class' => 'mellow-config-tab-list',
            'role' => 'tablist',
            'aria-orientation' => 'vertical',
            'aria-label' => 'Mellow 增强设置分组'
        ));
        $panels = array();
        $groupIndex = 0;

        foreach ($groups as $groupId => $group) {
            $isActive = 0 === $groupIndex;
            $button = new $layoutClass('button', array(
                'class' => 'mellow-config-tab' . ($isActive ? ' is-active' : ''),
                'type' => 'button',
                'role' => 'tab',
                'aria-selected' => $isActive ? 'true' : 'false',
                'aria-controls' => 'mellow-enhance-config-panel-' . $groupId,
                'data-tab' => $groupId
            ));
            $button->html(
                '<span class="mellow-config-tab__icon" aria-hidden="true"><iconify-icon icon="'
                . self::escape($group['icon']) . '" noobserver></iconify-icon></span>'
                . '<span>' . self::escape($group['label']) . '</span>'
            );
            $tabList->addItem($button);

            $panel = new $layoutClass('section', array(
                'class' => 'mellow-config-panel' . ($isActive ? ' is-active' : ''),
                'id' => 'mellow-enhance-config-panel-' . $groupId,
                'role' => 'tabpanel',
                'data-panel' => $groupId
            ));
            $panelHeader = new $layoutClass('div', array('class' => 'mellow-config-panel__header'));
            $panelIcon = new $layoutClass('span', array(
                'class' => 'mellow-config-panel__icon',
                'aria-hidden' => 'true'
            ));
            $panelIcon->html('<iconify-icon icon="' . self::escape($group['icon']) . '" noobserver></iconify-icon>');
            $panelTitle = new $layoutClass('h3');
            $panelTitle->html(self::escape($group['label']));
            $panelDescription = new $layoutClass('p');
            $panelDescription->html(self::escape($group['description']));
            $panelHeader->addItem($panelIcon);
            $panelHeader->addItem($panelTitle);
            $panelHeader->addItem($panelDescription);
            $panel->addItem($panelHeader);

            foreach ($group['fields'] as $fieldName) {
                $input = $form->getInput($fieldName);
                if ($input) {
                    $form->removeItem($input);
                    $panel->addItem($input);
                }
            }

            $panels[] = $panel;
            $groupIndex++;
        }

        $tabs->addItem($tabList);
        $layout = new $layoutClass('div', array(
            'class' => 'mellow-config-layout mellow-enhance-config-layout',
            'data-mellow-enhance-settings' => 'true'
        ));
        $content = new $layoutClass('div', array('class' => 'mellow-config-content'));
        $layout->addItem($tabs);
        foreach ($panels as $panel) {
            $content->addItem($panel);
        }
        $layout->addItem($content);
        $form->addItem($layout);

        $options = Options::alloc();
        $pluginBase = Common::url('MellowEnhance', $options->pluginUrl);
        $assets = new $layoutClass('');
        $assets->html(
            '<link rel="stylesheet" href="' . self::escape(Common::url('assets/settings.css?v=2.4.3', $pluginBase)) . '">'
            . '<script defer src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>'
            . '<script defer src="' . self::escape(Common::url('assets/settings.js?v=2.4.3', $pluginBase)) . '"></script>'
        );
        $form->addItem($assets);
    }

    /**
     * 在 Typecho 后台标题栏提供主题与插件设置的快捷入口。
     */
    public static function renderAdminNav(): void
    {
        try {
            if (!\Widget\User::alloc()->pass('administrator', true)) {
                return;
            }
        } catch (\Throwable $error) {
            return;
        }

        $options = Options::alloc();
        $themeUrl = $options->adminUrl('options-theme.php', true);
        $pluginUrl = $options->adminUrl('options-plugin.php?config=MellowEnhance', true);

        echo '<a class="mellow-enhance-admin-shortcut mellow-enhance-admin-shortcut--theme" href="'
            . self::escape($themeUrl) . '">' . self::escape(_t('主题设置')) . '</a>';
        echo '<a class="mellow-enhance-admin-shortcut mellow-enhance-admin-shortcut--plugin" href="'
            . self::escape($pluginUrl) . '">' . self::escape(_t('Mellow 增强设置')) . '</a>';
    }

    private static function setting(string $name, string $default = '0'): string
    {
        try {
            $settings = Options::alloc()->plugin('MellowEnhance');
            if (isset($settings->{$name})) {
                return (string) $settings->{$name};
            }
        } catch (\Throwable $error) {
            return $default;
        }

        return $default;
    }

    private static function frontendFeatures(): array
    {
        return array(
            'latexEnabled' => '1' === self::setting('enableLatex'),
            'mermaidEnabled' => '1' === self::setting('enableMermaid'),
            'mermaidSourceToggleEnabled' => '1' === self::setting('enableMermaidSourceToggle'),
            'mermaidFollowMellowTheme' => '1' === self::setting('mermaidFollowMellowTheme', '1')
        );
    }

    private static function sources(): array
    {
        return array(
            'baidu' => '百度网盘',
            'aliyun' => '阿里云盘',
            'quark' => '夸克网盘',
            'xunlei' => '迅雷云盘',
            'tianyi' => '天翼云盘',
            '123pan' => '123 云盘',
            'lanzou' => '蓝奏云',
            'uc' => 'UC 网盘',
            'jianguoyun' => '坚果云',
            'google-drive' => 'Google Drive',
            'onedrive' => 'OneDrive',
            'magnet' => '磁力链',
            'direct' => '直链下载'
        );
    }

    private static function escape($value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }

    /**
     * 读取插件管理的字段。修订版字段优先于已发布版本，避免编辑草稿时回退旧值。
     */
    private static function fields($post): array
    {
        $names = array('mellowDownloadEnabled', 'mellowDownloadItems');
        for ($index = 1; $index <= 6; $index++) {
            $suffix = 1 === $index ? '' : (string) $index;
            $names[] = 'mellowDownloadSource' . $suffix;
            $names[] = 'mellowDownloadUrl' . $suffix;
        }

        $fields = array();
        if (isset($post->fields)) {
            foreach ($names as $name) {
                if (isset($post->fields->{$name})) {
                    $fields[$name] = $post->fields->{$name};
                }
            }
        }

        if (method_exists($post, 'getFieldItems')) {
            foreach ($post->getFieldItems() as $row) {
                if (!isset($row['name']) || !in_array($row['name'], $names, true)) {
                    continue;
                }

                $type = isset($row['type']) ? $row['type'] : 'str';
                $key = ('json' === $type ? 'str' : $type) . '_value';
                $value = isset($row[$key]) ? $row[$key] : '';
                if ('json' === $type) {
                    $decoded = json_decode((string) $value, true);
                    $value = is_array($decoded) ? $decoded : array();
                }
                $fields[$row['name']] = $value;
            }
        }

        return $fields;
    }

    private static function field(array $fields, string $name, $default = null)
    {
        return array_key_exists($name, $fields) ? $fields[$name] : $default;
    }

    /**
     * 读取新 JSON 数据；若不存在，则把旧字段映射到编辑面板中等待保存迁移。
     */
    private static function items(array $fields): array
    {
        $stored = self::field($fields, 'mellowDownloadItems', array());
        if (is_string($stored) && '' !== trim($stored)) {
            $decoded = json_decode($stored, true);
            $stored = is_array($decoded) ? $decoded : array();
        }

        $items = array();
        $sources = self::sources();
        if (is_array($stored)) {
            foreach ($stored as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $source = isset($item['source']) ? trim((string) $item['source']) : '';
                $url = isset($item['url']) ? trim((string) $item['url']) : '';
                if (isset($sources[$source]) && '' !== $url) {
                    $items[] = array('source' => $source, 'url' => $url);
                }
            }
        }

        if (!empty($items)) {
            return $items;
        }

        for ($index = 1; $index <= 6; $index++) {
            $suffix = 1 === $index ? '' : (string) $index;
            $source = trim((string) self::field($fields, 'mellowDownloadSource' . $suffix, 'baidu'));
            $url = trim((string) self::field($fields, 'mellowDownloadUrl' . $suffix, ''));
            if (isset($sources[$source]) && '' !== $url) {
                $items[] = array('source' => $source, 'url' => $url);
            }
        }

        return $items;
    }

    private static function renderOptions(string $selected): void
    {
        foreach (self::sources() as $value => $label) {
            echo '<option value="' . self::escape($value) . '"'
                . ($selected === $value ? ' selected' : '') . '>'
                . self::escape($label) . '</option>';
        }
    }

    private static function renderRow(array $item, $index): void
    {
        $source = isset($item['source']) ? (string) $item['source'] : 'baidu';
        $url = isset($item['url']) ? (string) $item['url'] : '';
        $nameIndex = self::escape($index);
        ?>
        <div class="mellow-download-row" draggable="false" data-download-row>
            <button class="mellow-download-row__handle" type="button" data-drag-handle aria-label="拖动调整顺序" title="拖动调整顺序">↕</button>
            <label class="mellow-download-field mellow-download-field--source">
                <span>下载源</span>
                <select name="fields[mellowDownloadItems][<?php echo $nameIndex; ?>][source]" data-download-source>
                    <?php self::renderOptions($source); ?>
                </select>
            </label>
            <label class="mellow-download-field mellow-download-field--url">
                <span>链接或磁力链</span>
                <input type="text" name="fields[mellowDownloadItems][<?php echo $nameIndex; ?>][url]" value="<?php echo self::escape($url); ?>" data-download-url placeholder="https://… 或 magnet:?…" autocomplete="off">
            </label>
            <div class="mellow-download-row__actions" aria-label="下载项操作">
                <button type="button" class="btn btn-xs" data-move-up title="上移" aria-label="上移">↑</button>
                <button type="button" class="btn btn-xs" data-move-down title="下移" aria-label="下移">↓</button>
                <button type="button" class="btn btn-xs mellow-download-row__remove" data-remove-download title="删除" aria-label="删除">×</button>
            </div>
        </div>
        <?php
    }

    /**
     * 文章编辑页的可重复下载表单。Typecho 会把 fields[mellowDownloadItems] 原生保存为 JSON 字段。
     */
    public static function renderDownloads($post): void
    {
        $fields = self::fields($post);
        $items = self::items($fields);
        if (empty($items)) {
            $items[] = array('source' => 'baidu', 'url' => '');
        }
        $enabled = '1' === (string) self::field($fields, 'mellowDownloadEnabled', '0');
        ?>
        <section id="mellow-downloads-panel" class="mellow-downloads-panel">
            <header class="mellow-downloads-panel__header">
                <div>
                    <p class="mellow-downloads-panel__eyebrow">MELLOW ENHANCE · DOWNLOADS</p>
                    <h2>文章下载卡片</h2>
                    <p>按需添加多个下载源，拖动或使用箭头调整前端显示顺序。</p>
                </div>
                <label class="mellow-download-toggle">
                    <input type="hidden" name="fields[mellowDownloadEnabled]" value="0">
                    <input type="checkbox" name="fields[mellowDownloadEnabled]" value="1" data-download-enabled<?php if ($enabled): ?> checked<?php endif; ?>>
                    <span aria-hidden="true"></span>
                    <b>显示卡片</b>
                </label>
            </header>

            <div class="mellow-downloads-panel__body" data-download-body<?php if (!$enabled): ?> hidden<?php endif; ?>>
                <div class="mellow-downloads-list" data-download-list>
                    <?php foreach ($items as $index => $item): ?>
                        <?php self::renderRow($item, $index); ?>
                    <?php endforeach; ?>
                </div>
                <button type="button" class="btn mellow-downloads-add" data-add-download>＋ 添加下载源</button>
                <p class="description">网盘与直链使用完整的 http(s) 地址；磁力链必须以 <code>magnet:?</code> 开头。空地址不会在前端显示。</p>
            </div>
        </section>

        <template id="mellow-download-row-template">
            <?php self::renderRow(array('source' => 'baidu', 'url' => ''), '__INDEX__'); ?>
        </template>
        <?php
    }

    /**
     * 输出公式与图表的前端样式。依赖按开关加载，关闭时不增加页面资源。
     */
    public static function renderFrontendHead(): void
    {
        if (self::$frontendHeadRendered) {
            return;
        }

        $features = self::frontendFeatures();
        if (!$features['latexEnabled'] && !$features['mermaidEnabled']) {
            return;
        }

        self::$frontendHeadRendered = true;

        $options = Options::alloc();
        $pluginBase = Common::url('MellowEnhance', $options->pluginUrl);
        $vditorBase = Common::url('vendor/vditor', $pluginBase);

        if ($features['latexEnabled']) {
            echo '<link rel="stylesheet" href="'
                . self::escape(Common::url('dist/js/katex/katex.min.css', $vditorBase)) . '">';
        }
        echo '<link rel="stylesheet" href="'
            . self::escape(Common::url('assets/frontend.css?v=2.4.3', $pluginBase)) . '">';
    }

    /**
     * 加载本地 KaTeX / Mermaid，并注册初始页面和 PJAX 内容渲染。
     */
    public static function renderFrontendAssets(): void
    {
        if (self::$frontendAssetsRendered) {
            return;
        }

        $features = self::frontendFeatures();
        if (!$features['latexEnabled'] && !$features['mermaidEnabled']) {
            return;
        }

        self::$frontendAssetsRendered = true;

        $options = Options::alloc();
        $pluginBase = Common::url('MellowEnhance', $options->pluginUrl);
        $vditorBase = Common::url('vendor/vditor', $pluginBase);
        $config = $features;
        if ($features['latexEnabled']) {
            $config['katexUrl'] = Common::url('dist/js/katex/katex.min.js', $vditorBase);
        }
        if ($features['mermaidEnabled']) {
            $config['mermaidUrl'] = Common::url('dist/js/mermaid/mermaid.min.js', $vditorBase);
        }
        ?>
        <script>window.MellowEnhanceFrontendConfig = <?php echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script>
        <script src="<?php echo self::escape(Common::url('assets/frontend.js?v=2.4.3', $pluginBase)); ?>"></script>
        <?php
    }

    /**
     * 在原生编辑器完成初始化后载入增强脚本。Vditor 发行资源固定为 3.11.2 并随插件提供。
     */
    public static function renderEditorAssets($content): void
    {
        $options = Options::alloc();
        $wysiwygEnabled = '1' === self::setting('enableWysiwyg');
        $instantEnabled = '1' === self::setting('enableInstantRender');
        $editorEnabled = (bool) $options->markdown && ($wysiwygEnabled || $instantEnabled);
        $pluginBase = Common::url('MellowEnhance', $options->pluginUrl);
        $vditorBase = Common::url('vendor/vditor', $pluginBase);
        $primaryColor = isset($options->primaryColor) ? (string) $options->primaryColor : '#0aa879';
        if (!preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $primaryColor)) {
            $primaryColor = '#0aa879';
        }

        $isMarkdown = true;
        if (method_exists($content, 'have') && $content->have()) {
            $isMarkdown = (bool) $content->isMarkdown;
        }

        $config = array(
            'editorEnabled' => $editorEnabled,
            'markdownEnabled' => (bool) $options->markdown,
            'contentIsMarkdown' => $isMarkdown,
            'assetBase' => $vditorBase,
            'primaryColor' => $primaryColor,
            'autoOpenInstantRender' => '1' === self::setting('autoOpenInstantRender'),
            'modes' => array(
                'wysiwyg' => array(
                    'enabled' => $wysiwygEnabled,
                    'frontStyle' => '1' === self::setting('wysiwygFrontendStyle', '1'),
                    'label' => '所见即所得'
                ),
                'ir' => array(
                    'enabled' => $instantEnabled,
                    'frontStyle' => '1' === self::setting('instantRenderFrontendStyle', '1'),
                    'label' => '即时渲染'
                )
            )
        );
        ?>
        <?php if ($editorEnabled): ?>
            <link rel="stylesheet" href="<?php echo self::escape(Common::url('dist/index.css', $vditorBase)); ?>">
        <?php endif; ?>
        <link rel="stylesheet" href="<?php echo self::escape(Common::url('assets/admin.css?v=2.4.3', $pluginBase)); ?>">
        <?php if ($editorEnabled): ?>
            <link rel="stylesheet" href="<?php echo self::escape(Common::url('assets/mellow-content.css?v=2.4.3', $pluginBase)); ?>">
        <?php endif; ?>
        <script>window.MellowEnhanceConfig = <?php echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script>
        <?php if ($editorEnabled): ?>
            <script src="<?php echo self::escape(Common::url('dist/index.min.js', $vditorBase)); ?>"></script>
        <?php endif; ?>
            <script src="<?php echo self::escape(Common::url('assets/admin.js?v=2.4.3', $pluginBase)); ?>"></script>
        <?php
    }
}
