(function () {
    "use strict";

    var config = window.MellowEnhanceFrontendConfig || {};
    var latexEnabled = Boolean(config.latexEnabled);
    var mermaidEnabled = Boolean(config.mermaidEnabled);
    var mermaidSourceToggleEnabled = Boolean(config.mermaidSourceToggleEnabled);
    var mermaidFollowMellowTheme = config.mermaidFollowMellowTheme !== false;
    var libraryPromises = {};
    var stylesheetPromises = {};
    var mermaidSequence = Promise.resolve();
    var mermaidId = 0;
    var mermaidThemeKey = "";
    var themeRefreshTimer = null;

    if (!latexEnabled && !mermaidEnabled) {
        return;
    }

    function contentRoots() {
        return Array.prototype.slice.call(document.querySelectorAll(".article__content"));
    }

    function replacementTarget(code) {
        return code.closest(".code-frame") || code.closest("pre") || code;
    }

    function loadLibrary(name, url, globalName) {
        if (window[globalName]) {
            return Promise.resolve(window[globalName]);
        }
        if (libraryPromises[name]) {
            return libraryPromises[name];
        }
        if (!url) {
            return Promise.reject(new Error(name + " 资源地址不存在"));
        }

        libraryPromises[name] = new Promise(function (resolve, reject) {
            var id = "mellow-enhance-library-" + name;
            var script = document.getElementById(id);
            if (!script) {
                script = document.createElement("script");
                script.id = id;
                script.src = url;
                script.async = true;
            }
            script.addEventListener("load", function () {
                if (window[globalName]) {
                    resolve(window[globalName]);
                } else {
                    delete libraryPromises[name];
                    script.remove();
                    reject(new Error(name + " 初始化失败"));
                }
            }, {once: true});
            script.addEventListener("error", function () {
                delete libraryPromises[name];
                script.remove();
                reject(new Error(name + " 加载失败"));
            }, {once: true});

            if (!script.isConnected) {
                document.head.appendChild(script);
            }
        });

        return libraryPromises[name];
    }

    function loadStylesheet(name, url) {
        if (stylesheetPromises[name]) {
            return stylesheetPromises[name];
        }
        if (!url) {
            return Promise.reject(new Error(name + " 样式地址不存在"));
        }

        stylesheetPromises[name] = new Promise(function (resolve, reject) {
            var id = "mellow-enhance-style-" + name;
            var stylesheet = document.getElementById(id);
            if (stylesheet && stylesheet.dataset.mellowLoaded === "true") {
                resolve(stylesheet);
                return;
            }

            if (!stylesheet) {
                stylesheet = document.createElement("link");
                stylesheet.id = id;
                stylesheet.rel = "stylesheet";
                stylesheet.href = url;
                stylesheet.media = "print";
            }

            stylesheet.addEventListener("load", function () {
                stylesheet.media = "all";
                stylesheet.dataset.mellowLoaded = "true";
                resolve(stylesheet);
            }, {once: true});
            stylesheet.addEventListener("error", function () {
                delete stylesheetPromises[name];
                stylesheet.remove();
                reject(new Error(name + " 样式加载失败"));
            }, {once: true});

            if (!stylesheet.isConnected) {
                document.head.appendChild(stylesheet);
            }
        });

        return stylesheetPromises[name];
    }

    function createMathElement(source, displayMode, blockElement) {
        var element = document.createElement(blockElement ? "div" : "span");
        element.className = "mellow-enhance-math "
            + (displayMode ? "mellow-enhance-math--display" : "mellow-enhance-math--inline");
        element.mellowMathSource = source;

        try {
            window.katex.render(source, element, {
                displayMode: displayMode,
                throwOnError: false,
                strict: "ignore",
                trust: false,
                output: "htmlAndMathml"
            });
        } catch (error) {
            return null;
        }

        return element;
    }

    function renderMathCodeBlocks(root) {
        root.querySelectorAll("code.lang-math, code.language-math").forEach(function (code) {
            if (code.closest(".mellow-enhance-math")) {
                return;
            }
            var source = code.textContent.trim();
            if (!source) {
                return;
            }
            var math = createMathElement(source, true, true);
            if (math) {
                replacementTarget(code).replaceWith(math);
            }
        });
    }

    function displayFormula(text) {
        var value = text.trim();
        if (value.length > 4 && value.slice(0, 2) === "$$" && value.slice(-2) === "$$") {
            return value.slice(2, -2).trim();
        }
        if (value.length > 4 && value.slice(0, 2) === "\\[" && value.slice(-2) === "\\]") {
            return value.slice(2, -2).trim();
        }
        return "";
    }

    function renderMathParagraphs(root) {
        root.querySelectorAll("p").forEach(function (paragraph) {
            if (paragraph.childElementCount || paragraph.closest(".mellow-enhance-math, .mellow-enhance-mermaid")) {
                return;
            }
            var source = displayFormula(paragraph.textContent);
            if (!source) {
                return;
            }
            var math = createMathElement(source, true, true);
            if (math) {
                paragraph.replaceWith(math);
            }
        });
    }

    function isEscaped(text, index) {
        var slashes = 0;
        for (var cursor = index - 1; cursor >= 0 && text.charAt(cursor) === "\\"; cursor--) {
            slashes++;
        }
        return slashes % 2 === 1;
    }

    function nextMathOpening(text, start) {
        for (var index = start; index < text.length; index++) {
            if (isEscaped(text, index)) {
                continue;
            }
            var pair = text.slice(index, index + 2);
            if (pair === "$$") {
                return {index: index, open: "$$", close: "$$", display: true};
            }
            if (pair === "\\[") {
                return {index: index, open: "\\[", close: "\\]", display: true};
            }
            if (pair === "\\(") {
                return {index: index, open: "\\(", close: "\\)", display: false};
            }
            if (text.charAt(index) === "$"
                && text.charAt(index + 1) !== "$"
                && index + 1 < text.length
                && !/\s/.test(text.charAt(index + 1))) {
                return {index: index, open: "$", close: "$", display: false};
            }
        }
        return null;
    }

    function closingIndex(text, opening) {
        var cursor = opening.index + opening.open.length;
        while (cursor < text.length) {
            var found = text.indexOf(opening.close, cursor);
            if (found === -1) {
                return -1;
            }
            if (!isEscaped(text, found)) {
                if (opening.close !== "$") {
                    return found;
                }
                if (text.charAt(found - 1)
                    && !/\s/.test(text.charAt(found - 1))
                    && text.charAt(found + 1) !== "$") {
                    return found;
                }
                return -1;
            }
            cursor = found + opening.close.length;
        }
        return -1;
    }

    function mathTokens(text) {
        var tokens = [];
        var searchFrom = 0;
        while (searchFrom < text.length) {
            var opening = nextMathOpening(text, searchFrom);
            if (!opening) {
                break;
            }
            var closeAt = closingIndex(text, opening);
            if (closeAt === -1) {
                searchFrom = opening.index + opening.open.length;
                continue;
            }
            var source = text.slice(opening.index + opening.open.length, closeAt);
            if (!source.trim() || (!opening.display && /[\r\n]/.test(source))) {
                searchFrom = closeAt + opening.close.length;
                continue;
            }
            tokens.push({
                start: opening.index,
                end: closeAt + opening.close.length,
                source: source.trim(),
                display: opening.display,
                raw: text.slice(opening.index, closeAt + opening.close.length)
            });
            searchFrom = closeAt + opening.close.length;
        }
        return tokens;
    }

    function renderMathTextNode(node) {
        var tokens = mathTokens(node.nodeValue || "");
        if (!tokens.length || !node.parentNode) {
            return;
        }

        var text = node.nodeValue;
        var fragment = document.createDocumentFragment();
        var offset = 0;
        tokens.forEach(function (token) {
            if (token.start > offset) {
                fragment.appendChild(document.createTextNode(text.slice(offset, token.start)));
            }
            var math = createMathElement(token.source, token.display, false);
            fragment.appendChild(math || document.createTextNode(token.raw));
            offset = token.end;
        });
        if (offset < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(offset)));
        }
        node.parentNode.replaceChild(fragment, node);
    }

    function renderMathText(root) {
        var nodes = [];
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                var parent = node.parentElement;
                if (!parent || !/[\$\\]/.test(node.nodeValue || "")) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest("code, pre, script, style, textarea, .katex, .mellow-enhance-math, .mellow-enhance-mermaid")) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }
        nodes.forEach(renderMathTextNode);
    }

    function renderLatex(root) {
        if (!latexEnabled || !window.katex) {
            return;
        }
        renderMathCodeBlocks(root);
        renderMathParagraphs(root);
        renderMathText(root);
    }

    function fallbackCopy(text) {
        return new Promise(function (resolve, reject) {
            var textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.inset = "-9999px auto auto -9999px";
            document.body.appendChild(textarea);
            textarea.select();
            try {
                if (document.execCommand("copy")) {
                    resolve();
                } else {
                    reject(new Error("浏览器拒绝复制"));
                }
            } catch (error) {
                reject(error);
            } finally {
                textarea.remove();
            }
        });
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(function () {
                return fallbackCopy(text);
            });
        }
        return fallbackCopy(text);
    }

    function setMermaidView(container, view) {
        var codeView = mermaidSourceToggleEnabled && view === "code";
        var diagram = container.querySelector(".mellow-enhance-mermaid__diagram");
        var source = container.querySelector(".mellow-enhance-mermaid__source");
        var diagramButton = container.querySelector('[data-mermaid-view="diagram"]');
        var codeButton = container.querySelector('[data-mermaid-view="code"]');
        var copyButton = container.querySelector(".mellow-enhance-mermaid__copy");

        container.classList.toggle("is-code-view", codeView);
        if (diagram) {
            diagram.hidden = codeView;
        }
        if (source) {
            source.hidden = !codeView;
        }
        if (diagramButton) {
            diagramButton.setAttribute("aria-pressed", String(!codeView));
        }
        if (codeButton) {
            codeButton.setAttribute("aria-pressed", String(codeView));
        }
        if (copyButton) {
            copyButton.hidden = !codeView;
        }
    }

    function createMermaidContainer(source) {
        var container = document.createElement("div");
        container.className = "mellow-enhance-mermaid is-loading";
        container.classList.add(mermaidFollowMellowTheme ? "is-mellow-themed" : "is-mermaid-default");
        container.setAttribute("role", "group");
        container.setAttribute("aria-label", "Mermaid 图表");
        container.mellowMermaidSource = source;

        var toolbar = document.createElement("div");
        toolbar.className = "mellow-enhance-mermaid__toolbar";

        var identity = document.createElement("div");
        identity.className = "mellow-enhance-mermaid__identity";
        var label = document.createElement("span");
        label.className = "mellow-enhance-mermaid__label";
        label.textContent = "MERMAID";
        var progress = document.createElement("span");
        progress.className = "mellow-enhance-mermaid__progress";
        progress.setAttribute("aria-hidden", "true");
        identity.appendChild(label);
        identity.appendChild(progress);
        toolbar.appendChild(identity);

        if (mermaidSourceToggleEnabled) {
            var actions = document.createElement("div");
            actions.className = "mellow-enhance-mermaid__actions";

            var views = document.createElement("div");
            views.className = "mellow-enhance-mermaid__views";
            views.setAttribute("role", "group");
            views.setAttribute("aria-label", "Mermaid 查看方式");

            var diagramButton = document.createElement("button");
            diagramButton.type = "button";
            diagramButton.className = "mellow-enhance-mermaid__view";
            diagramButton.dataset.mermaidView = "diagram";
            diagramButton.setAttribute("aria-pressed", "true");
            diagramButton.textContent = "图表";

            var codeButton = document.createElement("button");
            codeButton.type = "button";
            codeButton.className = "mellow-enhance-mermaid__view";
            codeButton.dataset.mermaidView = "code";
            codeButton.setAttribute("aria-pressed", "false");
            codeButton.textContent = "代码";

            var copyButton = document.createElement("button");
            copyButton.type = "button";
            copyButton.className = "mellow-enhance-mermaid__copy";
            copyButton.setAttribute("aria-label", "复制 Mermaid 代码");
            copyButton.textContent = "复制";
            copyButton.hidden = true;

            diagramButton.addEventListener("click", function () {
                setMermaidView(container, "diagram");
            });
            codeButton.addEventListener("click", function () {
                setMermaidView(container, "code");
            });
            copyButton.addEventListener("click", function () {
                copyButton.disabled = true;
                copyText(container.mellowMermaidSource || "").then(function () {
                    copyButton.textContent = "已复制";
                    copyButton.classList.add("is-copied");
                }).catch(function () {
                    copyButton.textContent = "复制失败";
                }).then(function () {
                    window.setTimeout(function () {
                        copyButton.textContent = "复制";
                        copyButton.classList.remove("is-copied");
                        copyButton.disabled = false;
                    }, 1400);
                });
            });

            views.appendChild(diagramButton);
            views.appendChild(codeButton);
            actions.appendChild(views);
            actions.appendChild(copyButton);
            toolbar.appendChild(actions);
        }

        var diagram = document.createElement("div");
        diagram.className = "mellow-enhance-mermaid__diagram";
        diagram.setAttribute("role", "img");
        diagram.setAttribute("aria-label", "Mermaid 图表");
        diagram.setAttribute("aria-busy", "true");
        var loading = document.createElement("span");
        loading.className = "mellow-enhance-mermaid__loading";
        loading.textContent = "正在绘制图表…";
        diagram.appendChild(loading);

        container.appendChild(toolbar);
        container.appendChild(diagram);

        if (mermaidSourceToggleEnabled) {
            var sourcePanel = document.createElement("div");
            sourcePanel.className = "mellow-enhance-mermaid__source";
            sourcePanel.setAttribute("aria-label", "Mermaid 源代码");
            sourcePanel.hidden = true;
            var sourceCode = document.createElement("code");
            sourceCode.className = "mellow-enhance-mermaid__source-code";
            sourceCode.textContent = source;
            sourcePanel.appendChild(sourceCode);
            container.appendChild(sourcePanel);
        }

        return container;
    }

    function collectNewMermaid(root) {
        var containers = [];
        root.querySelectorAll("code.lang-mermaid, code.language-mermaid").forEach(function (code) {
            if (code.closest(".mellow-enhance-mermaid")) {
                return;
            }
            var source = code.textContent.trim();
            if (!source) {
                return;
            }
            var container = createMermaidContainer(source);
            replacementTarget(code).replaceWith(container);
            containers.push(container);
        });
        return containers;
    }

    function resolvedColor(variable, fallback) {
        var probe = document.createElement("span");
        probe.style.position = "fixed";
        probe.style.visibility = "hidden";
        probe.style.color = "var(" + variable + ", " + fallback + ")";
        document.body.appendChild(probe);
        var color = window.getComputedStyle(probe).color || fallback;
        probe.remove();

        try {
            var canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            var context = canvas.getContext("2d", {willReadFrequently: true});
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            var pixel = context.getImageData(0, 0, 1, 1).data;
            if (pixel[3] > 0) {
                return "#" + [pixel[0], pixel[1], pixel[2]].map(function (channel) {
                    return channel.toString(16).padStart(2, "0");
                }).join("");
            }
        } catch (error) {
            return fallback;
        }

        return fallback;
    }

    function mermaidTheme() {
        if (!mermaidFollowMellowTheme) {
            return {
                key: "mermaid-default",
                options: {
                    startOnLoad: false,
                    securityLevel: "strict",
                    theme: "default",
                    flowchart: {htmlLabels: false, useMaxWidth: true},
                    sequence: {useMaxWidth: true, diagramMarginX: 8, diagramMarginY: 8, boxMargin: 8}
                }
            };
        }

        var dark = document.documentElement.classList.contains("is-dark");
        var primary = resolvedColor("--color-primary", "#0aa879");
        var primarySoft = resolvedColor("--color-primary-soft", dark ? "#263b35" : "#e7f7f1");
        var surface = resolvedColor("--color-surface", dark ? "#252a2b" : "#ffffff");
        var background = resolvedColor("--color-background", dark ? "#171c1b" : "#f2f7f5");
        var text = resolvedColor("--color-text", dark ? "#eef3f1" : "#26312e");
        var muted = resolvedColor("--color-muted", dark ? "#aab5b1" : "#6d7975");
        var variables = {
            darkMode: dark,
            background: surface,
            primaryColor: primarySoft,
            primaryTextColor: text,
            primaryBorderColor: primary,
            secondaryColor: surface,
            secondaryTextColor: text,
            secondaryBorderColor: muted,
            tertiaryColor: background,
            tertiaryTextColor: text,
            tertiaryBorderColor: muted,
            lineColor: muted,
            textColor: text,
            mainBkg: primarySoft,
            nodeBorder: primary,
            clusterBkg: background,
            clusterBorder: muted,
            edgeLabelBackground: surface,
            titleColor: text,
            noteBkgColor: primarySoft,
            noteTextColor: text,
            noteBorderColor: primary,
            actorBkg: surface,
            actorBorder: primary,
            actorTextColor: text,
            signalColor: text,
            signalTextColor: text,
            labelBoxBkgColor: surface,
            labelBoxBorderColor: muted,
            labelTextColor: text
        };

        return {
            key: JSON.stringify(variables),
            options: {
                startOnLoad: false,
                securityLevel: "strict",
                theme: "base",
                fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif",
                altFontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif",
                flowchart: {htmlLabels: false, useMaxWidth: true},
                sequence: {useMaxWidth: true, diagramMarginX: 8, diagramMarginY: 8, boxMargin: 8},
                themeVariables: variables
            }
        };
    }

    function showMermaidError(container, source, error, id) {
        var orphan = document.getElementById(id);
        if (orphan && !container.contains(orphan) && orphan.parentElement) {
            orphan.parentElement.remove();
        }
        var diagram = container.querySelector(".mellow-enhance-mermaid__diagram") || container;
        diagram.textContent = "";
        container.classList.remove("is-loading");
        container.classList.add("has-error");
        diagram.setAttribute("aria-busy", "false");

        var title = document.createElement("strong");
        title.textContent = "Mermaid 图表解析失败";
        var detail = document.createElement("span");
        detail.textContent = error && error.message ? error.message.split("\n")[0] : "请检查图表语法";
        var code = document.createElement("code");
        code.textContent = source;
        diagram.appendChild(title);
        diagram.appendChild(detail);
        diagram.appendChild(code);
    }

    function renderMermaidContainer(container, theme) {
        var source = container.mellowMermaidSource || "";
        if (!source) {
            return Promise.resolve();
        }
        var diagram = container.querySelector(".mellow-enhance-mermaid__diagram");
        if (!diagram) {
            return Promise.resolve();
        }
        var id = "mellow-enhance-mermaid-" + (++mermaidId);
        container.classList.add("is-loading");
        container.classList.remove("has-error");
        diagram.setAttribute("aria-busy", "true");

        var render;
        try {
            render = window.mermaid.render(id, source);
        } catch (error) {
            showMermaidError(container, source, error, id);
            return Promise.resolve();
        }

        return Promise.resolve(render).then(function (result) {
            if (!result || !result.svg) {
                throw new Error("未生成 SVG");
            }
            diagram.innerHTML = result.svg;
            if (typeof result.bindFunctions === "function") {
                result.bindFunctions(diagram);
            }
            var svg = diagram.querySelector("svg");
            if (svg) {
                svg.setAttribute("role", "img");
                svg.setAttribute("aria-label", "Mermaid 图表");
            }
            container.classList.remove("is-loading", "has-error");
            diagram.setAttribute("aria-busy", "false");
            container.dataset.mellowMermaidTheme = theme.key;
        }).catch(function (error) {
            showMermaidError(container, source, error, id);
        });
    }

    function queueMermaid(containers, theme) {
        if (!containers.length) {
            return;
        }
        mermaidThemeKey = theme.key;
        mermaidSequence = mermaidSequence.catch(function () {
            return undefined;
        }).then(function () {
            window.mermaid.initialize(theme.options);
            return containers.reduce(function (sequence, container) {
                return sequence.then(function () {
                    return renderMermaidContainer(container, theme);
                });
            }, Promise.resolve());
        });
    }

    function renderMermaid(root, force) {
        if (!mermaidEnabled || !window.mermaid) {
            return;
        }
        var containers = collectNewMermaid(root);
        var theme = mermaidTheme();
        if (force) {
            containers = Array.prototype.slice.call(document.querySelectorAll(".mellow-enhance-mermaid")).filter(function (container) {
                return container.dataset.mellowMermaidTheme !== theme.key;
            });
        }
        queueMermaid(containers, theme);
    }

    function hasLatex(root) {
        return Boolean(root.querySelector("code.lang-math, code.language-math"))
            || /\$|\\\[|\\\(/.test(root.textContent || "");
    }

    function hasMermaid(root) {
        return Boolean(root.querySelector("code.lang-mermaid, code.language-mermaid"));
    }

    function refreshContent() {
        var roots = contentRoots();
        if (latexEnabled && roots.some(hasLatex)) {
            Promise.all([
                loadStylesheet("frontend", config.frontendStyleUrl),
                loadStylesheet("katex", config.katexStyleUrl),
                window.katex
                    ? Promise.resolve(window.katex)
                    : loadLibrary("katex", config.katexUrl, "katex")
            ]).then(function () {
                contentRoots().forEach(renderLatex);
            }).catch(function () {
                // 资源不可用时保留原始公式文本，不影响正文其他内容。
            });
        }

        if (mermaidEnabled && roots.some(hasMermaid)) {
            Promise.all([
                loadStylesheet("frontend", config.frontendStyleUrl),
                window.mermaid
                    ? Promise.resolve(window.mermaid)
                    : loadLibrary("mermaid", config.mermaidUrl, "mermaid")
            ]).then(function () {
                contentRoots().forEach(function (root) {
                    renderMermaid(root, false);
                });
            }).catch(function () {
                // 加载失败时保留原始 Mermaid 代码块，便于阅读和排查。
            });
        }
    }

    function refreshMermaidTheme() {
        if (!mermaidEnabled || !mermaidFollowMellowTheme || !window.mermaid) {
            return;
        }
        window.clearTimeout(themeRefreshTimer);
        themeRefreshTimer = window.setTimeout(function () {
            var theme = mermaidTheme();
            if (theme.key !== mermaidThemeKey) {
                renderMermaid(document, true);
            }
        }, 160);
    }

    refreshContent();
    document.addEventListener("mellow:navigation", refreshContent);
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            refreshContent();
        }
    });

    if (mermaidEnabled && mermaidFollowMellowTheme && "MutationObserver" in window) {
        new MutationObserver(refreshMermaidTheme).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class", "style"]
        });
    }
})();
