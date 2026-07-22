<?php

namespace TypechoPlugin\MellowEnhance;

use Typecho\Common;
use Typecho\Plugin\PluginInterface;
use Typecho\Widget\Helper\Form;
use Typecho\Widget\Helper\Form\Element\Password;
use Typecho\Widget\Helper\Form\Element\Radio;
use Typecho\Widget\Helper\Form\Element\Text;
use Widget\Options;

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

/**
 * Mellow 主题配套增强插件，提供下载卡片、Vditor 编辑模式、前端内容渲染与评论安全验证。
 *
 * @package Mellow 增强
 * @author thinks365
 * @version 2.4.19
 * @link https://github.com/thinks365/MellowEnhance
 */
class Plugin implements PluginInterface
{
    /** @var bool 防止 Mellow 兼容入口与 Typecho 原生钩子重复输出。 */
    private static $frontendAssetsRendered = false;

    /** @var bool 每次请求只检查一次持久化钩子，避免重复读取与刷新。 */
    private static $registeredHooksChecked = false;

    /**
     * 注册下载面板、编辑器资源、文章内容渲染与评论验证入口。
     */
    public static function activate()
    {
        foreach (self::hookDefinitions() as $definition) {
            $factory = \Typecho\Plugin::factory($definition['handle']);
            $component = $definition['component'];
            $factory->{$component} = $definition['callback'];
        }

        return _t('Mellow 增强已启用，请进入插件设置选择编辑模式、内容渲染和评论安全功能。');
    }

    /**
     * 统一维护需要持久化到 Typecho 的插件钩子，供启用与覆盖升级检查复用。
     */
    private static function hookDefinitions(): array
    {
        return array(
            array('handle' => 'admin/write-post.php', 'component' => 'content', 'callback' => __CLASS__ . '::renderDownloads'),
            array('handle' => 'admin/write-post.php', 'component' => 'bottom', 'callback' => __CLASS__ . '::renderEditorAssets'),
            array('handle' => 'admin/write-page.php', 'component' => 'bottom', 'callback' => __CLASS__ . '::renderEditorAssets'),
            array('handle' => 'admin/menu.php', 'component' => 'navBar', 'callback' => __CLASS__ . '::renderAdminNav'),
            array('handle' => 'Widget_Archive', 'component' => 'header', 'callback' => __CLASS__ . '::renderFrontendHead'),
            array('handle' => 'Widget_Archive', 'component' => 'footer', 'callback' => __CLASS__ . '::renderFrontendAssets'),
            array('handle' => 'Widget_Feedback', 'component' => 'comment', 'callback' => __CLASS__ . '::validateTurnstileComment'),
            array('handle' => 'Mellow', 'component' => 'commentVerification', 'callback' => __CLASS__ . '::renderCommentVerification')
        );
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

        $enableTurnstile = new Radio(
            'enableTurnstile',
            array('1' => '启用', '0' => '关闭'),
            '0',
            _t('Cloudflare Turnstile'),
            _t('启用 Cloudflare 的人机验证服务。Turnstile 可以独立使用，站点无需接入 Cloudflare CDN。')
        );
        $form->addInput($enableTurnstile);

        $turnstileSiteKey = new Text(
            'turnstileSiteKey',
            null,
            '',
            _t('Turnstile Site Key'),
            _t('填写 Cloudflare Turnstile 小组件的公开 Site Key，用于在评论表单中加载验证框。')
        );
        $turnstileSiteKey->input->setAttribute('autocomplete', 'off');
        $turnstileSiteKey->input->setAttribute('spellcheck', 'false');
        $form->addInput($turnstileSiteKey);

        $turnstileSecretKey = new Password(
            'turnstileSecretKey',
            null,
            '',
            _t('Turnstile Secret Key'),
            _t('填写与 Site Key 配套的私密 Secret Key。该密钥只会在服务器端用于 Siteverify 验证，不会发送到访客浏览器。')
        );
        $turnstileSecretKey->input->setAttribute('autocomplete', 'new-password');
        $turnstileSecretKey->input->setAttribute('spellcheck', 'false');
        $form->addInput($turnstileSecretKey);

        $turnstileRequireComments = new Radio(
            'turnstileRequireComments',
            array('1' => '需要验证', '0' => '不需要验证'),
            '0',
            _t('发表评论需要验证'),
            _t('启用后，访客必须通过 Turnstile，服务器验证令牌成功后才会写入评论。Site Key 与 Secret Key 均已填写时生效。')
        );
        $form->addInput($turnstileRequireComments);

        $turnstileExemptLoggedIn = new Radio(
            'turnstileExemptLoggedIn',
            array('1' => '免验证', '0' => '仍需验证'),
            '0',
            _t('登录用户免验证'),
            _t('启用后，已经登录 Typecho 的用户发表评论时不显示验证框，也不执行 Turnstile 校验。匿名访客不受影响。')
        );
        $form->addInput($turnstileExemptLoggedIn);

        self::renderConfigLayout($form);
    }

