(function () {
    'use strict';

    function createElement(tag, className, text) {
        var element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (typeof text !== 'undefined') {
            element.textContent = text;
        }
        return element;
    }

    function createIcon(name) {
        var icon = createElement('iconify-icon');
        icon.setAttribute('icon', name);
        icon.setAttribute('noobserver', '');
        icon.setAttribute('aria-hidden', 'true');
        return icon;
    }

    function dispatchChange(control) {
        var event;
        if (typeof Event === 'function') {
            event = new Event('change', {bubbles: true});
        } else {
            event = document.createEvent('Event');
            event.initEvent('change', true, false);
        }
        control.dispatchEvent(event);
    }

    function getOption(control) {
        var node = control;
        while (node && node !== document.body) {
            if (node.classList && node.classList.contains('typecho-option')) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    function initTabs(root) {
        var tabs = root.querySelector('.mellow-config-tabs');
        var buttons;
        var panels;
        var stored;
        if (!tabs) {
            return;
        }
        buttons = Array.prototype.slice.call(tabs.querySelectorAll('.mellow-config-tab'));
        panels = Array.prototype.slice.call(root.querySelectorAll('.mellow-config-panel'));

        function activate(id, focus) {
            buttons.forEach(function (button) {
                var active = button.getAttribute('data-tab') === id;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-selected', active ? 'true' : 'false');
                button.tabIndex = active ? 0 : -1;
                if (active && focus) {
                    button.focus();
                }
            });
            panels.forEach(function (panel) {
                panel.classList.toggle('is-active', panel.getAttribute('data-panel') === id);
                panel.hidden = panel.getAttribute('data-panel') !== id;
            });
            try {
                window.sessionStorage.setItem('mellow-enhance-config-tab', id);
            } catch (error) {
                return;
            }
        }

        buttons.forEach(function (button, index) {
            button.addEventListener('click', function () {
                activate(button.getAttribute('data-tab'), false);
            });
            button.addEventListener('keydown', function (event) {
                var nextIndex;
                if ('ArrowDown' !== event.key && 'ArrowUp' !== event.key && 'Home' !== event.key && 'End' !== event.key) {
                    return;
                }
                event.preventDefault();
                if ('Home' === event.key) {
                    nextIndex = 0;
                } else if ('End' === event.key) {
                    nextIndex = buttons.length - 1;
                } else {
                    nextIndex = (index + ('ArrowDown' === event.key ? 1 : -1) + buttons.length) % buttons.length;
                }
                activate(buttons[nextIndex].getAttribute('data-tab'), true);
            });
        });
        try {
            stored = window.sessionStorage.getItem('mellow-enhance-config-tab');
        } catch (error) {
            stored = '';
        }
        if (!stored || !tabs.querySelector('[data-tab="' + stored + '"]')) {
            stored = buttons.length ? buttons[0].getAttribute('data-tab') : '';
        }
        if (stored) {
            activate(stored, false);
        }
        tabs.classList.add('is-ready');
    }

    function initBinarySwitches(root) {
        var groups = {};

        Array.prototype.forEach.call(
            root.querySelectorAll('.mellow-config-panel input[type="radio"][name]'),
            function (radio) {
                if (!groups[radio.name]) {
                    groups[radio.name] = [];
                }
                groups[radio.name].push(radio);
            }
        );

        Object.keys(groups).forEach(function (name) {
            var radios = groups[name];
            var values = {};
            var option;
            var button;
            var track;
            var thumb;
            var state;
            var fieldLabel;
            var container;

            radios.forEach(function (radio) {
                values[radio.value] = radio;
            });
            if (2 !== radios.length || !values['0'] || !values['1']) {
                return;
            }
            option = getOption(radios[0]);
            if (!option || option.querySelector('.mellow-switch')) {
                return;
            }
            container = option.querySelector('li');
            if (!container) {
                return;
            }

            button = createElement('button', 'mellow-switch');
            button.type = 'button';
            button.setAttribute('role', 'switch');
            track = createElement('span', 'mellow-switch__track');
            track.setAttribute('aria-hidden', 'true');
            thumb = createElement('span', 'mellow-switch__thumb');
            state = createElement('span', 'mellow-switch__state');
            track.appendChild(thumb);
            button.appendChild(track);
            button.appendChild(state);
            container.insertBefore(button, container.querySelector('.description'));

            radios.forEach(function (radio) {
                var source = radio.parentNode;
                if (source && source.classList) {
                    source.classList.add('mellow-switch-source');
                }
            });
            fieldLabel = option.querySelector('.typecho-label');

            function getChoiceLabel(radio) {
                var label = radio.id ? option.querySelector('label[for="' + radio.id + '"]') : null;
                if (!label && radio.nextElementSibling && 'LABEL' === radio.nextElementSibling.tagName) {
                    label = radio.nextElementSibling;
                }
                return label ? label.textContent.trim() : ('1' === radio.value ? '开启' : '关闭');
            }

            function refresh() {
                var enabled = values['1'].checked;
                var selected = enabled ? values['1'] : values['0'];
                var selectedLabel = getChoiceLabel(selected);
                var fieldName = fieldLabel ? fieldLabel.textContent.trim() : name;
                button.setAttribute('aria-checked', enabled ? 'true' : 'false');
                button.setAttribute('aria-label', fieldName + '：' + selectedLabel);
                button.title = selectedLabel;
                state.textContent = selectedLabel;
            }

            button.addEventListener('click', function () {
                var target = values[values['1'].checked ? '0' : '1'];
                target.checked = true;
                dispatchChange(target);
                refresh();
            });
            radios.forEach(function (radio) {
                radio.addEventListener('change', refresh);
            });
            refresh();
        });
    }

    function initFieldLabelIcons(root) {
        var icons = {
            enableLatex: 'fa6-solid:square-root-variable',
            enableMermaid: 'fa6-solid:diagram-project',
            enableMermaidSourceToggle: 'fa6-solid:code-compare',
            mermaidFollowMellowTheme: 'fa6-solid:palette',
            enableWysiwyg: 'fa6-solid:pen-to-square',
            wysiwygFrontendStyle: 'fa6-solid:paintbrush',
            enableInstantRender: 'fa6-solid:bolt',
            autoOpenInstantRender: 'fa6-solid:arrow-up-right-from-square',
            instantRenderFrontendStyle: 'fa6-solid:paintbrush'
        };

        Object.keys(icons).forEach(function (name) {
            var control = root.querySelector('[name="' + name + '"], [name="' + name + '[]"]');
            var option;
            var label;
            var wrapper;
            if (!control) {
                return;
            }
            option = getOption(control);
            label = option ? option.querySelector('.typecho-label') : null;
            if (!label || label.querySelector('.mellow-field-label__icon')) {
                return;
            }
            label.classList.add('mellow-field-label');
            wrapper = createElement('span', 'mellow-field-label__icon');
            wrapper.appendChild(createIcon(icons[name]));
            label.insertBefore(wrapper, label.firstChild);
        });
    }

    function init() {
        var root = document.querySelector('[data-mellow-enhance-settings]');
        if (!root) {
            return;
        }
        initTabs(root);
        initFieldLabelIcons(root);
        initBinarySwitches(root);
    }

    if ('loading' === document.readyState) {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
