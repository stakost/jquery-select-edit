/**
 * Select-edit 1.0.15
 * jQuery plugin for custom select editable.
 *
 * Full source at https://github.com/stakost/jquery-select-edit
 *
 * @author stakost <aa@bbbbb.cc>
 */

!function ($) {
    'use strict';

    var _NAME_ = 'selectEdit',
        _Constructor,
        KEY_CODE_ESCAPE = 27,
        KEY_CODE_UP = 38,
        KEY_CODE_DOWN = 40,
        KEY_CODE_LEFT = 39,
        KEY_CODE_RIGHT = 37,
        KEY_CODE_ENTER = 13,
        $document = $(document),
        $window = $(window),
        CLASS = 'select-edit',
        CLASS_DISABLED = CLASS + '_disabled',
        CLASS_BUTTON = CLASS + '__select',
        CLASS_BUTTON_OPEN = CLASS_BUTTON + '_open',
        CLASS_BUTTON_EMPTY = CLASS_BUTTON + '_empty',
        CLASS_BUTTON_TEXT = CLASS_BUTTON + '__current',
        CLASS_DROP = CLASS + '-drop',
        CLASS_DROP_SHOW_UP = CLASS_DROP + '_show-up',
        CLASS_DROP_SHOW_DOWN = CLASS_DROP + '_show-down',
        CLASS_DROP_SHOW = CLASS_DROP + '_show',
        CLASS_TOOLTIP = CLASS + '__tooltip',
        CLASS_LIST = CLASS + '__results',
        CLASS_SUBMIT_BOX = CLASS + '__submit-box',
        CLASS_SUBMIT = CLASS + '__submit',
        CLASS_SEARCH_BOX = CLASS + '__search-box',
        CLASS_SEARCH_INPUT = CLASS + '__search-input',
        CLASS_LISTBOX = CLASS_LIST,
        CLASS_LIST_ITEM = CLASS_LIST + '__item',
        CLASS_LIST_ITEM_MARKED = CLASS_LIST_ITEM + '_marked',
        CLASS_LIST_ITEM_HOVER = CLASS_LIST_ITEM + '_hover',
        CLASS_LIST_ITEM_SELECTED = CLASS_LIST_ITEM + '_selected',
        CLASS_LOADER = CLASS + '-loader',

        DROP_MARGIN = 5,
        DROP_MODS = {
            'up'  : CLASS_DROP_SHOW_UP,
            'down': CLASS_DROP_SHOW_DOWN
        },

        AJAX_DEFAULT = {
            type    : 'GET',
            delay   : 500,
            resPath : 'res',
            load    : true,
            resFormat : function(result) {
                if (result.res) return result.res;
                return result;
            }
        },

        IS_REQUEST_FORBIDDEN = false,

        _toString = Object.prototype.toString,
        _isFunction = function (object) {
            return typeof object === 'function';
        },
        _isString = function (object) {
            return _toString.call(object) == "[object String]";
        },
        _isArray = function (object) {
            return _toString.call(object) == "[object Array]";
        },
        _getObjectValues = function (obj) {
            var values = [];

            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    values.push(obj[key]);
                }
            }

            return values;
        };

    _Constructor = function (element, options) {
        var ajax = options.ajax;

        this.$select        = $(element);
        this.options        = options;
        this.isAjax         = ajax && ajax.load;
        this.isAjaxSearch   = ajax && ajax.search;
        this.isAjaxSave     = ajax && ajax.save;
        this.requestCounter = 0;

        var $select = this.$select;

        if (!$select.is('select')) {
            console.warn(_NAME_, 'Sorry, only select element!');
            return false;
        }

        //Дефолт для аякс запросов
        if (this.isAjax) {
            $select.prop('multiple', true);
        }

        //Дефолт для аякс поиска
        if (this.isAjaxSearch) {
            $select.prop('multiple', true);
            this.options.search = true;
        }

        $select.attr('autocomplete', 'off');
        this.isMultiple = $select.prop('multiple');
        this.isDisabled = $select.prop('disabled');

        this._fixSelect();
        this.initialize();
    };

    _Constructor.DEFAULTS = {
        tmplContent    : '<div role="form">' +
            '<span role="button">' +
            '<span role="link"></span>' +
            '</span>' +
            '</div>',
        tmplGroup      : '<div role="group"></div>',
        tmplTooltip    : '<div role="tooltip"></div>',
        tmplList       : '<div role="list"></div>',
        tmplListbox    : '<div role="listbox"></div>',
        tmplListitem   : '<div role="listitem"%attrs%>%text%</div>',
        tmplSubmitBox  : '<div></div>',
        tmplSubmit     : '<button role="actionButton">submit</button>',
        tmplSearchBox  : '<div></div>',
        tmplSearchInput: '<input name="_search" type="search" />',

        placeholderTitle: null,

        // вставлять открывающийся список в боди
        appendBody      : false,

        // пирнудительно списко выпадает
        dropMod         : false,

        // use submit button
        submitButton    : false,

        search           : null,
        placeholderSearch: 'Search',

        ajax : null,

        returnDetailsFormat : {
            optionValue    : 'id',
            optionContent  : 'name',
            optionSelected : 'selected'
        },


        classHide            : CLASS + '-hide',
        classForm            : CLASS,
        classButton          : CLASS_BUTTON,
        classButtonOpen      : CLASS_BUTTON_OPEN,
        classButtonEmpty     : CLASS_BUTTON_EMPTY,
        classButtonText      : CLASS_BUTTON_TEXT,
        classGroup           : CLASS_DROP,
        classGroupShow       : CLASS_DROP_SHOW,
        classTooltip         : CLASS_TOOLTIP,
        classSubmitBox       : CLASS_SUBMIT_BOX,
        classSubmit          : CLASS_SUBMIT,
        classSearchBox       : CLASS_SEARCH_BOX,
        classSearchInput     : CLASS_SEARCH_INPUT,
        classList            : CLASS_LIST,
        classListbox         : CLASS_LISTBOX,
        classListitem        : CLASS_LIST_ITEM,
        classListitemHover   : CLASS_LIST_ITEM_HOVER,
        classListitemSelected: CLASS_LIST_ITEM_SELECTED,
        classLoader          : CLASS_LOADER,

        callItemToggle  : null,
        callBeforeChange: null
    };

    _Constructor.prototype = {
        constructor: _Constructor,

        isOpen         : false,
        isGenerateItems: false,

        /**
         * Инициализация
         */
        initialize: function () {
            var options            = this.options,
                $select            = this.$select;

            this._initHtml();
            this._hideSelect();

            $select
                // прячем из фокуса селект
                .attr('tabindex', '-1')
                .on('change.' + _NAME_, $.proxy(this._onChangeSelect, this));

            // создаем фейковый инпут для фокуса
            this.$fakeInput = $('<input tabindex="0">')
                .addClass(options.classHide)
                .on('focus keydown blur', $.proxy(this._onEventFake, this))
                .insertBefore($select);

            this._actualizeButtonText();

            this.$content.insertAfter($select);

            this.isDisabled && this.disable();

            this.$button.on('click.' + _NAME_ + ' touchend.' + _NAME_, $.proxy(this._customSelectClickHandler, this));
            this.$submitButton && this.$submitButton.on('click.' + _NAME_, $.proxy(this.submitChanges, this));

            $window.on('resize.' + _NAME_, this.updateListPosition.bind(this));
        },

        /**
         * Уничтожает виджет
         */
        destroy: function () {
            var $select = this.$select;

            this.hide();

            this.$content.remove();
            this.$fakeInput.remove();

            this._showSelect();

            $select.data(_NAME_, false);
            $select.off('.' + _NAME_);
            $window.off('.' + _NAME_);
        },

        /**
         * События фейкового инпута
         * @param e
         * @private
         */
        _onEventFake: function (e) {
            switch (e.type) {
                case 'focus':
                    this.show();
                    break;

                case 'blur':
                    break;
            }
        },

        /**
         * Событие на смену данных в селекте
         * @private
         */
        _onChangeSelect: function () {
            this
                ._actualizeListItems()
                ._actualizeButtonText();

            return true;
        },

        /**
         * Актуализировать каскомный список
         * @private
         */
        _actualizeListItems: function () {
            var classSelected = this.options.classListitemSelected,
                $items = this.getListItems(),
                $selectedOptions = this.getSelected(),
                selectedItems = {};

            $selectedOptions.each2(function () {
                selectedItems[this.value] = this;
            });

            $items
                .removeClass(classSelected)
                .each2(function () {
                    var value = this.getAttribute('data-value');
                    if (selectedItems[value]) {
                        $(this).addClass(classSelected)
                    }
                });

            return this;
        },

        /**
         * Актуализация кнопки кастомного селекта
         * @params {Boolean} isPlural Отобразить текст селекта в формате колличества выбраных опций
         * @private
         */
        _actualizeButtonText: function (isPlural) {
            var text = this.options.placeholderTitle || this._getSelectedText(),
                selectedOption;

            if (isPlural) {
                selectedOption = this.getSelected().length;
                text = selectedOption ? (selectedOption + ' '+ this._nouns(selectedOption)) : text;
            }

            this.$buttonText.text(text || this.$select.attr('placeholder'));

            this.$button.toggleClass(this.options.classButtonEmpty, !text);

            return this;
        },

        /**
         * Показать/спрятать список
         */
        toggle: function () {
            if (this._getDisabledState()) {
                return false;
            }

            if (this.isOpen) {
                this.hide();
            }
            else {
                this.show();
            }

            return false;
        },

        /**
         * Применяет изменения
         */
        submitChanges: function () {
            // Применяем изменения только к помеченным элементам
            // Выбирать только чекнутые нельзя, т.к. в изменения может входить и uncheck
            var $itemsList = this.getMarkedOptions();

            $itemsList.each(function (index, item) {
                var $item = $(item),
                    value = $item.data('value'),
                    selected = $item.hasClass(this.options.classListitemSelected);

                $item.removeClass(CLASS_LIST_ITEM_MARKED);

                // почему-то проверка selected в этом методе вызывается позже, чем в switchOption
                setTimeout(this.switchOption.bind(this, value, selected));
                this._actualizeButtonText();

                this.hide();
            }.bind(this));
        },

        /**
         * Задает правильную позицию для списка
         */
        updateListPosition: function () {
            var self = this,
                options = self.options,
                $content = self.$content,
                $group = self.$group,
                position = $content.offset(),
                listHeight = $group.outerHeight(),
                windowHeight = $window.height(),
                contentHeight = $content.outerHeight(),
                contentWidth = $content.outerWidth(),
                documentScroll = $window.scrollTop(),
                freeSpace = windowHeight - position.top - contentHeight - DROP_MARGIN,
                offsetTop = 0,
                dropMod = '',
                hasTopSpace = (position.top - documentScroll) > listHeight,
                hasBottomSpace = freeSpace > listHeight;

            if (!hasBottomSpace && hasTopSpace) {
                offsetTop = -listHeight - DROP_MARGIN;

                dropMod = 'up';
            } else {
                offsetTop = contentHeight + DROP_MARGIN;

                dropMod = 'down';
            }

            if (options.appendBody) {
                position.top += offsetTop;
                $group
                    .offset(position)
                    .outerWidth(contentWidth);
            }

            // пренудительно заставляем выпадать дроп куда нужно
            if (options.dropMod) {
                dropMod = options.dropMod;
            }

            self.setMod(dropMod, DROP_MODS, $group);
        },

        /**
         * Устанавливает модификатор на элемент
         * @param mode
         * @param mods
         * @param $element
         */
        setMod: function (mode, mods, $element) {
            this
                .removeModElement($element, mods)
                .addClass(mods[mode]);
        },

        /**
         * Удаляет модификаторы с элемента
         * @param $element
         * @param mods
         * @returns {*}
         */
        removeModElement: function ($element, mods) {
            return ($element).removeClass(_getObjectValues(mods).join(' '));
        },

        /**
         * Показать список
         * @returns {boolean}
         */
        show: function () {
            if (this.isOpen) {
                return true;
            }

            // оповестить открытые списки
            $document.trigger('event-show.' + _NAME_);

            this._generateItems();

            this.$group
                .addClass(this.options.classGroupShow)
                .appendTo((this.options.appendBody && document.body) || this.$content)
                .focus();

            this.$searchInput && this.$searchInput.focus();

            this.updateListPosition();

            this.isOpen = true;
            this._eventsGroup();

            this.$select.trigger('onToggle', true);

            return this;
        },

        /**
         * Спрятать список
         * @returns {boolean}
         */
        hide: function () {
            this.isOpen = false;
            this._eventsGroup();

            this.$group
                .removeClass(this.options.classGroupShow);

            this.options.appendBody && this.$group.offset({
                top : 0,
                left: 0
            });

            this.$group.detach();

            this.$select.trigger('onToggle');

            this.save();
        },

        /**
         * Получить даные селекта
         * @returns {Array} arr
         */
        getSelectedDetail: function() {
            var arr = [],
                format = this.options.returnDetailsFormat,
                obj;

            this.getSelected().each(function() {
                obj = {};
                
                obj[format.optionValue]    = this.value;
                obj[format.optionContent]  = this.textContent;
                obj[format.optionSelected] = this.selected;

                arr.push(obj);
            });

            return arr;
        },

        on: function() {
            this.$select.on.apply(this.$select, arguments);
            return this;
        },

        /**
         * Сохранить результат выбора (сохраняем при событии hide)
         * returns {Object} Deffered
         * events {Object} beforeSave, arguemnts [conf] Можна изменить конфиг перед отправкой
         * events {Object} onSave, arguemnts [dfd]
         */
        save: function() {
            var self = this,
                ajax = self.options.ajax || {},
                selectDataName = ajax.selectDataName || 'selectedData',
                conf = {
                    data: ajax.data || {}
                },
                dfd;

            if (!self.isAjaxSave) {
                return self;
            }

            conf.data[selectDataName] = self.getSelectedDetail();

            conf = $.extend({}, ajax, conf);

            self.$select.trigger('beforeSave', conf);

            dfd = $.ajax(conf);

            self._showLoader();

            self.$select.trigger('onSave', dfd);

            dfd.always($.proxy(self._hideLoader, self));

            return self;
        },

        /**
         * Заменяет классы на кнопке
         * @param classes
         */
        replaceBtnClass: function (classes) {
            this.$content
                .removeClass()
                .addClass(classes);
        },

        /**
         * Навесить/снять события списка
         * @private
         */
        _eventsGroup: function () {
            var options = this.options,
                $searchInput = this.$searchInput,
                searchItemsHandler = !this.isAjaxSearch ? this._searchItems : this._generateItemsWithAjax;

            if (this.isOpen) {
                this.$group
                    .on('touchmove.' + _NAME_, $.proxy(this._touchmoveGroup, this))
                    .on('click.' + _NAME_ + ' touchend.' + _NAME_, $.proxy(this._clickGroup, this))
                    .on('mousedown.' + _NAME_ + ' touchend.' + _NAME_, '.' + options.classListitem, $.proxy(this._clickListItem, this))
                    .on('mouseover.' + _NAME_ + ' mouseout.' + _NAME_ + ' touchend.' + _NAME_,
                        '.' + options.classListitem,
                        $.proxy(this._hoverItem, this)
                    );
                $document
                    .on('keydown.' + _NAME_, $.proxy(this._keydownGroup, this))
                    .on('mousedown.' + _NAME_ + ' touchend.' + _NAME_, $.proxy(this._clickDocument, this))
                    .on('event-show.' + _NAME_, $.proxy(this.hide, this));

                $searchInput && $searchInput.on('keyup.' + _NAME_, $.proxy(searchItemsHandler, this));
            }
            else {
                this.$group.off('.' + _NAME_);
                $document.off('.' + _NAME_);
                $searchInput && $searchInput.off('.' + _NAME_);
            }
            this.toggleButton();
        },

        /**
         * Обрабатываем клик по custom seletc
         * @param {Object} e Объект при обработке DOM ивента
         */
        _customSelectClickHandler: function(e) {
            //Делаем только один запрос на сервер, если это загрузка аяксом
            if (this.isAjax && this.requestCounter < 1) this._generateItemsWithAjax();
            else this.toggle();

            return false;
        },

        /**
         * Состояние кнопки
         */
        toggleButton: function () {
            this.$button.toggleClass(this.options.classButtonOpen, this.isOpen);
        },

        /**
         * Enable widget
         */
        enable: function () {
            this._toggleDisable(false);
            this.isDisabled = false;
        },

        /**
         * Disable widget
         */
        disable: function () {
            this.hide();
            this._toggleDisable(true);
            this.isDisabled = true;
        },

        /**
         * Добавить элементы в список
         * @param {Array} optionsArr
         * @param {Object} opts Смотри _renderHiddenItems метод
         */
        addOptions: function(optionsArr, opts) {
            var self = this;

            if (!$.isArray(optionsArr)) {
                return false;
            }

            opts = $.extend({
                removeNonSelected: false
            }, opts || {});

            self.isGenerateItems = false;

            self
                ._renderHiddenItems(optionsArr, opts)
                ._generateItems();

            return self;
        },


        /**
         * Обновить селект
         * @param {Array} optionsArr
         */
        update: function(optionsArr) {
            return this
                        .addOptions(optionsArr, {
                            removeAll: true
                        })
                        ._actualizeButtonText();
        },


        /**
         * Toggle disable class
         * @param disable
         * @private
         */
        _toggleDisable: function (disable) {
            this.$content.toggleClass(CLASS_DISABLED, disable);
            this.$select.prop('disabled', disable);
        },

        /**
         * Отлов событий ввода
         * @param e
         * @returns {boolean}
         * @private
         */
        _keydownGroup: function (e) {
            var options = this.options;

            if (!this.isOpen) {
                return true;
            }

            switch (e.which) {
                case KEY_CODE_DOWN:
                case KEY_CODE_UP:
                    this._navGroupItem(e.which === KEY_CODE_DOWN);
                    return false;
                    break;
                case KEY_CODE_LEFT:
                case KEY_CODE_RIGHT:
                    this._navGroupItem(e.which === KEY_CODE_LEFT);
                    return false;
                    break;
                case KEY_CODE_ESCAPE:
                    this.hide();
                    break;
                case KEY_CODE_ENTER:
                    this._toggleListItemHover();
                    !this.isMultiple && !options.submitButton && this.hide();

                    break;
            }
        },

        /**
         * Навигация по списку - вверх/вниз
         * @param next
         * @private
         */
        _navGroupItem: function (next) {
            var options = this.options,
                classHover = options.classListitemHover,
                $items = this.getListItems(),
                $itemHover = this._getListItemsHover($items),
                $current,
                _listHeight,
                _listScrollTop,
                _currentHeight,
                _currentPosition;

            if (next) {
                $current = ($itemHover.length && $itemHover.nextAll(':not(:hidden):first'));
                $current = ($current.length && $current) || $items.filter(':not(:hidden):first');
            }
            else {
                $current = ($itemHover.length && $itemHover.prevAll(':not(:hidden):first'));
                $current = ($current.length && $current) || $items.filter(':not(:hidden):last');
            }

            _listHeight = this.$list.height();
            _listScrollTop = this.$list.scrollTop();
            _currentPosition = $current.position();
            _currentPosition = _currentPosition.top;

            if (_listHeight < _currentPosition + $current.outerHeight()) {
                this.$list.scrollTop(_listScrollTop + (_currentPosition + $current.outerHeight() - _listHeight))
            }
            else if (_currentPosition < 0) {
                this.$list.scrollTop(_listScrollTop + (_currentPosition))
            }

            $itemHover.removeClass(classHover);
            $current.addClass(classHover);
        },

        /**
         * Клик по списку.
         * Обязательно должен возвращать false, чтобы не закрылся.
         *
         * @param e
         * @returns {boolean}
         * @private
         */
        _clickGroup: function (e) {
            //return false;
        },

        /**
         * Клик по документу.
         * Отловить закрытие списка. Если кликнули не по выпадающему списку селекта
         *
         * @private
         */
        _clickDocument: function (e) {
            var isClickOnGroup = !!$(e.target).closest(this.$group).length,
                isClickOnSelect = !!$(e.target).closest(this.$content).length;

            
            if (isClickOnSelect) {
                return true;
            }
            
            if (!isClickOnGroup) {
                this.hide();
            }
        },

        /**
         * Отметить/снять текущий подсвеченный элемент списка
         * @private
         */
        _toggleListItemHover: function () {
            var $currentItem = this._getListItemsHover();
            if (!$currentItem.length) {
                return;
            }
            this._switchListItem($currentItem, !$currentItem.hasClass(this.options.classListitemSelected));
        },

        /**
         * Подсветить элемент списка или наоборот
         * @param e
         * @private
         */
        _hoverItem: function (e) {
            var $listItems = this.getListItems(),
                classHover = this.options.classListitemHover,
                $listItem = $(e.currentTarget);

            switch (e.type) {
                case 'mouseover':
                case 'touchend':
                    e.type === 'touchend' && $listItems.removeClass(classHover);
                    $listItem.addClass(classHover);
                    break;

                case 'mouseout':
                    $listItems.removeClass(classHover);
                    break;
            }
        },

        /**
         * Ловим движение по тачскрину
         * @private
         */
        _touchmoveGroup: function () {
            this.isTouchMove = true;
        },

        /**
         * Клик по элементу списка
         * @param e
         * @private
         */
        _clickListItem: function (e) {
            // если было движение по тачскрину - не выделяем
            if (this.isTouchMove) {
                this.isTouchMove = false;
                return true;
            }
            var options = this.options,
                classSelected = options.classListitemSelected,
                $item = $(e.currentTarget),
                isSelected = !$item.hasClass(classSelected),
                isMultyOrSubmit = !this.isMultiple && !options.submitButton;

            if (isMultyOrSubmit) {
                this.getListItems().removeClass(classSelected);
            }

            this._switchListItem($item, isSelected);

            if (isMultyOrSubmit) {
                this.hide();
            }

            if (this.isAjax || this.isAjaxSearch) this._actualizeButtonText(true);
        },

        /**
         * Переключить состояние элемента списка
         * @param $item
         * @param selected
         * @private
         */
        _switchListItem: function ($item, selected) {
            var options = this.options,
                callBeforeChange = this.options.callBeforeChange,
                isOk = true,
                value = $item.data('value'),
                triggerData = {
                    value   : value,
                    selected: selected
                };

            _isFunction(callBeforeChange) && (isOk = callBeforeChange(triggerData));

            this.$select.trigger('beforeChange', triggerData);

            if (!isOk) {
                return false;
            }

            if (!this.isMultiple) {
                $item.siblings().removeClass(options.classListitemSelected);
            }

            $item.toggleClass(options.classListitemSelected, selected);

            if (this.options.submitButton) {
                $item.addClass(CLASS_LIST_ITEM_MARKED);

                return;
            }

            this.switchOption($item.data('value'), selected);
        },

        /**
         * Переключить состояние у селекта
         * @param value
         * @param selected
         * @param force
         * @private
         */
        switchOption: function (value, selected, config) {
            config = config || {};

            var $select = this.$select,
                $option = $select.find('option[value="' + value + '"]'),
                callItemToggle = this.options.callItemToggle,
                triggerData = {
                    value   : value,
                    selected: selected
                };

            $option.prop('selected', selected);
            !selected && $option.removeAttr('selected');

            _isFunction(callItemToggle) && callItemToggle(triggerData);

            if (!config.silent) {
                $select.trigger('change');
            }
            
            $select.trigger('itemToggle', triggerData);
        },

        /**
         * Достать все элементы списка
         * @returns {*|HTMLElement|$listItems}
         */
        getListItems: function () {
            return this.$listItems || $();
        },

        isEmpty: function() {
            return !(!!this.getListItems().length);
        },

        /**
         * Достать подсвеченные элементы списка
         * @param $items
         * @returns {Array|*|Object}
         * @private
         */
        _getListItemsHover: function ($items) {
            $items = $items || this.getListItems();
            return $items.filter('.' + this.options.classListitemHover);
        },

        /**
         * Достать список всех выделенных элементов.
         * Возвращается строка через запятую.
         *
         * @returns {string}
         * @private
         */
        _getSelectedText: function () {
            var text = '';
            this.getSelected().each(function () {
                text += (text ? ', ' : '') + $(this).text();
            });
            return text;
        },

        /**
         * Достать список всех выделенных элементов.
         * @returns {*|HTMLElement}
         */
        getSelected: function () {
            var $select = this.$select,
                val = $select.val(),
                $items = $();

            if (_isString(val)) {
                $items = $select.find('[value="' + val + '"]');
            }
            else if (_isArray(val)) {
                var $itemsAll = $select.find('[value]');
                val.forEach(function (value) {
                    var $item = $itemsAll.filter('[value="' + value + '"]');
                    $items = ($items && $items.add($item)) || $item;
                });
            }
            return $items;
        },

        getNotSelected: function() {
            return this.$select.find('option:not(:checked)');
        },

        /**
         * Возвращает список помеченных на редактирование элементов
         * @returns {*}
         */
        getMarkedOptions: function () {
            return this.$list.find('.' + CLASS_LIST_ITEM_MARKED);
        },

        /**
         * Скрыть родной селект
         * @private
         */
        _hideSelect: function () {
            this.$select.addClass(this.options.classHide);
        },

        /**
         * Показать родной селект
         * @private
         */
        _showSelect: function () {
            this.$select.removeClass(this.options.classHide);
        },

        _searchItems: function (e) {
            var $search = $(e.currentTarget),
                searchValue = $search.val();

            if ($search.data('lastSearch') === searchValue) {
                return false;
            }
            $search.data('lastSearch', searchValue);

            this.$listItems.each2(function (i, $item) {
                var node = $item[0],
                    text = node.innerHTML;
                if (~text.search(new RegExp(searchValue, 'i'))) {
                    node.style.display = '';
                }
                else {
                    node.style.display = 'none';
                }
            })
        },

        /**
         * Рендерим items для селекта с помощью аякса
         * @returns {Object} this
         */
        _generateItemsWithAjax: function() {
            //Если запрос делается чаще чем в N период времени, то мы не делаем этот запрос
            if (IS_REQUEST_FORBIDDEN) IS_REQUEST_FORBIDDEN = clearTimeout(IS_REQUEST_FORBIDDEN);
            
            IS_REQUEST_FORBIDDEN = setTimeout($.proxy(this._sendRequest, this), this.options.ajax.delay);

            return this;
        },

        /**
         * Делаем запрос на сервер
         */
        _sendRequest: function() {
            var opts       = this.options.ajax,
                inputName  = this.$searchInput && this.$searchInput.attr('name'),
                inputValue = this.$searchInput && this.$searchInput.val();

            IS_REQUEST_FORBIDDEN = clearTimeout(IS_REQUEST_FORBIDDEN);

            //При поиске аяксом (когда пустой поиск), оставляем отменченные пункты
            if (!inputValue && this.isOpen) {
                this.getNotSelected().remove();
                this.isGenerateItems = false;
                this._generateItems();
                this._actualizeButtonText(true);
                return this;
            }

            this._showLoader();

            if (!opts.data) opts.data = {};
            if (inputName) opts.data[inputName] =  inputValue;

            opts.success = $.proxy(this._onAjaxSuccess, this);
            opts.error = $.proxy(this._onAjaxError, this);

            //Считаем запросы к серверу
            if (!this.requestCounter) this.requestCounter = 1;
            else ++this.requestCounter;

            $.ajax(opts);

            return this;
        },

        _onAjaxSuccess: function(result) {
            this.isGenerateItems = false;

            if (_isFunction(this.options.ajax.resFormat)) {
                result = this.options.ajax.resFormat(result);
            }

            this
                ._hideLoader()
                ._renderHiddenItems(result);

            if (this.isOpen) this._generateItems();
            else this.show();

            this._actualizeButtonText(true);
        },

        _onAjaxError: function(result) {
            console.warn('Connection error');
            this._hideLoader();
        },

        _showLoader: function() {
            this.$loaderContainer = this.isOpen ? this.$group : this.$button;

            this.$loaderContainer.addClass(this.options.classLoader);

            return this;
        },

        _hideLoader: function() {
            this.$loaderContainer.removeClass(this.options.classLoader);

            return this;
        },

        /**
         * Формируем имя item-a в нужном падеже
         * @param {Number} num
         */
         _nouns: function(num) {
            if (!this.options.plural) return false;

            var plural = this.options.plural.split(',');

            if (num === 1) return plural[0];
            if (num > 1 && num < 5) return plural[1];

            return plural[2] || plural[1];
        },

        /**
         * Рендерим option, для скрытого селекта, по масиву
         * @param {Array} items
         * @param {Object} opts
         * @param {Boolean} [opts.removeNonSelected=ture] Удалить не выбраные элементы
         * @returns {Object}
         */
        _renderHiddenItems: function(items, opts) {
            var self = this,
                defaultOpts = {
                    removeNonSelected : true,
                    removeAll: false
                },
                format = this.options.returnDetailsFormat,
                isOption, html, value, content, selected;

            $.extend(defaultOpts, opts || {});

            if (items && _isArray(items)) {
                html = '';

                items.forEach(function(item) {
                    value = item[format.optionValue];
                    content = item[format.optionContent];
                    selected = item[format.optionSelected];
  
                    isOption = self.$select.find('option[value="'+ value +'"]').length;

                    if (isOption) return true;

                    html += '<option value="'+ value +'"'+ (item.selected ? ' selected="selected"' : '') +'>'+ content +'</option>'
                });
            }

            if (defaultOpts.removeNonSelected && !defaultOpts.removeAll) {
                this.getNotSelected().remove();
            }

            if (defaultOpts.removeAll) {
                this.$select.empty();
            }
            
            if (html) this.$select.append(html);

            return this;
        },

        /**
         * Инициализация html
         * @private
         */
        _initHtml: function () {
            var options = this.options;
            this.$content = $(options.tmplContent).addClass(options.classForm);
            this.$button = this.$content
                .find('[role=button]')
                .addClass(options.classButton);

            this.$buttonText = this.$content
                .find('[role=link]')
                .addClass(options.classButtonText);
            this.$group = $(options.tmplGroup).addClass(options.classGroup);

            if (this.isMultiple) {
                this.$list = $(options.tmplListbox).addClass(options.classListbox);
            }
            else {
                this.$list = $(options.tmplList).addClass(options.classList);
            }

            this.$listItem = $(options.tmplListitem).addClass(options.classListitem);
            this.$listItems = $();

            if (this.options.tooltip) {
                this.$tooltip = $(options.tmplTooltip)
                    .addClass(options.classTooltip)
                    .html(this.options.tooltip);
                this.$group.append(this.$tooltip);
            }

            this.$group.append(this.$list);

            if (options.submitButton) {
                this.$submitBox = $(options.tmplSubmitBox).addClass(options.classSubmitBox);
                this.$submitButton = $(options.tmplSubmit).addClass(options.classSubmit);

                this.$submitBox
                    .append(this.$submitButton)
                    .appendTo(this.$group);
            }
        },

        /**
         * Генерация элементов списка
         * @returns {boolean}
         * @private
         */
        _generateItems: function () {
            if (this.isGenerateItems) {
                return true;
            }
            var options = this.options,
                $options = $(),
                $item = this.$listItem,
                domItem = $item[0],
                template,
                html = '',
                tmp = document.createElement('div'),

                $childs = this.$select.contents('option');

            tmp.appendChild(domItem);
            template = tmp.innerHTML;

            $childs.each2(function () {
                var text = this.innerHTML,
                    value = this.value,
                    itemHtml = template;

                if (!text) {
                    return true;
                }

                itemHtml = itemHtml.replace('%attrs%', ' data-value="' + value + '"');
                itemHtml = itemHtml.replace('%text%', text);

                html += itemHtml;
            });

            if ((options.search || (options.search === null && $childs.length > 10)) && !this.$searchInput) {
                this.$searchBox = $(options.tmplSearchBox).addClass(options.classSearchBox);
                this.$searchInput = $(options.tmplSearchInput)
                    .addClass(options.classSearchInput)
                    .attr('placeholder', options.placeholderSearch);

                this.$searchBox
                    .append(this.$searchInput)
                    .insertBefore(this.$list);
            }

            this.$listItems = $(html);
            this.$list.html(this.$listItems);

            this._actualizeListItems();
            this.isGenerateItems = true;
        },

        _fixSelect: function () {
            var $select = this.$select,
                $emptyOption = $select.find(':not([value])');
            if (!$emptyOption.length && !this.isMultiple) {
                $select.prepend('<option selected="selected"></option>');
            }
        },

        /**
         * Return disable state
         * @returns {*}
         * @private
         */
        _getDisabledState: function () {
            return this.isDisabled;
        }
    };

    $.fn[_NAME_] = function (option) {
        var argumentsArray = Array.prototype.slice.call(arguments, 1),
            result;

        this.each(function () {
            var $this = $(this),
                data = $this.data(),
                ctor = $this.data(_NAME_),
                options = $.extend({}, _Constructor.DEFAULTS, data, typeof option == 'object' && option);

            if (options.ajax) {
               options.ajax = $.extend({}, AJAX_DEFAULT, options.ajax);
            }

            if (!ctor) {
                $this.data(_NAME_, (ctor = new _Constructor(this, options)))
            }

            if (typeof option === 'string' && _isFunction(ctor[option])) {
                if (option.charAt(0) !== '_') {
                    result = ctor[option].apply(ctor, argumentsArray);
                }
                else {
                    console.warn(_NAME_, 'Do not use private methods!');
                }
            }

            if (!result) result = $this;
        });

        return result;
    };

    $.fn[_NAME_].Constructor = _Constructor;

    // polyfills
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (fn, scope) {
            for (var i = 0, len = this.length; i < len; ++i) {
                fn.call(scope, this[i], i, this);
            }
        }
    }

    if (typeof $.fn.each2 == "undefined") {
        $.extend($.fn, {
            each2: function (c) {
                var j = $([0]), i = -1, l = this.length;
                while (
                    ++i < l
                        && (j.context = j[0] = this[i])
                        && c.call(j[0], i, j) !== false //"this"=DOM, i=index, j=jQuery object
                    );
                return this;
            }
        });
    }

}(jQuery);