    public static function personalConfig(Form $form)
    {
    }

    /**
     * 保存插件设置后返回当前配置页，便于连续调整多个分组。
     */
    public static function configHandle($settings, $isInit): void
    {
        \Widget\Plugins\Edit::configPlugin('MellowEnhance', (array) $settings);

        if ($isInit) {
            return;
        }

        self::refreshRegisteredHooks();

        \Widget\Notice::alloc()->set(_t('Mellow 增强设置已经保存'), 'success');
        $configUrl = Options::alloc()->adminUrl('options-plugin.php?config=MellowEnhance', true);
        \Typecho\Response::getInstance()
            ->setStatus(302)
            ->setHeader('Location', Common::safeUrl($configUrl))
            ->respond();
    }

    /**
     * 从插件入口元数据中读取当前版本，避免 About Tab 单独维护版本号。
     */
    private static function pluginVersion(): string
    {
        $source = @file_get_contents(__FILE__);
        if (is_string($source) && preg_match('/@version\s+([0-9A-Za-z._-]+)/', $source, $matches)) {
            return $matches[1];
        }

        return '未知';
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
            ),
            'security' => array(
                'icon' => 'fa6-solid:shield-halved',
                'label' => '评论安全',
                'description' => '使用 Cloudflare Turnstile 验证评论提交，并可单独决定登录用户是否免验证。',
                'fields' => array(
                    'enableTurnstile',
                    'turnstileSiteKey',
                    'turnstileSecretKey',
                    'turnstileRequireComments',
                    'turnstileExemptLoggedIn'
                )
            ),
            'about' => array(
                'icon' => 'fa6-solid:circle-info',
                'label' => '关于',
                'description' => '查看 Mellow 增强的插件信息、版本、开源许可与第三方项目致谢。',
                'fields' => array()
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

            if ('about' === $groupId) {
                $about = new $layoutClass('div', array('class' => 'mellow-config-about'));
                $about->html(
                    '<dl class="mellow-config-about__facts">'
                    . '<div><dt>插件信息</dt><dd><strong>Mellow 增强</strong><span>Mellow Typecho 主题的配套增强插件，由 thinks365 开发。</span></dd></div>'
                    . '<div><dt>插件版本</dt><dd><code>v' . self::escape(self::pluginVersion()) . '</code></dd></div>'
                    . '<div><dt>插件 GitHub</dt><dd><a href="https://github.com/thinks365/MellowEnhance" target="_blank" rel="noopener noreferrer">github.com/thinks365/MellowEnhance</a></dd></div>'
                    . '<div><dt>插件开源信息</dt><dd>Mellow 增强使用 <a href="https://github.com/thinks365/MellowEnhance/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a> 开源。你可以在保留版权声明和许可证声明的前提下使用、复制、修改与分发本插件。</dd></div>'
                    . '</dl>'
                    . '<section class="mellow-config-about__thanks" aria-labelledby="mellow-enhance-config-about-thanks">'
                    . '<h4 id="mellow-enhance-config-about-thanks">开源致谢</h4>'
                    . '<p>Mellow 增强的实现离不开以下项目与开源社区，在此特别致谢：</p>'
                    . '<ul>'
                    . '<li><a href="https://github.com/thinks365/Mellow" target="_blank" rel="noopener noreferrer">Mellow</a><span>——配套主题与插件设置界面的设计基础。</span></li>'
                    . '<li><a href="https://typecho.org/" target="_blank" rel="noopener noreferrer">Typecho</a><span>——插件所运行的开源博客平台与扩展接口。</span></li>'
                    . '<li><a href="https://github.com/Vanessa219/vditor" target="_blank" rel="noopener noreferrer">Vditor</a><span>——所见即所得、即时渲染与 Markdown 编辑能力。</span></li>'
                    . '<li><a href="https://katex.org/" target="_blank" rel="noopener noreferrer">KaTeX</a> 与 <a href="https://mermaid.js.org/" target="_blank" rel="noopener noreferrer">Mermaid</a><span>——文章公式与图表渲染能力。</span></li>'
                    . '<li><a href="https://developers.cloudflare.com/turnstile/" target="_blank" rel="noopener noreferrer">Cloudflare Turnstile</a><span>——可选的评论人机验证与 Siteverify 服务。</span></li>'
                    . '<li><a href="https://iconify.design/" target="_blank" rel="noopener noreferrer">Iconify</a><span>——插件设置界面的图标支持。</span></li>'
                    . '</ul>'
                    . '<p class="mellow-config-about__license-note">各第三方项目仍遵循其各自许可证，详情可查看仓库中的 <a href="https://github.com/thinks365/MellowEnhance/blob/main/THIRD-PARTY-NOTICES.md" target="_blank" rel="noopener noreferrer">第三方开源许可说明</a>。</p>'
                    . '</section>'
                );
                $panel->addItem($about);
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
            '<link rel="stylesheet" href="' . self::escape(Common::url('assets/settings.css?v=2.4.12', $pluginBase)) . '">'
            . '<script defer src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>'
            . '<script defer src="' . self::escape(Common::url('assets/settings.js?v=2.4.12', $pluginBase)) . '"></script>'
        );
        $form->addItem($assets);
    }

