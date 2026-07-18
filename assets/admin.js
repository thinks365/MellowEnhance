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

    var admonitionLabels = {
        note: "\u6ce8\u610f",
        tip: "\u63d0\u793a",
        important: "\u91cd\u8981",
        warning: "\u8b66\u544a",
        caution: "\u5371\u9669"
    };
    var admonitionTypeSource = "(note|tip|important|warning|caution)";
    var videoPlatformLabels = {
        bilibili: "Bilibili",
        youtube: "YouTube"
    };

    function extractVideoSource(input) {
        var value = String(input || "").trim();
        if (/<iframe\b/i.test(value) && typeof window.DOMParser === "function") {
            var documentNode = new window.DOMParser().parseFromString(value, "text/html");
            var iframe = documentNode.querySelector("iframe[src]");
            if (iframe) {
                value = iframe.getAttribute("src") || "";
            }
        }
        if (value.indexOf("//") === 0) {
            value = "https:" + value;
        }
        return value.trim();
    }

    function parseVideoStartSeconds(value) {
        var normalized = String(value || "").trim().toLowerCase();
        if (/^\d+$/.test(normalized)) {
            return Math.max(0, parseInt(normalized, 10));
        }
        var match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(normalized);
        if (!match) {
            return 0;
        }
        return (parseInt(match[1] || "0", 10) * 3600)
            + (parseInt(match[2] || "0", 10) * 60)
            + parseInt(match[3] || "0", 10);
    }

    function normalizeVideoEmbed(platform, input) {
        var source = extractVideoSource(input);
        var url;
        try {
            url = new URL(source);
        } catch (error) {
            return null;
        }
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return null;
        }

        var host = url.hostname.toLowerCase();
        var isBilibiliHost = host === "bilibili.com" || host.endsWith(".bilibili.com");
        var isYoutubeHost = [
            "youtube.com", "www.youtube.com", "m.youtube.com",
            "youtube-nocookie.com", "www.youtube-nocookie.com",
            "youtu.be", "www.youtu.be"
        ].indexOf(host) !== -1;

        if (platform === "bilibili" && isBilibiliHost) {
            var bvid = url.searchParams.get("bvid") || "";
            var pathBvid = /\/video\/(BV[0-9A-Za-z]{10})(?:\/|$)/i.exec(url.pathname);
            if (!/^BV[0-9A-Za-z]{10}$/i.test(bvid) && pathBvid) {
                bvid = pathBvid[1];
            }
            if (/^BV[0-9A-Za-z]{10}$/i.test(bvid)) {
                bvid = "BV" + bvid.slice(2);
            } else {
                bvid = "";
            }
            var aid = /^\d+$/.test(url.searchParams.get("aid") || "") ? url.searchParams.get("aid") : "";
            var cid = /^\d+$/.test(url.searchParams.get("cid") || "") ? url.searchParams.get("cid") : "";
            if (!bvid && !aid) {
                return null;
            }
            var page = /^\d+$/.test(url.searchParams.get("p") || "")
                ? Math.max(1, Math.min(9999, parseInt(url.searchParams.get("p"), 10)))
                : 1;
            var bilibiliParams = new URLSearchParams();
            bilibiliParams.set("isOutside", "true");
            bilibiliParams.set("autoplay", "0");
            if (aid) {
                bilibiliParams.set("aid", aid);
            }
            if (bvid) {
                bilibiliParams.set("bvid", bvid);
            }
            if (cid) {
                bilibiliParams.set("cid", cid);
            }
            bilibiliParams.set("p", String(page));
            return {
                platform: "bilibili",
                embedUrl: "https://player.bilibili.com/player.html?" + bilibiliParams.toString(),
                originalUrl: bvid
                    ? "https://www.bilibili.com/video/" + encodeURIComponent(bvid) + "?p=" + page
                    : source
            };
        }

        if (platform === "youtube" && isYoutubeHost) {
            var videoId = "";
            if (host === "youtu.be" || host === "www.youtu.be") {
                videoId = url.pathname.split("/").filter(Boolean)[0] || "";
            } else if (url.searchParams.get("v")) {
                videoId = url.searchParams.get("v");
            } else {
                var pathVideo = /\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/.exec(url.pathname);
                videoId = pathVideo ? pathVideo[1] : "";
            }
            if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
                return null;
            }
            var youtubeParams = new URLSearchParams();
            var start = parseVideoStartSeconds(url.searchParams.get("start"));
            if (!start) {
                start = parseVideoStartSeconds(url.searchParams.get("t"));
            }
            if (start > 0) {
                youtubeParams.set("start", String(start));
            }
            var list = url.searchParams.get("list") || "";
            if (/^[A-Za-z0-9_-]{1,100}$/.test(list)) {
                youtubeParams.set("list", list);
            }
            var listIndex = url.searchParams.get("index") || "";
            if (/^\d+$/.test(listIndex)) {
                youtubeParams.set("index", String(Math.max(1, Math.min(9999, parseInt(listIndex, 10)))));
            }
            var suffix = youtubeParams.toString();
            return {
                platform: "youtube",
                embedUrl: "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + (suffix ? "?" + suffix : ""),
                originalUrl: "https://www.youtube.com/watch?v=" + encodeURIComponent(videoId)
            };
        }

        return null;
    }

    function getFenceStart(line) {
        var match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
        return match ? {character: match[1].charAt(0), length: match[1].length} : null;
    }

    function isFenceEnd(line, fence) {
        if (!fence) {
            return false;
        }
        var marker = fence.character === "`" ? "`" : "~";
        return new RegExp("^ {0,3}" + marker + "{" + fence.length + ",}[ \\t]*$").test(line);
    }

    /* Vditor does not parse Mellow's ::: containers. Inside Vditor only, turn
     * them into marked blockquotes so Markdown in the body is rendered. The
     * private marker records the original syntax and is removed before the
     * value is synchronized back to Typecho's native #text field. */
    function toEditorMarkdown(markdown) {
        var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
        var output = [];
        var fence = null;

        for (var index = 0; index < lines.length; index += 1) {
            var line = lines[index];
            if (fence) {
                output.push(line);
                if (isFenceEnd(line, fence)) {
                    fence = null;
                }
                continue;
            }

            var fenceStart = getFenceStart(line);
            if (fenceStart) {
                fence = fenceStart;
                output.push(line);
                continue;
            }

            var videoPattern = /^( {0,3}):::\s*video[ \t]+(bilibili|youtube)(?:[ \t]+(.*?))?[ \t]*$/i;
            var video = videoPattern.exec(line);
            if (video) {
                var videoClosingIndex = -1;
                for (var videoCursor = index + 1; videoCursor < lines.length; videoCursor += 1) {
                    if (/^ {0,3}:::\s*$/.test(lines[videoCursor])) {
                        videoClosingIndex = videoCursor;
                        break;
                    }
                }
                if (videoClosingIndex !== -1) {
                    var videoIndent = video[1] || "";
                    var videoTitle = video[3] ? " " + video[3] : "";
                    output.push(videoIndent + "> [!MELLOW-VIDEO-" + video[2].toUpperCase() + "]" + videoTitle);
                    output.push(videoIndent + ">");
                    lines.slice(index + 1, videoClosingIndex).forEach(function (videoLine) {
                        output.push(videoIndent + ">" + (videoLine ? " " + videoLine : ""));
                    });
                    index = videoClosingIndex;
                    continue;
                }
            }

            var colonPattern = new RegExp("^( {0,3}):::\\s*" + admonitionTypeSource + "(?:[ \\t]+(.*?))?[ \\t]*$", "i");
            var colon = colonPattern.exec(line);
            if (colon) {
                var bodyFence = null;
                var closingIndex = -1;
                for (var cursor = index + 1; cursor < lines.length; cursor += 1) {
                    var bodyLine = lines[cursor];
                    if (bodyFence) {
                        if (isFenceEnd(bodyLine, bodyFence)) {
                            bodyFence = null;
                        }
                        continue;
                    }
                    var bodyFenceStart = getFenceStart(bodyLine);
                    if (bodyFenceStart) {
                        bodyFence = bodyFenceStart;
                        continue;
                    }
                    if (/^ {0,3}:::\s*$/.test(bodyLine)) {
                        closingIndex = cursor;
                        break;
                    }
                }

                if (closingIndex !== -1) {
                    var indent = colon[1] || "";
                    var colonTitle = colon[3] ? " " + colon[3] : "";
                    output.push(indent + "> [!MELLOW-COLON-" + colon[2].toUpperCase() + "]" + colonTitle);
                    output.push(indent + ">");
                    lines.slice(index + 1, closingIndex).forEach(function (bodyLine) {
                        output.push(indent + ">" + (bodyLine ? " " + bodyLine : ""));
                    });
                    index = closingIndex;
                    continue;
                }
            }

            var githubPattern = new RegExp("^( {0,3}>\\s*)\\[!" + admonitionTypeSource + "\\](?:[ \\t]+(.*?))?[ \\t]*$", "i");
            var github = githubPattern.exec(line);
            if (github) {
                var githubTitle = github[3] ? " " + github[3] : "";
                output.push(github[1] + "[!MELLOW-GITHUB-" + github[2].toUpperCase() + "]" + githubTitle);
                output.push((/^ {0,3}/.exec(github[1]) || [""])[0] + ">");
                continue;
            }

            output.push(line);
        }

        return output.join("\n");
    }

    function fromEditorMarkdown(markdown) {
        var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
        var output = [];
        var fence = null;
        var temporaryPattern = new RegExp(
            "^( {0,3}>\\s*)\\[!MELLOW-(COLON|GITHUB)-" + admonitionTypeSource + "\\](?:[ \\t]+(.*?))?[ \\t]*$",
            "i"
        );
        var temporaryVideoPattern = /^( {0,3}>\s*)\[!MELLOW-VIDEO-(BILIBILI|YOUTUBE)\](?:[ \t]+(.*?))?[ \t]*$/i;

        for (var index = 0; index < lines.length; index += 1) {
            var line = lines[index];
            if (fence) {
                output.push(line);
                if (isFenceEnd(line, fence)) {
                    fence = null;
                }
                continue;
            }

            var fenceStart = getFenceStart(line);
            if (fenceStart) {
                fence = fenceStart;
                output.push(line);
                continue;
            }

            var temporaryVideo = temporaryVideoPattern.exec(line);
            if (temporaryVideo) {
                var videoSeparatorIndex = index + 1;
                var videoHasSeparator = videoSeparatorIndex < lines.length
                    && /^ {0,3}>\s*$/.test(lines[videoSeparatorIndex]);
                var videoBody = [];
                var videoBodyCursor = videoHasSeparator ? videoSeparatorIndex + 1 : index + 1;
                while (videoBodyCursor < lines.length) {
                    var videoQuoted = /^ {0,3}>\s?(.*)$/.exec(lines[videoBodyCursor]);
                    if (!videoQuoted) {
                        break;
                    }
                    videoBody.push(videoQuoted[1]);
                    videoBodyCursor += 1;
                }
                output.push(":::video " + temporaryVideo[2].toLowerCase()
                    + (temporaryVideo[3] ? " " + temporaryVideo[3] : ""));
                Array.prototype.push.apply(output, videoBody);
                output.push(":::");
                index = videoBodyCursor - 1;
                continue;
            }

            var temporary = temporaryPattern.exec(line);
            if (!temporary) {
                output.push(line);
                continue;
            }

            var syntax = temporary[2].toLowerCase();
            var type = temporary[3].toLowerCase();
            var title = temporary[4] ? " " + temporary[4] : "";
            var separatorIndex = index + 1;
            var hasSeparator = separatorIndex < lines.length && /^ {0,3}>\s*$/.test(lines[separatorIndex]);

            if (syntax === "github") {
                output.push(temporary[1] + "[!" + type + "]" + title);
                if (hasSeparator) {
                    index = separatorIndex;
                }
                continue;
            }

            var body = [];
            var cursor = hasSeparator ? separatorIndex + 1 : index + 1;
            while (cursor < lines.length) {
                var quoted = /^ {0,3}>\s?(.*)$/.exec(lines[cursor]);
                if (!quoted) {
                    break;
                }
                body.push(quoted[1]);
                cursor += 1;
            }

            output.push(":::" + type + title);
            Array.prototype.push.apply(output, body);
            output.push(":::");
            index = cursor - 1;
        }

        return output.join("\n");
    }

    function buildAdmonitionMarkdown(type, body) {
        var content = body && body.trim() ? body : "\u63d0\u793a\u5185\u5bb9";
        return ":::" + type + "\n" + content + "\n:::";
    }

    function buildVideoMarkdown(video, title) {
        var normalizedTitle = String(title || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
        return ":::video " + video.platform + (normalizedTitle ? " " + normalizedTitle : "")
            + "\n" + video.embedUrl + "\n:::";
    }

    function findVideoMarkdownBlocks(markdown) {
        var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
        var offsets = [];
        var offset = 0;
        var results = [];
        var fence = null;
        lines.forEach(function (line) {
            offsets.push(offset);
            offset += line.length + 1;
        });

        for (var index = 0; index < lines.length; index += 1) {
            var line = lines[index];
            if (fence) {
                if (isFenceEnd(line, fence)) {
                    fence = null;
                }
                continue;
            }
            var fenceStart = getFenceStart(line);
            if (fenceStart) {
                fence = fenceStart;
                continue;
            }

            var start = /^ {0,3}:::\s*video[ \t]+(bilibili|youtube)(?:[ \t]+(.*?))?[ \t]*$/i.exec(line);
            if (!start) {
                continue;
            }
            var closingIndex = -1;
            for (var cursor = index + 1; cursor < lines.length; cursor += 1) {
                if (/^ {0,3}:::\s*$/.test(lines[cursor])) {
                    closingIndex = cursor;
                    break;
                }
            }
            if (closingIndex === -1) {
                continue;
            }
            var source = lines.slice(index + 1, closingIndex).join("\n").trim();
            if (normalizeVideoEmbed(start[1].toLowerCase(), source)) {
                results.push({
                    start: offsets[index],
                    end: offsets[closingIndex] + lines[closingIndex].length,
                    platform: start[1].toLowerCase(),
                    title: start[2] || "",
                    source: source
                });
            }
            index = closingIndex;
        }

        return results;
    }

    function createAdmonitionMenu(trigger, onChoose, onOpen) {
        var menu = document.createElement("div");
        menu.className = "mellow-admonition-insert-menu";
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", "\u9009\u62e9\u63d0\u793a\u5757\u7c7b\u578b");
        menu.hidden = true;
        if (trigger.closest(".is-dark")) {
            menu.classList.add("is-dark");
        }

        Object.keys(admonitionLabels).forEach(function (type) {
            var option = document.createElement("button");
            option.type = "button";
            option.className = "mellow-admonition-insert-menu__option mellow-admonition-insert-menu__option--" + type;
            option.dataset.admonitionType = type;
            option.setAttribute("role", "menuitem");

            var dot = document.createElement("span");
            dot.className = "mellow-admonition-insert-menu__dot";
            dot.setAttribute("aria-hidden", "true");
            var label = document.createElement("span");
            label.textContent = admonitionLabels[type];
            var syntax = document.createElement("code");
            syntax.textContent = type.toUpperCase();
            option.appendChild(dot);
            option.appendChild(label);
            option.appendChild(syntax);

            option.addEventListener("mousedown", function (event) {
                event.preventDefault();
            });
            option.addEventListener("click", function () {
                closeMenu();
                onChoose(type);
            });
            menu.appendChild(option);
        });

        document.body.appendChild(menu);
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", "false");

        function positionMenu() {
            var rect = trigger.getBoundingClientRect();
            menu.style.visibility = "hidden";
            menu.hidden = false;
            var menuWidth = menu.offsetWidth;
            var menuHeight = menu.offsetHeight;
            var left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
            var top = rect.bottom + 6;
            if (top + menuHeight > window.innerHeight - 8) {
                top = Math.max(8, rect.top - menuHeight - 6);
            }
            menu.style.left = Math.max(8, left) + "px";
            menu.style.top = top + "px";
            menu.style.visibility = "";
        }

        function openMenu(focusFirst) {
            if (!menu.hidden) {
                return;
            }
            if (typeof onOpen === "function") {
                onOpen();
            }
            positionMenu();
            trigger.setAttribute("aria-expanded", "true");
            if (focusFirst) {
                var first = menu.querySelector("button");
                if (first) {
                    first.focus();
                }
            }
        }

        function closeMenu() {
            if (menu.hidden) {
                return;
            }
            menu.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        }

        trigger.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });
        trigger.addEventListener("click", function (event) {
            event.preventDefault();
            if (menu.hidden) {
                openMenu(false);
            } else {
                closeMenu();
            }
        });
        trigger.addEventListener("keydown", function (event) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                if (menu.hidden) {
                    openMenu(true);
                } else {
                    var first = menu.querySelector("button");
                    if (first) {
                        first.focus();
                    }
                }
            } else if (event.key === "Escape") {
                closeMenu();
            }
        });
        menu.addEventListener("keydown", function (event) {
            var options = Array.prototype.slice.call(menu.querySelectorAll("button"));
            var current = options.indexOf(document.activeElement);
            if (event.key === "Escape") {
                event.preventDefault();
                closeMenu();
                trigger.focus();
            } else if (event.key === "ArrowDown" && options.length) {
                event.preventDefault();
                options[(current + 1) % options.length].focus();
            } else if (event.key === "ArrowUp" && options.length) {
                event.preventDefault();
                options[(current - 1 + options.length) % options.length].focus();
            }
        });
        document.addEventListener("mousedown", function (event) {
            if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) {
                closeMenu();
            }
        });
        window.addEventListener("resize", closeMenu);
        window.addEventListener("scroll", closeMenu, true);

        return {open: openMenu, close: closeMenu, element: menu};
    }

    function createVideoMenu(trigger, onChoose, onOpen) {
        var menu = document.createElement("div");
        menu.className = "mellow-video-insert-menu";
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", "\u9009\u62e9\u89c6\u9891\u5e73\u53f0");
        menu.hidden = true;
        if (trigger.closest(".is-dark")) {
            menu.classList.add("is-dark");
        }

        Object.keys(videoPlatformLabels).forEach(function (platform) {
            var option = document.createElement("button");
            option.type = "button";
            option.className = "mellow-video-insert-menu__option mellow-video-insert-menu__option--" + platform;
            option.dataset.videoPlatform = platform;
            option.setAttribute("role", "menuitem");

            var badge = document.createElement("span");
            badge.className = "mellow-video-insert-menu__badge";
            badge.setAttribute("aria-hidden", "true");
            badge.textContent = platform === "bilibili" ? "B" : "\u25b6";
            var copy = document.createElement("span");
            var label = document.createElement("strong");
            label.textContent = videoPlatformLabels[platform];
            var hint = document.createElement("small");
            hint.textContent = "\u94fe\u63a5\u6216\u5b98\u65b9 iframe";
            copy.appendChild(label);
            copy.appendChild(hint);
            option.appendChild(badge);
            option.appendChild(copy);

            option.addEventListener("mousedown", function (event) {
                event.preventDefault();
            });
            option.addEventListener("click", function () {
                closeMenu();
                onChoose(platform);
            });
            menu.appendChild(option);
        });

        document.body.appendChild(menu);
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", "false");

        function positionMenu() {
            var rect = trigger.getBoundingClientRect();
            menu.style.visibility = "hidden";
            menu.hidden = false;
            var menuWidth = menu.offsetWidth;
            var menuHeight = menu.offsetHeight;
            var left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
            var top = rect.bottom + 6;
            if (top + menuHeight > window.innerHeight - 8) {
                top = Math.max(8, rect.top - menuHeight - 6);
            }
            menu.style.left = Math.max(8, left) + "px";
            menu.style.top = top + "px";
            menu.style.visibility = "";
        }

        function openMenu(focusFirst) {
            if (!menu.hidden) {
                return;
            }
            if (typeof onOpen === "function") {
                onOpen();
            }
            positionMenu();
            trigger.setAttribute("aria-expanded", "true");
            if (focusFirst) {
                var first = menu.querySelector("button");
                if (first) {
                    first.focus();
                }
            }
        }

        function closeMenu() {
            if (menu.hidden) {
                return;
            }
            menu.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        }

        trigger.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });
        trigger.addEventListener("click", function (event) {
            event.preventDefault();
            if (menu.hidden) {
                openMenu(false);
            } else {
                closeMenu();
            }
        });
        trigger.addEventListener("keydown", function (event) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                openMenu(true);
            } else if (event.key === "Escape") {
                closeMenu();
            }
        });
        menu.addEventListener("keydown", function (event) {
            var options = Array.prototype.slice.call(menu.querySelectorAll("button"));
            var current = options.indexOf(document.activeElement);
            if (event.key === "Escape") {
                event.preventDefault();
                closeMenu();
                trigger.focus();
            } else if (event.key === "ArrowDown" && options.length) {
                event.preventDefault();
                options[(current + 1) % options.length].focus();
            } else if (event.key === "ArrowUp" && options.length) {
                event.preventDefault();
                options[(current - 1 + options.length) % options.length].focus();
            }
        });
        document.addEventListener("mousedown", function (event) {
            if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) {
                closeMenu();
            }
        });
        window.addEventListener("resize", closeMenu);
        window.addEventListener("scroll", closeMenu, true);

        return {open: openMenu, close: closeMenu, element: menu};
    }

    function openVideoDialog(platform, initialValue, onInsert, initialTitle) {
        var backdrop = document.createElement("div");
        backdrop.className = "mellow-video-dialog-backdrop" + (getDarkMode() ? " is-dark" : "");
        var form = document.createElement("form");
        form.className = "mellow-video-dialog";
        form.setAttribute("role", "dialog");
        form.setAttribute("aria-modal", "true");
        form.setAttribute("aria-labelledby", "mellow-video-dialog-title");

        var header = document.createElement("div");
        header.className = "mellow-video-dialog__header";
        var heading = document.createElement("h3");
        heading.id = "mellow-video-dialog-title";
        heading.textContent = "\u63d2\u5165 " + videoPlatformLabels[platform] + " \u89c6\u9891";
        var platformBadge = document.createElement("span");
        platformBadge.className = "mellow-video-dialog__platform mellow-video-dialog__platform--" + platform;
        platformBadge.textContent = videoPlatformLabels[platform];
        header.appendChild(heading);
        header.appendChild(platformBadge);

        var sourceLabel = document.createElement("label");
        sourceLabel.className = "mellow-video-dialog__field";
        var sourceCaption = document.createElement("span");
        sourceCaption.textContent = "\u89c6\u9891\u94fe\u63a5\u6216\u5b98\u65b9 iframe \u4ee3\u7801";
        var source = document.createElement("textarea");
        source.rows = 5;
        source.required = true;
        source.placeholder = platform === "bilibili"
            ? "https://www.bilibili.com/video/BV... \u6216 <iframe ...></iframe>"
            : "https://www.youtube.com/watch?v=... \u6216 <iframe ...></iframe>";
        source.value = String(initialValue || "").trim();
        sourceLabel.appendChild(sourceCaption);
        sourceLabel.appendChild(source);

        var titleLabel = document.createElement("label");
        titleLabel.className = "mellow-video-dialog__field";
        var titleCaption = document.createElement("span");
        titleCaption.textContent = "\u5361\u7247\u6807\u9898\uff08\u53ef\u9009\uff09";
        var title = document.createElement("input");
        title.type = "text";
        title.maxLength = 160;
        title.placeholder = "\u4f8b\u5982\uff1aMellow \u4e3b\u9898\u4ecb\u7ecd";
        title.value = String(initialTitle || "");
        titleLabel.appendChild(titleCaption);
        titleLabel.appendChild(title);

        var error = document.createElement("p");
        error.className = "mellow-video-dialog__error";
        error.hidden = true;

        var actions = document.createElement("div");
        actions.className = "mellow-video-dialog__actions";
        var cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "btn";
        cancel.textContent = "\u53d6\u6d88";
        var submit = document.createElement("button");
        submit.type = "submit";
        submit.className = "btn primary";
        submit.textContent = "\u63d2\u5165\u89c6\u9891\u5361\u7247";
        actions.appendChild(cancel);
        actions.appendChild(submit);

        form.appendChild(header);
        form.appendChild(sourceLabel);
        form.appendChild(titleLabel);
        form.appendChild(error);
        form.appendChild(actions);
        backdrop.appendChild(form);
        document.body.appendChild(backdrop);

        function close() {
            document.removeEventListener("keydown", onKeydown, true);
            backdrop.remove();
        }

        function onKeydown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                close();
            }
        }

        cancel.addEventListener("click", close);
        backdrop.addEventListener("mousedown", function (event) {
            if (event.target === backdrop) {
                close();
            }
        });
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            var video = normalizeVideoEmbed(platform, source.value);
            if (!video) {
                error.hidden = false;
                error.textContent = platform === "bilibili"
                    ? "\u65e0\u6cd5\u8bc6\u522b\u8be5 Bilibili \u5730\u5740\uff0c\u8bf7\u7c98\u8d34\u6807\u51c6 BV \u94fe\u63a5\u6216\u5b98\u65b9 iframe\u3002"
                    : "\u65e0\u6cd5\u8bc6\u522b\u8be5 YouTube \u5730\u5740\uff0c\u8bf7\u7c98\u8d34\u89c6\u9891\u94fe\u63a5\u6216\u5b98\u65b9 iframe\u3002";
                source.focus();
                return;
            }
            onInsert(video, title.value);
            close();
        });
        source.addEventListener("input", function () {
            error.hidden = true;
        });
        document.addEventListener("keydown", onKeydown, true);
        window.setTimeout(function () {
            source.focus();
            source.setSelectionRange(source.value.length, source.value.length);
        }, 0);
    }

    function insertTextareaAdmonition(textarea, type, selection) {
        var start = selection ? selection.start : textarea.selectionStart || 0;
        var end = selection ? selection.end : textarea.selectionEnd || start;
        var selected = textarea.value.slice(start, end);
        var body = selected || "\u63d0\u793a\u5185\u5bb9";
        var block = buildAdmonitionMarkdown(type, body);
        var before = textarea.value.slice(0, start);
        var after = textarea.value.slice(end);
        var prefix = !before || /\n\n$/.test(before) ? "" : (/\n$/.test(before) ? "\n" : "\n\n");
        var suffix = !after || /^\n\n/.test(after) ? "" : (/^\n/.test(after) ? "\n" : "\n\n");
        var insertion = prefix + block + suffix;
        var bodyStart = start + prefix.length + type.length + 4;

        textarea.focus();
        textarea.setRangeText(insertion, start, end, "end");
        textarea.setSelectionRange(bodyStart, bodyStart + body.length);
        textarea.dispatchEvent(new Event("input", {bubbles: true}));
    }

    function insertTextareaVideo(textarea, video, title, selection) {
        var start = selection ? selection.start : textarea.selectionStart || 0;
        var end = selection ? selection.end : textarea.selectionEnd || start;
        var block = buildVideoMarkdown(video, title);
        var before = textarea.value.slice(0, start);
        var after = textarea.value.slice(end);
        var prefix = !before || /\n\n$/.test(before) ? "" : (/\n$/.test(before) ? "\n" : "\n\n");
        var suffix = !after || /^\n\n/.test(after) ? "" : (/^\n/.test(after) ? "\n" : "\n\n");

        textarea.focus();
        textarea.setRangeText(prefix + block + suffix, start, end, "end");
        textarea.dispatchEvent(new Event("input", {bubbles: true}));
    }

    function installNativeAdmonitionToolbar(buttonRow, textarea) {
        if (!buttonRow || !textarea || buttonRow.querySelector("#mellow-admonition-native-button")) {
            return;
        }

        var item = document.createElement("li");
        item.className = "wmd-button mellow-admonition-toolbar-button mellow-admonition-toolbar-button--native";
        item.id = "mellow-admonition-native-button";
        var trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "mellow-admonition-toolbar-trigger";
        trigger.title = "\u63d2\u5165\u63d0\u793a\u5757";
        trigger.setAttribute("aria-label", "\u63d2\u5165\u63d0\u793a\u5757");
        trigger.textContent = "!";
        item.appendChild(trigger);

        var selection = null;
        createAdmonitionMenu(trigger, function (type) {
            insertTextareaAdmonition(textarea, type, selection);
            selection = null;
        }, function () {
            selection = {
                start: textarea.selectionStart || 0,
                end: textarea.selectionEnd || textarea.selectionStart || 0
            };
        });

        var quoteButton = buttonRow.querySelector("#wmd-quote-button");
        if (quoteButton && quoteButton.nextSibling) {
            buttonRow.insertBefore(item, quoteButton.nextSibling);
        } else {
            buttonRow.appendChild(item);
        }
    }

    function initializeNativeAdmonitionToolbar() {
        if (!config.markdownEnabled || config.contentIsMarkdown === false) {
            return;
        }
        var textarea = document.getElementById("text");
        if (!textarea) {
            return;
        }

        function install() {
            var buttonRow = document.getElementById("wmd-button-row");
            if (!buttonRow) {
                return false;
            }
            installNativeAdmonitionToolbar(buttonRow, textarea);
            return true;
        }

        if (install()) {
            return;
        }
        var observer = new MutationObserver(function () {
            if (install()) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, {childList: true, subtree: true});
    }

    function installNativeVideoToolbar(buttonRow, textarea) {
        if (!buttonRow || !textarea || buttonRow.querySelector("#mellow-video-native-button")) {
            return;
        }

        var item = document.createElement("li");
        item.className = "wmd-button mellow-video-toolbar-button mellow-video-toolbar-button--native";
        item.id = "mellow-video-native-button";
        var trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "mellow-video-toolbar-trigger";
        trigger.title = "\u63d2\u5165\u89c6\u9891\u5361\u7247";
        trigger.setAttribute("aria-label", "\u63d2\u5165\u89c6\u9891\u5361\u7247");
        trigger.textContent = "\u25b6";
        item.appendChild(trigger);

        var selection = null;
        var selectedText = "";
        createVideoMenu(trigger, function (platform) {
            openVideoDialog(platform, selectedText, function (video, title) {
                insertTextareaVideo(textarea, video, title, selection);
                selection = null;
                selectedText = "";
            });
        }, function () {
            selection = {
                start: textarea.selectionStart || 0,
                end: textarea.selectionEnd || textarea.selectionStart || 0
            };
            selectedText = textarea.value.slice(selection.start, selection.end);
        });

        var admonitionButton = buttonRow.querySelector("#mellow-admonition-native-button");
        if (admonitionButton && admonitionButton.nextSibling) {
            buttonRow.insertBefore(item, admonitionButton.nextSibling);
        } else if (admonitionButton) {
            buttonRow.appendChild(item);
        } else {
            buttonRow.appendChild(item);
        }
    }

    function initializeNativeVideoToolbar() {
        if (!config.markdownEnabled || config.contentIsMarkdown === false) {
            return;
        }
        var textarea = document.getElementById("text");
        if (!textarea) {
            return;
        }

        function install() {
            var buttonRow = document.getElementById("wmd-button-row");
            if (!buttonRow) {
                return false;
            }
            installNativeVideoToolbar(buttonRow, textarea);
            return true;
        }

        if (install()) {
            return;
        }
        var observer = new MutationObserver(function () {
            if (install()) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, {childList: true, subtree: true});
    }

    function installVditorAdmonitionToolbar(shell, instance) {
        var toolbar = shell && shell.querySelector(".vditor-toolbar");
        if (!toolbar || toolbar.querySelector(".mellow-admonition-toolbar-button--vditor")) {
            return;
        }

        var item = document.createElement("div");
        item.className = "vditor-toolbar__item mellow-admonition-toolbar-button mellow-admonition-toolbar-button--vditor";
        var trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "mellow-admonition-toolbar-trigger";
        trigger.title = "\u63d2\u5165\u63d0\u793a\u5757";
        trigger.setAttribute("aria-label", "\u63d2\u5165\u63d0\u793a\u5757");
        trigger.textContent = "!";
        item.appendChild(trigger);
        toolbar.appendChild(item);

        var selected = "";
        createAdmonitionMenu(trigger, function (type) {
            instance.focus();
            instance.insertMD(toEditorMarkdown(buildAdmonitionMarkdown(type, selected)));
            selected = "";
        }, function () {
            selected = instance.getSelection ? instance.getSelection() : "";
        });
    }

    function installVditorVideoToolbar(shell, instance) {
        var toolbar = shell && shell.querySelector(".vditor-toolbar");
        if (!toolbar || toolbar.querySelector(".mellow-video-toolbar-button--vditor")) {
            return;
        }

        var item = document.createElement("div");
        item.className = "vditor-toolbar__item mellow-video-toolbar-button mellow-video-toolbar-button--vditor";
        var trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "mellow-video-toolbar-trigger";
        trigger.title = "\u63d2\u5165\u89c6\u9891\u5361\u7247";
        trigger.setAttribute("aria-label", "\u63d2\u5165\u89c6\u9891\u5361\u7247");
        trigger.textContent = "\u25b6";
        item.appendChild(trigger);
        toolbar.appendChild(item);

        var selected = "";
        createVideoMenu(trigger, function (platform) {
            openVideoDialog(platform, selected, function (video, title) {
                instance.focus();
                instance.insertMD(toEditorMarkdown(buildVideoMarkdown(video, title)));
                selected = "";
            });
        }, function () {
            selected = instance.getSelection ? instance.getSelection() : "";
        });
    }

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

    function installFrontendPreviewEnhancements(shell, frontStyleEnabled, instance) {
        if (!shell || shell.dataset.mellowPreviewReady === "1") {
            return;
        }
        shell.dataset.mellowPreviewReady = "1";
        var scheduled = false;
        var detailsSequence = 0;
        var activeAdmonitionEditor = null;
        var videoActionsLayer = document.createElement("div");
        videoActionsLayer.className = "mellow-editor-video-actions-layer";
        videoActionsLayer.setAttribute("aria-label", "\u89c6\u9891\u5361\u7247\u64cd\u4f5c");
        shell.appendChild(videoActionsLayer);

        function clearAdmonitionState(root) {
            root.querySelectorAll(".mellow-editor-admonition").forEach(function (block) {
                block.classList.remove(
                    "mellow-editor-admonition",
                    "mellow-editor-admonition--note",
                    "mellow-editor-admonition--tip",
                    "mellow-editor-admonition--important",
                    "mellow-editor-admonition--warning",
                    "mellow-editor-admonition--caution",
                    "mellow-editor-admonition--raw",
                    "is-editing"
                );
                delete block.dataset.mellowAdmonitionType;
                delete block.dataset.mellowAdmonitionTitle;
                delete block.dataset.mellowAdmonitionBody;
            });
            root.querySelectorAll(".mellow-editor-admonition__marker").forEach(function (marker) {
                marker.classList.remove(
                    "mellow-editor-admonition__marker",
                    "mellow-editor-admonition__marker--inline-body",
                    "is-editing"
                );
                delete marker.dataset.mellowAdmonitionTitle;
                delete marker.dataset.mellowAdmonitionBody;
            });
        }

        function clearVideoState(root) {
            root.querySelectorAll(".mellow-editor-video").forEach(function (block) {
                block.classList.remove(
                    "mellow-editor-video",
                    "mellow-editor-video--bilibili",
                    "mellow-editor-video--youtube",
                    "mellow-editor-video--raw",
                    "is-editing"
                );
                delete block.dataset.mellowVideoPlatform;
                delete block.dataset.mellowVideoPlatformLabel;
                delete block.dataset.mellowVideoTitle;
                delete block.dataset.mellowVideoSource;
            });
        }

        function applyVideoState(block, platform, title, source, raw) {
            var video = normalizeVideoEmbed(platform, source);
            if (!video) {
                return;
            }
            var normalizedTitle = String(title || "").trim()
                || videoPlatformLabels[platform] + " \u89c6\u9891\u5361\u7247";
            block.classList.add("mellow-editor-video", "mellow-editor-video--" + platform);
            if (raw) {
                block.classList.add("mellow-editor-video--raw");
            }
            block.dataset.mellowVideoPlatform = platform;
            block.dataset.mellowVideoPlatformLabel = videoPlatformLabels[platform];
            block.dataset.mellowVideoTitle = normalizedTitle;
            block.dataset.mellowVideoSource = video.originalUrl;
        }

        function decorateVideoCards(root) {
            clearVideoState(root);
            Array.prototype.slice.call(root.children).forEach(function (block) {
                if (block.tagName === "BLOCKQUOTE" && block.firstElementChild) {
                    var marker = block.firstElementChild;
                    var markerText = (marker.textContent || "").replace(/\u200b/g, "");
                    var markerMatch = /^\s*\[!MELLOW-VIDEO-(BILIBILI|YOUTUBE)\](?:[ \t]+([^\r\n]*))?(?:\r?\n([\s\S]*))?$/i.exec(markerText);
                    if (!markerMatch) {
                        return;
                    }
                    var source = markerMatch[3] || "";
                    if (!source && marker.nextElementSibling) {
                        source = marker.nextElementSibling.textContent || "";
                    }
                    applyVideoState(block, markerMatch[1].toLowerCase(), markerMatch[2], source, false);
                    return;
                }

                var rawText = (block.textContent || "").replace(/\u200b/g, "");
                var rawMatch = /^\s*:::\s*video[ \t]+(bilibili|youtube)(?:[ \t]+([^\r\n]*))?\r?\n([\s\S]*?)\r?\n:::\s*$/i.exec(rawText);
                if (rawMatch) {
                    applyVideoState(block, rawMatch[1].toLowerCase(), rawMatch[2], rawMatch[3], true);
                }
            });
        }

        function getVideoCardIndex(card) {
            return Array.prototype.indexOf.call(
                shell.querySelectorAll(".mellow-editor-video"),
                card
            );
        }

        function applyEditorMarkdown(markdown) {
            var editorValue = toEditorMarkdown(markdown);
            var textarea = document.getElementById("text");
            instance.setValue(editorValue);
            if (textarea && textarea.value !== markdown) {
                textarea.value = markdown;
                textarea.dispatchEvent(new Event("input", {bubbles: true}));
            }
            window.setTimeout(scheduleDecorate, 0);
        }

        function updateVideoBlock(card, action) {
            var cardIndex = getVideoCardIndex(card);
            var markdown = fromEditorMarkdown(instance.getValue());
            var blocks = findVideoMarkdownBlocks(markdown);
            var block = cardIndex >= 0 ? blocks[cardIndex] : null;
            if (!block) {
                return;
            }

            if (action === "delete") {
                if (!window.confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u4e2a\u89c6\u9891\u5361\u7247\u5417\uff1f")) {
                    return;
                }
                var before = markdown.slice(0, block.start);
                var after = markdown.slice(block.end);
                if (/\n\n$/.test(before) && /^\n\n/.test(after)) {
                    after = after.slice(1);
                }
                applyEditorMarkdown(before + after);
                return;
            }

            openVideoDialog(block.platform, block.source, function (video, title) {
                var replacement = buildVideoMarkdown(video, title);
                applyEditorMarkdown(
                    markdown.slice(0, block.start) + replacement + markdown.slice(block.end)
                );
            }, block.title);
        }

        function positionVideoActions() {
            var shellRect = shell.getBoundingClientRect();
            var cards = shell.querySelectorAll(".mellow-editor-video");
            videoActionsLayer.querySelectorAll(".mellow-editor-video-actions").forEach(function (actions, index) {
                var card = cards[index];
                if (!card || card.hidden) {
                    actions.hidden = true;
                    return;
                }
                var cardRect = card.getBoundingClientRect();
                var outside = cardRect.bottom <= shellRect.top || cardRect.top >= shellRect.bottom;
                actions.hidden = outside;
                if (outside) {
                    return;
                }
                actions.style.top = Math.max(8, cardRect.top - shellRect.top + 14) + "px";
                actions.style.left = Math.max(
                    8,
                    cardRect.right - shellRect.left - actions.offsetWidth - 14
                ) + "px";
            });
        }

        function syncVideoActions() {
            videoActionsLayer.textContent = "";
            shell.querySelectorAll(".mellow-editor-video").forEach(function (card) {
                var actions = document.createElement("div");
                actions.className = "mellow-editor-video-actions";
                var edit = document.createElement("button");
                edit.type = "button";
                edit.className = "mellow-editor-video-action mellow-editor-video-action--edit";
                edit.textContent = "\u7f16\u8f91";
                edit.setAttribute("aria-label", "\u7f16\u8f91\u89c6\u9891\u5361\u7247");
                var remove = document.createElement("button");
                remove.type = "button";
                remove.className = "mellow-editor-video-action mellow-editor-video-action--delete";
                remove.textContent = "\u5220\u9664";
                remove.setAttribute("aria-label", "\u5220\u9664\u89c6\u9891\u5361\u7247");
                actions.appendChild(edit);
                actions.appendChild(remove);
                videoActionsLayer.appendChild(actions);

                [edit, remove].forEach(function (button) {
                    button.addEventListener("mousedown", function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    });
                });
                edit.addEventListener("click", function () {
                    updateVideoBlock(card, "edit");
                });
                remove.addEventListener("click", function () {
                    updateVideoBlock(card, "delete");
                });
            });
            positionVideoActions();
        }

        function applyAdmonitionState(block, marker, type, title, inlineBody, raw) {
            var normalizedType = type.toLowerCase();
            var normalizedTitle = (title || "").trim() || admonitionLabels[normalizedType];
            block.classList.add(
                "mellow-editor-admonition",
                "mellow-editor-admonition--" + normalizedType
            );
            block.dataset.mellowAdmonitionType = normalizedType;
            block.dataset.mellowAdmonitionTitle = normalizedTitle;

            if (raw) {
                block.classList.add("mellow-editor-admonition--raw");
                block.dataset.mellowAdmonitionBody = inlineBody || "";
                return;
            }

            marker.classList.add("mellow-editor-admonition__marker");
            marker.dataset.mellowAdmonitionTitle = normalizedTitle;
            if (inlineBody && inlineBody.trim()) {
                marker.classList.add("mellow-editor-admonition__marker--inline-body");
                marker.dataset.mellowAdmonitionBody = inlineBody.trim();
            }
        }

        function decorateAdmonitions(root) {
            clearAdmonitionState(root);
            Array.prototype.slice.call(root.children).forEach(function (block) {
                if (block.tagName === "BLOCKQUOTE" && block.firstElementChild) {
                    var marker = block.firstElementChild;
                    var markerText = (marker.textContent || "").replace(/\u200b/g, "");
                    var githubPattern = new RegExp(
                        "^\\s*\\[!(?:MELLOW-(?:COLON|GITHUB)-)?" + admonitionTypeSource +
                        "\\](?:[ \\t]+([^\\r\\n]*))?(?:\\r?\\n([\\s\\S]*))?$",
                        "i"
                    );
                    var github = githubPattern.exec(markerText);
                    if (github) {
                        applyAdmonitionState(block, marker, github[1], github[2], github[3], false);
                    }
                    return;
                }

                var rawText = (block.textContent || "").replace(/\u200b/g, "");
                var rawPattern = new RegExp(
                    "^\\s*:::\\s*" + admonitionTypeSource +
                    "(?:[ \\t]+([^\\r\\n]*))?\\r?\\n([\\s\\S]*?)\\r?\\n:::\\s*$",
                    "i"
                );
                var raw = rawPattern.exec(rawText);
                if (raw) {
                    applyAdmonitionState(block, null, raw[1], raw[2], raw[3], true);
                }
            });
        }

        function updateAdmonitionEditingState() {
            if (activeAdmonitionEditor) {
                activeAdmonitionEditor.classList.remove("is-editing");
                activeAdmonitionEditor = null;
            }
            var selection = window.getSelection ? window.getSelection() : null;
            var anchor = selection && selection.anchorNode;
            var element = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement);
            if (!element || !shell.contains(element)) {
                return;
            }
            var editor = element.closest(
                ".mellow-editor-admonition__marker, .mellow-editor-admonition--raw, .mellow-editor-video"
            );
            if (!editor || !shell.contains(editor)) {
                return;
            }
            activeAdmonitionEditor = editor;
            activeAdmonitionEditor.classList.add("is-editing");
        }

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
            if (frontStyleEnabled) {
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
            }

            shell.querySelectorAll(
                ".vditor-wysiwyg > .vditor-reset, .vditor-ir > .vditor-reset"
            ).forEach(function (root) {
                decorateAdmonitions(root);
                decorateVideoCards(root);
                if (frontStyleEnabled) {
                    decorateDetails(root);
                }
            });
            updateAdmonitionEditingState();
            syncVideoActions();
        }

        function scheduleDecorate() {
            if (scheduled) {
                return;
            }
            scheduled = true;
            window.requestAnimationFrame(decorate);
        }

        document.addEventListener("selectionchange", updateAdmonitionEditingState);
        shell.addEventListener("scroll", positionVideoActions, true);
        window.addEventListener("resize", positionVideoActions);
        new MutationObserver(function (mutations) {
            var onlyActionChanges = mutations.length && mutations.every(function (mutation) {
                return videoActionsLayer.contains(mutation.target);
            });
            if (!onlyActionChanges) {
                scheduleDecorate();
            }
        }).observe(shell, {childList: true, subtree: true});
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
                var fontMode = ["sans", "content-serif", "serif"].indexOf(config.fontMode) !== -1
                    ? config.fontMode
                    : "sans";
                shell.classList.add("mellow-enhance-font-" + fontMode);
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
                emitTextareaInput(fromEditorMarkdown(instances[activeMode].getValue()));
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
                    value: toEditorMarkdown(textarea.value),
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
                            emitTextareaInput(fromEditorMarkdown(value));
                        }
                    },
                    after: function () {
                        shell.classList.remove("is-initializing");
                        installFrontendPreviewEnhancements(shell, modeConfig.frontStyle, instance);
                        installVditorAdmonitionToolbar(shell, instance);
                        installVditorVideoToolbar(shell, instance);
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
                } else if (fromEditorMarkdown(instance.getValue()) !== textarea.value) {
                    syncing = true;
                    instance.setValue(toEditorMarkdown(textarea.value), true);
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
        initializeNativeAdmonitionToolbar();
        initializeNativeVideoToolbar();
        initializeEditorEnhance();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
}());
