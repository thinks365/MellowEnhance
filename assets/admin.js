(function () {
    "use strict";

    var config = window.MellowEnhanceConfig || {};

    function dispatchFormChange(element) {
        var form = element && element.closest ? element.closest("form") : null;
        if (form) {
            form.dispatchEvent(new Event("change", {bubbles: true}));
        }
    }

    function initializeDownloads() {
        var panel = document.getElementById("mellow-downloads-panel");
        var template = document.getElementById("mellow-download-row-template");
        if (!panel || !template || panel.dataset.ready === "1") {
            return;
        }
        panel.dataset.ready = "1";

        var customField = document.getElementById("custom-field");
        if (customField && customField.parentNode) {
            customField.parentNode.insertBefore(panel, customField);
        }

        var managedFields = [
            "mellowDownloadEnabled", "mellowDownloadItems",
            "mellowDownloadSource", "mellowDownloadUrl",
            "mellowDownloadSource2", "mellowDownloadUrl2",
            "mellowDownloadSource3", "mellowDownloadUrl3",
            "mellowDownloadSource4", "mellowDownloadUrl4",
            "mellowDownloadSource5", "mellowDownloadUrl5",
            "mellowDownloadSource6", "mellowDownloadUrl6"
        ];
        document.querySelectorAll('#custom-field input[name="fieldNames[]"]').forEach(function (input) {
            if (managedFields.indexOf(input.value) !== -1) {
                var row = input.closest("li.field");
                if (row) {
                    row.remove();
                }
            }
        });

        var enabled = panel.querySelector("[data-download-enabled]");
        var body = panel.querySelector("[data-download-body]");
        var list = panel.querySelector("[data-download-list]");
        var dragged = null;

        function reindex() {
            list.querySelectorAll("[data-download-row]").forEach(function (row, index) {
                row.querySelectorAll('[name^="fields[mellowDownloadItems]"]').forEach(function (input) {
                    input.name = input.name.replace(
                        /fields\[mellowDownloadItems\]\[[^\]]+\]/,
                        "fields[mellowDownloadItems][" + index + "]"
                    );
                });
            });
        }

        function addRow() {
            var fragment = template.content.cloneNode(true);
            list.appendChild(fragment);
            reindex();
            var rows = list.querySelectorAll("[data-download-row]");
            var input = rows[rows.length - 1].querySelector("[data-download-url]");
            if (input) {
                input.focus();
            }
            dispatchFormChange(panel);
        }

        enabled.addEventListener("change", function () {
            body.hidden = !enabled.checked;
            dispatchFormChange(panel);
        });

        panel.querySelector("[data-add-download]").addEventListener("click", addRow);

        list.addEventListener("click", function (event) {
            var row = event.target.closest("[data-download-row]");
            if (!row) {
                return;
            }
            if (event.target.closest("[data-remove-download]")) {
                row.remove();
                if (!list.querySelector("[data-download-row]")) {
                    addRow();
                }
                reindex();
                dispatchFormChange(panel);
            } else if (event.target.closest("[data-move-up]") && row.previousElementSibling) {
                list.insertBefore(row, row.previousElementSibling);
                reindex();
                dispatchFormChange(panel);
            } else if (event.target.closest("[data-move-down]") && row.nextElementSibling) {
                list.insertBefore(row.nextElementSibling, row);
                reindex();
                dispatchFormChange(panel);
            }
        });

        list.addEventListener("pointerdown", function (event) {
            var row = event.target.closest("[data-download-row]");
            if (row) {
                row.draggable = !!event.target.closest("[data-drag-handle]");
            }
        });

        list.addEventListener("dragstart", function (event) {
            var row = event.target.closest("[data-download-row]");
            if (!row) {
                return;
            }
            dragged = row;
            row.classList.add("is-dragging");
            event.dataTransfer.effectAllowed = "move";
        });

        list.addEventListener("dragover", function (event) {
            var row = event.target.closest("[data-download-row]");
            if (!row || row === dragged) {
                return;
            }
            event.preventDefault();
            list.querySelectorAll(".is-drag-over").forEach(function (item) {
                item.classList.remove("is-drag-over");
            });
            row.classList.add("is-drag-over");
        });

        list.addEventListener("drop", function (event) {
            var row = event.target.closest("[data-download-row]");
            if (!row || !dragged || row === dragged) {
                return;
            }
            event.preventDefault();
            var rect = row.getBoundingClientRect();
            list.insertBefore(dragged, event.clientY > rect.top + rect.height / 2 ? row.nextElementSibling : row);
            reindex();
            dispatchFormChange(panel);
        });

        list.addEventListener("dragend", function () {
            list.querySelectorAll(".is-dragging, .is-drag-over").forEach(function (row) {
                row.classList.remove("is-dragging", "is-drag-over");
                row.draggable = false;
            });
            dragged = null;
        });

        reindex();
    }

    function getDarkMode() {
        var scheme = "auto";
        try {
            scheme = window.localStorage.getItem("mellow-color-scheme") || "auto";
        } catch (error) {
            scheme = "auto";
        }
        if (scheme === "dark") {
            return true;
        }
        if (scheme === "light") {
            return false;
        }
        return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }

    var codeLanguageAliases = {
        "c++": "cpp",
        "c#": "csharp",
        cs: "csharp",
        docker: "dockerfile",
        html: "html",
        js: "javascript",
        md: "markdown",
        ps1: "powershell",
        pwsh: "powershell",
        shell: "bash",
        sh: "bash",
        ts: "typescript",
        yml: "yaml",
        xml: "html"
    };

    var codeLanguageLabels = {
        bash: "Bash",
        c: "C",
        cpp: "C++",
        csharp: "C#",
        css: "CSS",
        diff: "Diff",
        dockerfile: "Dockerfile",
        go: "Go",
        html: "HTML",
        ini: "INI",
        java: "Java",
        javascript: "JavaScript",
        json: "JSON",
        markdown: "Markdown",
        nginx: "Nginx",
        php: "PHP",
        plaintext: "Plain Text",
        powershell: "PowerShell",
        python: "Python",
        rust: "Rust",
        scss: "SCSS",
        sql: "SQL",
        typescript: "TypeScript",
        vue: "Vue",
        yaml: "YAML"
    };

    function formatCodeLanguage(language) {
        var normalized = (language || "plaintext").trim().toLowerCase();
        normalized = codeLanguageAliases[normalized] || normalized;
        return codeLanguageLabels[normalized] || normalized
            .replace(/[-_]+/g, " ")
            .replace(/\b\w/g, function (character) {
                return character.toUpperCase();
            });
    }

    function getPreviewLanguage(preview) {
        var code = preview.querySelector("code");
        var language = "";
        if (code) {
            Array.prototype.some.call(code.classList, function (className) {
                var match = /^language-(.+)$/i.exec(className);
                if (!match) {
                    return false;
                }
                language = match[1];
                return true;
            });
        }
        return formatCodeLanguage(language);
    }

    function installFrontendPreviewEnhancements(shell) {
        if (!shell || shell.dataset.mellowPreviewReady === "1") {
            return;
        }
        shell.dataset.mellowPreviewReady = "1";
        var scheduled = false;
        var detailsSequence = 0;

        function getHtmlBlockSource(block) {
            if (!block || block.getAttribute("data-type") !== "html-block") {
                return "";
            }
            var source = block.firstElementChild;
            return source ? source.textContent || "" : block.textContent || "";
        }

        function applyDetailsState(start, details) {
            var groupId = start.dataset.mellowDetailsId;
            var isOpen = !!details.open;
            start.classList.toggle("is-open", isOpen);
            start.classList.toggle("is-closed", !isOpen);

            var current = start.nextElementSibling;
            while (current && current.dataset.mellowDetailsId === groupId) {
                current.hidden = !isOpen;
                current = current.nextElementSibling;
            }
        }

        function finalizeDetailsGroup(root, group, end) {
            var details = group.start.querySelector("details");
            var summary = details && details.querySelector("summary");
            if (!details || !summary) {
                return;
            }

            var groupId = "mellow-details-" + (++detailsSequence);
            group.start.dataset.mellowDetailsId = groupId;
            group.start.classList.add("mellow-details-group", "mellow-details-group--start");
            group.members.slice(0, -1).forEach(function (member) {
                member.dataset.mellowDetailsId = groupId;
                member.classList.add("mellow-details-group", "mellow-details-group--body");
            });
            end.dataset.mellowDetailsId = groupId;
            end.classList.add("mellow-details-group", "mellow-details-group--end");

            if (summary.dataset.mellowDetailsReady !== "1") {
                summary.dataset.mellowDetailsReady = "1";
                summary.addEventListener("click", function (event) {
                    event.stopPropagation();
                });
                details.addEventListener("toggle", function () {
                    applyDetailsState(group.start, details);
                });
            }
            applyDetailsState(group.start, details);
        }

        function decorateDetails(root) {
            var children = Array.prototype.slice.call(root.children);
            children.forEach(function (child) {
                if (!child.dataset.mellowDetailsId) {
                    return;
                }
                child.hidden = false;
                delete child.dataset.mellowDetailsId;
                child.classList.remove(
                    "mellow-details-group",
                    "mellow-details-group--start",
                    "mellow-details-group--body",
                    "mellow-details-group--end",
                    "is-open",
                    "is-closed"
                );
            });

            var stack = [];
            children.forEach(function (child) {
                var source = getHtmlBlockSource(child);
                var opens = /<details(?:\s|>)/i.test(source);
                var closes = /<\/details\s*>/i.test(source);

                stack.forEach(function (group) {
                    group.members.push(child);
                });

                if (opens && !closes) {
                    stack.push({start: child, members: []});
                    return;
                }
                if (closes && stack.length) {
                    finalizeDetailsGroup(root, stack.pop(), child);
                }
            });
        }

        function decorate() {
            scheduled = false;
            shell.querySelectorAll(
                '.vditor-wysiwyg__block[data-type="code-block"] > .vditor-wysiwyg__preview, ' +
                '.vditor-ir__node[data-type="code-block"] > .vditor-ir__preview'
            ).forEach(function (preview) {
                var language = getPreviewLanguage(preview);
                preview.dataset.mellowLanguage = language;
                if (preview.parentElement) {
                    preview.parentElement.dataset.mellowLanguage = language;
                }

                var copy = preview.querySelector(".vditor-copy");
                if (!copy) {
                    return;
                }
                copy.dataset.mellowLanguage = language;
                var trigger = copy.querySelector("span");
                if (!trigger || trigger.dataset.mellowCopyReady === "1") {
                    return;
                }

                trigger.dataset.mellowCopyReady = "1";
                trigger.classList.remove("vditor-tooltipped", "vditor-tooltipped__w");
                trigger.setAttribute("role", "button");
                trigger.setAttribute("tabindex", "0");
                trigger.textContent = trigger.getAttribute("aria-label") || "复制";
                trigger.addEventListener("click", function () {
                    window.setTimeout(function () {
                        trigger.textContent = trigger.getAttribute("aria-label") || "已复制";
                    }, 0);
                    window.setTimeout(function () {
                        trigger.setAttribute("aria-label", "复制");
                        trigger.textContent = "复制";
                    }, 1200);
                });
                trigger.addEventListener("keydown", function (event) {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        trigger.click();
                    }
                });
            });

            shell.querySelectorAll(
                ".vditor-wysiwyg > .vditor-reset, .vditor-ir > .vditor-reset"
            ).forEach(decorateDetails);
        }

        function scheduleDecorate() {
            if (scheduled) {
                return;
            }
            scheduled = true;
            window.requestAnimationFrame(decorate);
        }

        new MutationObserver(scheduleDecorate).observe(shell, {childList: true, subtree: true});
        scheduleDecorate();
    }

    function initializeEditorEnhance() {
        if (!config.editorEnabled) {
            return;
        }

        var textarea = document.getElementById("text");
        var form = textarea && textarea.closest("form");
        if (!textarea || !form) {
            return;
        }

        if (typeof window.Vditor !== "function") {
            var error = document.createElement("div");
            error.className = "mellow-enhance-editor-error";
            error.textContent = "Mellow 增强无法载入 Vditor，请检查插件 vendor/vditor 目录是否完整。";
            textarea.parentNode.insertBefore(error, textarea);
            return;
        }

        var installed = false;

        function installTabs() {
            if (installed) {
                return true;
            }

            var tabs = document.querySelector("#wmd-button-bar .wmd-edittab");
            var editArea = document.getElementById("wmd-editarea");
            var preview = document.getElementById("wmd-preview");
            var buttonRow = document.getElementById("wmd-button-row");
            if (!tabs || !editArea || !preview) {
                return false;
            }
            installed = true;

            var instances = {};
            var shells = {};
            var modeTabs = {};
            var activeMode = null;
            var syncing = false;
            var isDark = getDarkMode();
            var firstNativeTab = tabs.querySelector("a");
            var fragment = document.createDocumentFragment();

            ["wysiwyg", "ir"].forEach(function (mode) {
                var modeConfig = config.modes && config.modes[mode];
                if (!modeConfig || !modeConfig.enabled) {
                    return;
                }

                var tab = document.createElement("a");
                tab.href = "#mellow-enhance-editor-" + mode;
                tab.className = "mellow-enhance-mode-tab";
                tab.dataset.mellowMode = mode;
                tab.textContent = modeConfig.label;
                fragment.appendChild(tab);
                modeTabs[mode] = tab;

                var shell = document.createElement("div");
                shell.id = "mellow-enhance-editor-" + mode;
                shell.className = "mellow-enhance-editor-shell";
                shell.hidden = true;
                shell.style.setProperty("--mellow-editor-primary", config.primaryColor || "#0aa879");
                if (modeConfig.frontStyle) {
                    shell.classList.add("mellow-enhance-editor--front");
                }
                if (isDark) {
                    shell.classList.add("is-dark");
                }
                var mount = document.createElement("div");
                mount.className = "mellow-enhance-editor-mount";
                shell.appendChild(mount);
                editArea.parentNode.insertBefore(shell, editArea.nextSibling);
                shells[mode] = shell;
            });

            tabs.insertBefore(fragment, firstNativeTab);

            function emitTextareaInput(value) {
                if (textarea.value === value) {
                    return;
                }
                textarea.value = value;
                textarea.dispatchEvent(new Event("input", {bubbles: true}));
            }

            function syncActiveEditor() {
                if (!activeMode || !instances[activeMode]) {
                    return;
                }
                syncing = true;
                emitTextareaInput(instances[activeMode].getValue());
                syncing = false;
            }

            function toolbar() {
                return [
                    "headings", "bold", "italic", "strike", "|",
                    "line", "quote", "list", "ordered-list", "check", "|",
                    "code", "inline-code", "link", "table", "|",
                    "undo", "redo", "|", "fullscreen", "outline"
                ];
            }

            function createEditor(mode) {
                var shell = shells[mode];
                var modeConfig = config.modes[mode];
                shell.classList.add("is-initializing");
                var instance = new window.Vditor(shell.querySelector(".mellow-enhance-editor-mount"), {
                    value: textarea.value,
                    mode: mode,
                    lang: "zh_CN",
                    cdn: config.assetBase,
                    height: Math.max(textarea.offsetHeight || 0, 480),
                    minHeight: 360,
                    cache: {enable: false},
                    resize: {enable: true},
                    counter: {enable: true, type: "markdown"},
                    fullscreen: {index: 1000},
                    toolbar: toolbar(),
                    theme: isDark ? "dark" : "classic",
                    preview: {
                        delay: 180,
                        mode: "editor",
                        maxWidth: 920,
                        theme: {
                            current: isDark ? "dark" : "light",
                            path: config.assetBase + "/dist/css/content-theme"
                        },
                        hljs: {
                            enable: true,
                            lineNumber: false,
                            style: isDark ? "vs2015" : "github"
                        },
                        markdown: {
                            toc: true,
                            mark: true,
                            footnotes: true,
                            autoSpace: false
                        }
                    },
                    input: function (value) {
                        if (!syncing && activeMode === mode) {
                            emitTextareaInput(value);
                        }
                    },
                    after: function () {
                        shell.classList.remove("is-initializing");
                        if (modeConfig.frontStyle) {
                            installFrontendPreviewEnhancements(shell);
                        }
                        if (activeMode === mode) {
                            instance.focus();
                        }
                    }
                });
                instances[mode] = instance;

                if (modeConfig.frontStyle) {
                    shell.classList.add("mellow-enhance-editor--front");
                }
                return instance;
            }

            function activateMode(mode) {
                if (!shells[mode]) {
                    return;
                }
                syncActiveEditor();
                activeMode = mode;

                tabs.querySelectorAll("a").forEach(function (tab) {
                    tab.classList.toggle("active", tab === modeTabs[mode]);
                });
                editArea.classList.add("wmd-hidetab");
                preview.classList.add("wmd-hidetab");
                if (buttonRow) {
                    buttonRow.classList.add("wmd-visualhide");
                }
                Object.keys(shells).forEach(function (key) {
                    shells[key].hidden = key !== mode;
                });

                var instance = instances[mode];
                if (!instance) {
                    instance = createEditor(mode);
                } else if (instance.getValue() !== textarea.value) {
                    syncing = true;
                    instance.setValue(textarea.value, true);
                    syncing = false;
                }
                window.setTimeout(function () {
                    instance.focus();
                }, 0);
            }

            Object.keys(modeTabs).forEach(function (mode) {
                modeTabs[mode].addEventListener("click", function (event) {
                    event.preventDefault();
                    activateMode(mode);
                });
            });

            tabs.querySelectorAll("a:not(.mellow-enhance-mode-tab)").forEach(function (tab) {
                tab.addEventListener("click", function () {
                    syncActiveEditor();
                    activeMode = null;
                    Object.keys(shells).forEach(function (key) {
                        shells[key].hidden = true;
                    });
                }, true);
            });

            form.addEventListener("submit", syncActiveEditor, true);

            if (window.Typecho && typeof window.Typecho.insertFileToEditor === "function") {
                var originalInsertFile = window.Typecho.insertFileToEditor;
                window.Typecho.insertFileToEditor = function (file, url, isImage) {
                    if (activeMode && instances[activeMode]) {
                        var markdown = isImage ? "![" + file + "](" + url + ")" : "[" + file + "](" + url + ")";
                        instances[activeMode].insertMD(markdown);
                        return;
                    }
                    return originalInsertFile.apply(this, arguments);
                };
            }

            if (config.autoOpenInstantRender && modeTabs.ir) {
                activateMode("ir");
            }

            return true;
        }

        if (installTabs()) {
            return;
        }

        var observer = new MutationObserver(function () {
            if (installTabs()) {
                observer.disconnect();
            }
        });
        observer.observe(form, {childList: true, subtree: true});
    }

    function initialize() {
        initializeDownloads();
        initializeEditorEnhance();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
}());