    /**
     * 在 Typecho 后台标题栏提供主题与插件设置的快捷入口。
     */
    public static function renderAdminNav(): void
    {
        self::ensureRegisteredHooks();

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
            'mermaidFollowMellowTheme' => '1' === self::setting('mermaidFollowMellowTheme', '1'),
            'turnstileEnabled' => self::turnstileRequiredForCurrentUser()
        );
    }

    /**
     * 配置保存时刷新 Typecho 持久化的钩子列表，使覆盖升级无需手动停用并重新启用插件。
     */
    private static function refreshRegisteredHooks(): void
    {
        $plugins = \Typecho\Plugin::export();
        if (!isset($plugins['activated']['MellowEnhance'])) {
            return;
        }

        \Typecho\Plugin::deactivate('MellowEnhance');
        self::activate();
        \Typecho\Plugin::activate('MellowEnhance');
        \Utils\Helper::setOption('plugins', \Typecho\Plugin::export());
    }

    /**
     * 判断当前运行态与数据库中的钩子是否完整，兼容直接覆盖插件文件的升级方式。
     */
    private static function registeredHooksAreCurrent(array $plugins): bool
    {
        if (
            !isset($plugins['activated']['MellowEnhance']['handles'])
            || !is_array($plugins['activated']['MellowEnhance']['handles'])
            || !isset($plugins['handles'])
            || !is_array($plugins['handles'])
        ) {
            return false;
        }

        $pluginHandles = $plugins['activated']['MellowEnhance']['handles'];
        foreach (self::hookDefinitions() as $definition) {
            $handle = $definition['handle'] . ':' . $definition['component'];
            $callback = $definition['callback'];

            if (
                !isset($pluginHandles[$handle])
                || !is_array($pluginHandles[$handle])
                || !in_array($callback, $pluginHandles[$handle], true)
                || !isset($plugins['handles'][$handle])
                || !is_array($plugins['handles'][$handle])
                || !in_array($callback, $plugins['handles'][$handle], true)
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * 前台或后台首次触发旧钩子时，一次性补齐升级后新增的评论钩子。
     */
    private static function ensureRegisteredHooks(): void
    {
        if (self::$registeredHooksChecked) {
            return;
        }
        self::$registeredHooksChecked = true;

        $plugins = \Typecho\Plugin::export();
        if (!isset($plugins['activated']['MellowEnhance']) || self::registeredHooksAreCurrent($plugins)) {
            return;
        }

        try {
            self::refreshRegisteredHooks();
        } catch (\Throwable $error) {
            error_log('MellowEnhance failed to refresh plugin hooks: ' . $error->getMessage());
        }
    }

    private static function turnstileCommentsConfigured(): bool
    {
        return self::mellowThemeActive()
            && '1' === self::setting('enableTurnstile')
            && '1' === self::setting('turnstileRequireComments')
            && '' !== trim(self::setting('turnstileSiteKey', ''))
            && '' !== trim(self::setting('turnstileSecretKey', ''));
    }

    private static function mellowThemeActive(): bool
    {
        try {
            return 0 === strcasecmp('Mellow', trim((string) Options::alloc()->theme));
        } catch (\Throwable $error) {
            return false;
        }
    }

    /**
     * 读取当前启用的 Mellow 主题设置；切换到其他主题后不沿用这些评论规则。
     */
    private static function themeSetting(string $name, string $default = ''): string
    {
        if (!self::mellowThemeActive()) {
            return $default;
        }

        try {
            $options = Options::alloc();
            if (isset($options->{$name})) {
                return (string) $options->{$name};
            }
        } catch (\Throwable $error) {
            return $default;
        }

        return $default;
    }

    /**
     * 读取评论规则提示文本；空值和不可见控制字符不会覆盖安全的默认提示。
     */
    private static function commentRuleMessage(string $name, string $default): string
    {
        $message = trim(self::themeSetting($name, $default));
        if ('' === $message) {
            return $default;
        }

        $sanitized = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $message);
        if (!is_string($sanitized) || '' === trim($sanitized)) {
            return $default;
        }

        return trim($sanitized);
    }

    /**
     * Cloudflare 公布的测试密钥会返回固定测试字段，只能用于开发与自动化测试。
     */
    private static function turnstileUsesOfficialTestKeys(): bool
    {
        $siteKeys = array(
            '1x00000000000000000000AA',
            '2x00000000000000000000AB',
            '1x00000000000000000000BB',
            '2x00000000000000000000BB',
            '3x00000000000000000000FF'
        );
        $secretKeys = array(
            '1x0000000000000000000000000000000AA',
            '2x0000000000000000000000000000000AA',
            '3x0000000000000000000000000000000AA'
        );

        return in_array(trim(self::setting('turnstileSiteKey', '')), $siteKeys, true)
            && in_array(trim(self::setting('turnstileSecretKey', '')), $secretKeys, true);
    }

    private static function currentUserHasLogin(): bool
    {
        try {
            return (bool) \Widget\User::alloc()->hasLogin();
        } catch (\Throwable $error) {
            return false;
        }
    }

    private static function turnstileRequiredForCurrentUser(): bool
    {
        if (!self::turnstileCommentsConfigured()) {
            return false;
        }

        return !('1' === self::setting('turnstileExemptLoggedIn') && self::currentUserHasLogin());
    }

    /**
     * 将评论文本统一为适合链接与敏感词匹配的形式。
     */
    private static function normalizeCommentFilterText(string $value, bool $stripHtml = true): string
    {
        $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        if (class_exists('Normalizer')) {
            $normalized = \Normalizer::normalize($value, \Normalizer::FORM_KC);
            if (is_string($normalized)) {
                $value = $normalized;
            }
        } elseif (function_exists('mb_convert_kana')) {
            $value = mb_convert_kana($value, 'as', 'UTF-8');
        }

        $value = strtr($value, array(
            '．' => '.',
            '：' => ':',
            '／' => '/',
            '＠' => '@'
        ));

        $withoutInvisibleCharacters = preg_replace(
            '/[\x{00AD}\x{034F}\x{061C}\x{180E}\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{206F}\x{FEFF}]/u',
            '',
            $value
        );
        if (is_string($withoutInvisibleCharacters)) {
            $value = $withoutInvisibleCharacters;
        }

        if ($stripHtml) {
            $value = strip_tags($value);
        }

        $collapsedWhitespace = preg_replace('/\s+/u', ' ', $value);
        if (is_string($collapsedWhitespace)) {
            $value = $collapsedWhitespace;
        }

        return trim(function_exists('mb_strtolower')
            ? mb_strtolower($value, 'UTF-8')
            : strtolower($value));
    }

    /**
     * 检查 URL、裸域名、Markdown 链接和 HTML 链接。
     */
    private static function commentContainsLink(string $commentText): bool
    {
        $commentText = self::normalizeCommentFilterText($commentText, false);
        if ('' === $commentText) {
            return false;
        }

        $domain = '(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+'
            . '(?:com|net|org|edu|gov|mil|int|info|biz|name|mobi|pro|aero|museum|coop|io|ai|app|dev|tech|cloud|shop|store|blog|link|live|world|work|vip|club|top|site|online|xyz|cc|tv|me|co|[a-z]{2}|xn--[a-z0-9-]{2,59})(?![a-z0-9-])';
        $explicitPatterns = array(
            '~<\s*a\b[^>]*\bhref\s*=~iu',
            '~(?:https?|ftp):/{2}[^\s<>"\']+~iu',
            '~mailto\s*:[^\s<>"\']+~iu',
            '~(?<![:\p{L}\p{N}@_-])//(?:www\.)?' . $domain . '(?::\d{2,5})?(?:[/?#][^\s<>"\']*)?~iu',
            '~(?<![\p{L}\p{N}@_-])www\.[^\s<>"\']+~iu',
            '~\[[^\]\r\n]+\]\(\s*(?:<?(?:https?:)?//|/|#|mailto:|[^\s)]+\.[\p{L}]{2,63})~iu'
        );

        foreach ($explicitPatterns as $pattern) {
            if (1 === preg_match($pattern, $commentText)) {
                return true;
            }
        }

        $nakedDomainPattern = '~(?<![@\p{L}\p{N}_-])' . $domain
            . '(?::\d{2,5})?(?:[/?#][^\s<>"\']*)?~iu';
        if (false === preg_match_all($nakedDomainPattern, $commentText, $matches)) {
            return false;
        }

        foreach ($matches[0] as $candidate) {
            if (1 === preg_match('~[:/?#]~', $candidate)) {
                return true;
            }

            if (1 === preg_match(
                '~^[a-z0-9][a-z0-9._-]*\.(?:md|js|ts|py|rb|go|rs|sh|cs|cc|kt|pl|m|mm)$~i',
                $candidate
            )) {
                continue;
            }

            return true;
        }

        return false;
    }

    /**
     * 敏感词按行配置，规范化后执行不区分英文大小写的字面子串匹配。
     */
    private static function commentContainsSensitiveWord(string $commentText, string $configuredWords): bool
    {
        $commentText = self::normalizeCommentFilterText($commentText);
        if ('' === $commentText || '' === trim($configuredWords)) {
            return false;
        }

        $words = preg_split('/\R/u', $configuredWords);
        if (!is_array($words)) {
            $words = array($configuredWords);
        }

        $seen = array();
        foreach ($words as $word) {
            $word = self::normalizeCommentFilterText((string) $word);
            if ('' === $word || isset($seen[$word])) {
                continue;
            }

            $seen[$word] = true;
            if (false !== strpos($commentText, $word)) {
                return true;
            }
        }

        return false;
    }

    /**
     * AJAX 评论返回结构化错误供 Mellow 模态框展示；普通请求继续交给 Typecho 异常页。
     */
    private static function rejectComment($message, int $status = 403, string $reason = 'validation'): void
    {
        $message = (string) $message;
        $request = \Typecho\Request::getInstance();
        if ($request->isAjax() && '1' === (string) $request->getHeader('X-Mellow-Comment', '0')) {
            $payload = json_encode(array(
                'success' => false,
                'message' => $message,
                'reason' => $reason
            ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);

            $response = \Typecho\Response::getInstance();
            $response->setStatus($status)
                ->setContentType('application/json')
                ->setHeader('Cache-Control', 'no-store');
            echo false === $payload
                ? '{"success":false,"message":"评论提交失败，请修改后重试。","reason":"validation"}'
                : $payload;
            $response->respond();
        }

        throw new \Typecho\Widget\Exception($message, $status);
    }

    /**
     * 在调用外部验证服务前执行 Mellow 本地评论规则。
     */
    private static function validateMellowCommentRules($comment)
    {
        if (!self::mellowThemeActive()) {
            return $comment;
        }

        if ('0' !== trim(self::themeSetting('disableComments', '0'))) {
            self::rejectComment(_t('评论区已关闭，暂时无法发表评论。'), 403, 'comments-closed');
        }

        $commentText = is_array($comment) && isset($comment['text'])
            ? (string) $comment['text']
            : '';

        if (
            '0' !== trim(self::themeSetting('disallowCommentLinks', '0'))
            && self::commentContainsLink($commentText)
        ) {
            self::rejectComment(
                self::commentRuleMessage(
                    'commentLinkBlockedMessage',
                    _t('评论中不能包含链接，请移除后重试。')
                ),
                403,
                'link'
            );
        }

        if (self::commentContainsSensitiveWord(
            $commentText,
            self::themeSetting('commentSensitiveWords', '')
        )) {
            self::rejectComment(
                self::commentRuleMessage(
                    'commentSensitiveBlockedMessage',
                    _t('评论包含不允许的内容，请修改后重试。')
                ),
                403,
                'sensitive'
            );
        }

        return $comment;
    }

    /**
     * 在 Mellow 评论提交按钮左侧输出 Turnstile 占位符。
     *
     * @return bool 是否需要在脚本完成验证前禁用提交按钮
     */
    public static function renderCommentVerification($archive = null): bool
    {
        if (!self::turnstileRequiredForCurrentUser()) {
            return false;
        }

        $siteKey = trim(self::setting('turnstileSiteKey', ''));
        ?>
        <div class="mellow-turnstile" data-mellow-turnstile data-sitekey="<?php echo self::escape($siteKey); ?>">
            <div class="mellow-turnstile__widget" data-turnstile-widget></div>
            <p class="mellow-turnstile__status" data-turnstile-status role="status" aria-live="polite"></p>
            <noscript><p class="mellow-turnstile__noscript">发表评论前请启用 JavaScript 以完成人机验证。</p></noscript>
        </div>
        <?php
        return true;
    }

    /**
     * 在 Typecho 写入评论前执行主题规则，并按需向 Cloudflare Siteverify 验证一次性令牌。
     */
    public static function validateTurnstileComment($comment, $content)
    {
        $comment = self::validateMellowCommentRules($comment);

        if (!self::turnstileRequiredForCurrentUser()) {
            return $comment;
        }

        $request = \Typecho\Request::getInstance();
        $token = trim((string) $request->get('cf-turnstile-response', ''));
        if ('' === $token) {
            self::rejectComment(_t('请先完成人机验证，再发表评论。'), 403, 'turnstile-required');
        }
        if (strlen($token) > 2048) {
            self::rejectComment(_t('人机验证令牌无效，请重新验证。'), 403, 'turnstile-invalid');
        }

        $client = \Typecho\Http\Client::get();
        if (!$client) {
            self::rejectComment(_t('服务器无法连接人机验证服务，请联系站点管理员。'), 503, 'turnstile-unavailable');
        }

        $payload = array(
            'secret' => trim(self::setting('turnstileSecretKey', '')),
            'response' => $token
        );
        $remoteIp = $request->getIp();
        if (false !== filter_var($remoteIp, FILTER_VALIDATE_IP)) {
            $payload['remoteip'] = $remoteIp;
        }

        try {
            $client->setTimeout(8)
                ->setMultipart(false)
                ->setHeader('Accept', 'application/json')
                ->setData($payload)
                ->send('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        } catch (\Throwable $error) {
            self::rejectComment(_t('人机验证服务暂时不可用，请稍后重试。'), 503, 'turnstile-unavailable');
        }

        if (200 !== $client->getResponseStatus()) {
            self::rejectComment(_t('人机验证服务暂时不可用，请稍后重试。'), 503, 'turnstile-unavailable');
        }

        $result = json_decode($client->getResponseBody(), true);
        if (!is_array($result)) {
            self::rejectComment(_t('人机验证服务返回异常，请稍后重试。'), 503, 'turnstile-unavailable');
        }

        $errors = isset($result['error-codes']) && is_array($result['error-codes'])
            ? $result['error-codes']
            : array();
        if (empty($result['success'])) {
            if (array_intersect(array('missing-input-secret', 'invalid-input-secret'), $errors)) {
                self::rejectComment(_t('人机验证配置有误，请联系站点管理员。'), 503, 'turnstile-config');
            }
            if (in_array('timeout-or-duplicate', $errors, true)) {
                self::rejectComment(_t('人机验证已过期或已使用，请重新验证。'), 403, 'turnstile-expired');
            }
            if (in_array('internal-error', $errors, true)) {
                self::rejectComment(_t('人机验证服务暂时不可用，请稍后重试。'), 503, 'turnstile-unavailable');
            }

            self::rejectComment(_t('人机验证失败，请重新验证。'), 403, 'turnstile-failed');
        }

        if (!self::turnstileUsesOfficialTestKeys()) {
            if (!isset($result['action']) || 'mellow_comment' !== (string) $result['action']) {
                self::rejectComment(_t('人机验证用途不匹配，请重新验证。'), 403, 'turnstile-mismatch');
            }

            $siteHost = parse_url((string) Options::alloc()->siteUrl, PHP_URL_HOST);
            $verifiedHost = isset($result['hostname']) ? strtolower(rtrim((string) $result['hostname'], '.')) : '';
            $siteHost = is_string($siteHost) ? strtolower(rtrim($siteHost, '.')) : '';
            if ('' === $verifiedHost || ('' !== $siteHost && $verifiedHost !== $siteHost)) {
                self::rejectComment(_t('人机验证站点不匹配，请重新验证。'), 403, 'turnstile-mismatch');
            }
        }

        return $comment;
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
        $hasStoredItems = array_key_exists('mellowDownloadItems', $fields);
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

        if ($hasStoredItems) {
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
     * 保留旧版前端 head 钩子；样式改由运行时按正文内容加载。
     */
    public static function renderFrontendHead(): void
    {
        self::ensureRegisteredHooks();

        // 保留旧钩子兼容性；前端样式由 frontend.js 在检测到对应内容后按需加载。
    }

    /**
     * 加载本地 KaTeX / Mermaid，并注册初始页面和 PJAX 内容渲染。
     */
    public static function renderFrontendAssets(): void
    {
        self::ensureRegisteredHooks();

        if (self::$frontendAssetsRendered) {
            return;
        }

        $features = self::frontendFeatures();
        if (!$features['latexEnabled'] && !$features['mermaidEnabled'] && !$features['turnstileEnabled']) {
            return;
        }

        self::$frontendAssetsRendered = true;

        $options = Options::alloc();
        $pluginBase = Common::url('MellowEnhance', $options->pluginUrl);
        $vditorBase = Common::url('vendor/vditor', $pluginBase);
        $config = $features;
        $config['frontendStyleUrl'] = Common::url('assets/frontend.css?v=2.4.12', $pluginBase);
        if ($features['turnstileEnabled']) {
            $config['turnstileScriptUrl'] = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        }
        if ($features['latexEnabled']) {
            $config['katexUrl'] = Common::url('dist/js/katex/katex.min.js', $vditorBase);
            $config['katexStyleUrl'] = Common::url('dist/js/katex/katex.min.css', $vditorBase);
        }
        if ($features['mermaidEnabled']) {
            $config['mermaidUrl'] = Common::url('dist/js/mermaid/mermaid.min.js', $vditorBase);
        }
        ?>
        <script>window.MellowEnhanceFrontendConfig = <?php echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script>
            <script defer src="<?php echo self::escape(Common::url('assets/frontend.js?v=2.4.19', $pluginBase)); ?>"></script>
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
        $pluginBase = Common::url('MellowEnhance', $options->pluginUrl);
        $vditorBase = Common::url('vendor/vditor', $pluginBase);
        $primaryColor = isset($options->primaryColor) ? (string) $options->primaryColor : '#0aa879';
        if (!preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $primaryColor)) {
            $primaryColor = '#0aa879';
        }
        $fontMode = isset($options->fontMode) ? trim((string) $options->fontMode) : 'sans';
        if (!in_array($fontMode, array('sans', 'content-serif', 'serif'), true)) {
            $fontMode = 'sans';
        }

        $isMarkdown = true;
        if (method_exists($content, 'have') && $content->have()) {
            $isMarkdown = (bool) $content->isMarkdown;
        }
        $editorEnabled = (bool) $options->markdown
            && $isMarkdown
            && ($wysiwygEnabled || $instantEnabled);

        $config = array(
            'editorEnabled' => $editorEnabled,
            'markdownEnabled' => (bool) $options->markdown,
            'contentIsMarkdown' => $isMarkdown,
            'assetBase' => $vditorBase,
            'primaryColor' => $primaryColor,
            'fontMode' => $fontMode,
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
            <link rel="stylesheet" href="<?php echo self::escape(Common::url('assets/admin.css?v=2.4.12', $pluginBase)); ?>">
        <?php if ($editorEnabled): ?>
            <link rel="stylesheet" href="<?php echo self::escape(Common::url('assets/mellow-content.css?v=2.4.12', $pluginBase)); ?>">
        <?php endif; ?>
        <script>window.MellowEnhanceConfig = <?php echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script>
        <?php if ($editorEnabled): ?>
            <script src="<?php echo self::escape(Common::url('dist/index.min.js', $vditorBase)); ?>"></script>
        <?php endif; ?>
            <script src="<?php echo self::escape(Common::url('assets/admin.js?v=2.4.12', $pluginBase)); ?>"></script>
        <?php
    }
}
