(function ($) {
  var VERSION = "version 0.2b";
  /**
   * Initialization function
   *
   * @param obj the HTML element to wrap
   * @param opts the initial options
   * @return TableRender instance
   */
  window.TableRender = function(element, opts) {

    var obj = element;
    $(element).data("_tablerender", this);

    this.version = VERSION;

    // Get initial options correctly
    var options = $.extend(true, {
      // String:    table header stylesheet class
      headCss: '',

      // String:    table body stylesheet class
      bodyCss: '',

      rowCss: 'row',

      overflow: 'overflow-y: scroll',

      // This is the column key used as ID
      id_key: undefined,

      // Array:     columns list ( ie:  [ { key: 'key', label: 'label', hidden: false, id: true}, { key: 'key', label: 'label', hidden: true} ]   )
      columns: [],

      // int:       row height in pixel
      rowHeight: 20,

      // int:       header height
      headHeight: 20,

      // top position of the body
      bodyTopPosition: 0,

      // int:       row border in pixel ( used if border css setting is set )
      borderHeight: 0,

      // enables or disables the resize function
      allowResizeHeader: true,

      // boolean:   enabled or disable the column sort function
      sortable: false,

      // function:  used to customize the table header render
      columnRender: headRender,

      // Function that renders the entire header
      headerRender: undefined,

      // function:  used to customize the table rows render
      rowRender: _rowRender,

      // boolean:   enable or disable animations used on remove rows event.
      animate: false,

      // boolean:   enable or disable the row selection management
      selection: false,

      // boolean:   enable or disable the multiselection management ( used with  'selection = true' only )
      multiselection: false,

      // hash:      contains the sortable function,
      sort: {},

      // function:  enable or disable sortable function for a specified column
      canBeSorted: canBeSorted,

      // boolean:   force to empty table content on scroll
      empties: true,

      // int:       indicates how many rows to render before and after paging
      threshold: 15

    }, opts),

      // shortcut to 'this' instance
      self = this,

      $self = $(self); // shortcut to jQuery functions
    var
      // Table header wrapper that contains all columns and scrollbar placeholder
      header_container = $('<div class="table_header_container" style="position:absolute;top:0;left:0;right:0;height:' + options.headHeight + 'px;"></div>').appendTo(obj),
      // Table header that contains all columns
      head = $('<div class="table_head ' + options.headCss + '"></div>').appendTo(header_container),
      // Table body wrapper that contains the table rows container
      body_container = $('<div class="table_body_container" style="' + options.overflow + ';position:absolute;top:' + (options.bodyTopPosition || options.headHeight) + 'px;left:0;right:0;bottom:0;"></div>').appendTo(obj).bind('scroll', _scroll),
      // Table rows container
      body = $('<div class="table_body ' + options.bodyCss + '" style="position:relative;" ></div>').appendTo(body_container);




    var
      // True once header has been drawed
      _header_drawn = false,

      _waiting = false,

      // collection that contains all rows data
      _data = TAFFY(),

      // collection that contains all rows data currently filtered
      _currentData = _data,

      // collection that contains all rendered rows as HTML object
      _shownData = [],

      // collection that contains all selected rows index
      _selectedIndexes = [],

      // stores the sortable data
      _asc = [],

      // store scroll thread handle id
      _scrollTimer,

      // Stores the query text used to filter collection rows
      _queryText,

      // Stores the queryObject used to filter collection rows
      _queryObject,

      // true if table is currently sorted
      _sorted = false,

      // Current coordinates about viewport currenlty shown
      _oldViewPort = {
        from: 0,
        to: 0,
        height: 0
      },

      // Coordinates about new viewport to show
      _viewPort = {
        from: 0,
        to: 0,
        height: 0
      },
      // Collection of coloumns
      _columns = []; // HTML columns object collection


    /**
     * PUBLIC METHODS
     */


    this.option = function (name, value) {
      if (value === undefined || value === null) {
        return options[name];
      } else {
        options[name] = value;
      }
    };


    /**
     * Adds column at the specified index
     *
     * @param columnData is an Object containing the column data
     * @param index is an integer used as index of the column
     */
    this.addColumn = function (columnData, index) {
      index = typeof index == 'number' ? index : _columns.length;

      if ((index >= _columns.length) || (_columns[index] === undefined || _columns[index] === null)

      ) {
        // We are adding a column in an empty position.
        // So, we have to replace the existing undefined object with the new column data
        _columns[index] = columnData;

      } else {
        // Add a column into an already non-empty position.
        _columns.splice(index, 0, columnData);
      }

      if (_header_drawn) {
        // Redraw header
        this.drawHeader();
      }

      // TODO: do we have to redraw the body of the table?
      _refreshViewPort();

      $self.trigger('add_column', [columnData, index]);
    };


    /**
     * Removes column at the specified index or key
     * @param index is an  Integer or a 'key' of the column is being to be removed
     */
    this.removeColumn = function (index) {

      if (typeof index != 'number' && typeof index != 'string') {
        return false;
      }

      var col_index = -1;
      if (typeof index == 'number') {
        if (_columns[index]) {
          col_index = index;
        }
      } else {

        col_index = getColumnIndexByKey(index);

      }

      if (col_index == -1) {
        return false;
      }


      var col_data = _columns.splice(col_index, 1);

      if (_header_drawn) {
        // Redraw header
        this.drawHeader();
      }

      // TODO: do we have to redraw the body of the table?
      _refreshViewPort();

      $self.trigger('remove_column', [col_data, col_index]);

      return col_data;

    };



    this.drawHeader = function () {
      // Clear the header (remove all columns)
      head.html('');

      if ( options.headerRender && options.headerRender ){
        var new_head = options.headerRender( this.columns() );
        head.replaceWith( new_head );
        head = $(new_head);
      } else {
        var cols = this.columns();
        $.each( cols, function (i, item) {

          var element = $(options.columnRender(i, item, cols));

          if (element.length) {
            $(element).appendTo(head);
            if (options.sortable) {
              $(element).bind('click', function (e) {
                self.sort(i, true); // bind the sortable event
              });
            }
          }

        });
      }

      if ( ! options.id_key ) {
        var cols = this.columns();
        $.each( cols, function (i, item) {
          if ( item.id ) {
            options.id_key = item.key;
            // skip other cols
            return false;
          }
        });
        if ( ! options.id_key ) {
          options.id_key = cols[0].key;
        }
      }

      return (_header_drawn = true);
    };


    /**
     * Shows a columns at the specified index
     */
    this.showColumn = function (index) {
      showHideColumn(index, true);
    };

    /**
     * Hides a columns at the specified index
     */
    this.hideColumn = function (index) {
      showHideColumn(index, false);
    };


    this.columns = function (columns) {
      if ( typeof columns == 'object' ){
        _columns = columns;
        this.drawHeader();
        _refreshViewPort();
      }
      return $.map(_columns.slice(0), function (col, index) {
        if (col) {
          return col;
        }
      });
    };


    this.getDBData = function() {
      return TAFFY( _data().get() )();
    };

    this.getDBCurrentData = function() {
      return TAFFY( _currentData().get() )();
    };


    /**
     * Use this method to set new collection data.
     * If not arguments passed, this method returns the entire collection data
     */
    this.data = function (data) {
      if (data === undefined) return _data().get();

      _reset_data( data );

      $self.trigger('newData', [data]);
    };

    function _reset_data( data ) {
      self.clearSelection();
      _data = _currentData = TAFFY([]);

      _queryText = _queryObject = undefined;

      _data = TAFFY(data);

      showData( data );
    }


    function _reset_search_query() {
      self.clearSelection();
      _queryText = _queryObject = undefined;
      showData( _data().get() );
    }


    /**
     * This method returns current filtered data listed in table
     */
    this.currentShownData = function() {
      return _currentData().get();
    };

    /**
     * Returns the row data at the specified position
     */
    this.currentDataAt = function (index) {
      return _currentData().get()[index];
    };

    /**
     * Resizes the table
     */
    this.resize = function () {
      var _height = _currentData().count() * (options.rowHeight + options.borderHeight); // calculate maximum height
      body.css('height', _height); // set height to body
      newViewPort();

      if ( options.allowResizeHeader ){
        head.width(body.width()); // Set the table header width including scrollbar width fix
      }
      $self.trigger('layout'); // fire event
    };

    /**
     * Returns the HTML object representing the row at the specified position
     */
    this.rowAt = function (index) {
      index = originalIndexToCurrentIndex(index);

      var _row = _shownData[index];
      if (_row) {
        $(_row).css({
          'top': (index * (options.rowHeight + options.borderHeight)),
          'height': options.rowHeight
        });
      }

      return _row;
    };

    /**
     * Returns the data row object at the specified position
     */
    this.dataAt = function (index) {
      return _data().get()[index];
    };


    /**
     * Returns the data row object associated with given row.
     * Row is the HTML object
     */
    this.rowToData = function (row) {
      var index = this.rowToIndex(row);
      return _data().get()[index];
    };

    /**
     * Returns the index associated with given row.
     * Row is the HTML object
     */
    this.rowToIndex = function (row) {
      var index = $(row)[0].offsetTop / (options.rowHeight + options.borderHeight);
      return currentIndexToOriginalIndex(index);
    };

    /***************
     *  SELECTION
     ***************/


    /**
     * Marks the row at the specified index as selected
     */
    this.selectRow = function (index) {

      if (!options.selection) return;
      if (!options.multiselection) this.clearSelection();

      var
        currentIndex = originalIndexToCurrentIndex(index),
        viewPort = getViewPort();

      selectRow(currentIndex);
      if (currentIndex >= viewPort.from && currentIndex <= viewPort.to) {
        var row = this.rowAt(index);
        $self.trigger('rowSelection', [index, row, true, _currentData().get()[currentIndex]]);
      }
      return this;
    };


    /**
     * Marks the row at the specified index as unselected
     */
    this.unselectRow = function (index) {
      if (!options.selection) return;

      var
        row = this.rowAt(index);
        currentIndex = originalIndexToCurrentIndex(index);

      unselectRow(currentIndex);

      if (currentIndex >= viewPort.from && currentIndex <= viewPort.to) {
        // row = this.rowAt(index);
        $self.trigger('rowSelection', [index, row, false, _currentData().get()[currentIndex]]);
      }

      return this;
    };

    /**
     * Marks all row as unselected
     */
    this.clearSelection = function () {
      var
        indexes = selectedIndexes(),
        viewPort = getViewPort();
      _selectedIndexes = [];
      for (var i = indexes.length - 1; i >= 0; i--) {
        var index = indexes[i];
        if (index >= viewPort.from && index <= viewPort.to) {
          unselectRow(indexes[i]);
          var row = this.rowAt(index);
          $self.trigger('rowSelection', [index, row, false, _currentData().get()[index]]);
        }
      }
    };

    /**
     * Returns all selected row indexes
     */
    this.selectedIndexes = function () {
      var
        indexes = _selectedIndexes,
        result = [];
      for (var i = 0, l = indexes.length; i < l; i++) {
        result.push(currentIndexToOriginalIndex(indexes[i]));
      }
      return result;
    };


    /**
     * Returns all selected row data
     */
    this.selectedData = function () {
      var
        indexes = this.selectedIndexes(),
        result = [];
      for (var i = 0, l = indexes.length; i < l; i++)
      result.push(_data().get()[indexes[i]]);
      return result;
    };


    /**
     * Returns the last selcted row index
     */
    this.lastSelectedIndex = function () {
      return this.selectedIndexes()[_selectedIndexes.length - 1];
    };

    /**
     * Returns the last selected row data
     */
    this.lastSelectedData = function () {
      return _data().get()[this.lastSelectedIndex()];
    };


    /**
     * Scrolls to row at the specified index
     */
    this.goTo = function (index) {

      index = originalIndexToCurrentIndex(index);
      var
        // calculate row position
        pos = (index * (options.rowHeight + options.borderHeight)),
        // current scroll position
        scrollTop = body_container[0].scrollTop,
        _height = body_container[0].offsetHeight,
        viewPort = getViewPort();

      if ((pos >= scrollTop) && ((pos + options.rowHeight) <= (scrollTop + _height))) {
        // track already shown
      } else {
        if ((pos + options.rowHeight) > (scrollTop + _height)) {
          // row is positioned downside current viewport
          scrollTop = scrollTop + ((pos + options.rowHeight) - (scrollTop + _height));
        } else {
          // row is positioned upside current viewport
          scrollTop = pos;
        }
      }
      // set new scrollTop position
      body_container[0].scrollTop = parseInt(scrollTop, 10);

      var row = null;
      if (index >= viewPort.from && index <= viewPort.to) row = this.rowAt(index);

      $self.trigger('scrollTo', [index, row]); // fire event
      return row; // return row
    };

    /**************
     *  SORTABLE
     **************/

    /**
     * Sorts table by specified column
     * @param col integer value representing the column index
     * @param ignoreCase if true compares objects by case-insensitive mode
     */
    this.sort = function (col, ignoreCase) {
      var column = options.columns[col]; // get column data
      if (options.canBeSorted(column) === false) return this;

      var asc = true;
      if (_asc[0] == col) {
        asc = !_asc[1]; // get ascendent/descendent flag
      } //else {
      var _tmp_data = $.introSort(_currentData().get(), function (aRow, bRow) {
        var
          aDatum = aRow[column.key],
          bDatum = bRow[column.key];
        if (ignoreCase && (typeof aDatum == 'string')) {
          // transform into lower case if ignoreCase flag is true
          aDatum = aDatum.toLowerCase();
          bDatum = bDatum.toLowerCase();
        }
        if (options.sort[column.key] && options.sort[column.key].apply) {
          return options.sort[column.key](aRow, bRow, asc);
        } else {
          if ( asc ) {
            // return aDatum > bDatum ? 1 : ( aDatum < bDatum ? -1 : 0 );
            return aDatum < bDatum;
          } else {
            // return aDatum < bDatum ? 1 : ( aDatum > bDatum ? -1 : 0 );
            return aDatum > bDatum;
          }
        }
      }, function (datum1, index1, datum2, index2) {
        datum1._current_index = index1;
        datum2._current_index = index2;
      });

      _currentData = TAFFY( _tmp_data );

      if ( !isFiltered() && !isQueried() ) {
        // data has not been queried or filtered. We should change original data
        _data = TAFFY( _tmp_data );
      }

      // empties older selected rows
      _selectedIndexes = [];

      _asc = [col, asc];
      $self.trigger('columnSort', [col, column, _columns[col], asc, _columns]); // fire event
      var viewPort = getViewPort();
      newViewPort();
      removeOlderRows(viewPort.from, viewPort.to);
      _showData(true);

      return this;
    };

    /*****************
     *   FILTERING
     *****************/

    /**
     * Returns new filtered data objects
     */
    this.dataFilter = function (query) {
      return filter(query, this.data() ).data;
    };

    /**
     * Returns new filtered data indexes
     */
    this.indexesFilter = function (query) {
      return filter(query, this.data() ).indexes;
    };


    this.isShown = function(item) {
      var filter = {};
      filter[ options.id_key ] = item[ options.id_key ];
      return _currentData( filter ).get().length > 0;
    };


    this.isFiltered = isFiltered;
    this.isQueried = isQueried;

    /**
     * Searches given text in the collection
     * Returns new data collection length
     */
    this.search = function (text) {
      if (text === undefined || text === null) text = '';
      text = $.trim("" + text);
      _queryText = text;

      if (!text) {
        if ( isQueried() ) {
          self.clearSelection();
          _queryText = undefined;
          var d = _query( _queryObject, _data().get(), true);
          return showData( d );
        } else {
          return _reset_search_query();
        }
      }

      // we can search on a queried list
      // _queryObject = undefined;

      this.clearSelection();

      var result = filter(text, _data().get(), true);

      showData(result.data);

      $self.trigger('searched', [result.data, text]); // fire event

      return result.data.length;
    };


    this.query = function(queryObject) {

      if ( queryObject == undefined || queryObject == null ) {
        return _reset_search_query();
      }

      _queryText = undefined;
      this.clearSelection();

      _queryObject = queryObject;

      var data = _query( queryObject, _data().get(), true );
      showData( data );

      $self.trigger('queried', [data, queryObject]); // fire event

      return data.length;
    };


    /*******************
     *    UTILITY
     *******************/

    /**
     * Converts given index into current index shown
     */
    this.originalIndexToCurrentIndex = function (index) {
      return originalIndexToCurrentIndex(index);
    };

    /**
     * Returns given index into global index
     */
    this.currentIndexToOriginalIndex = function (index) {
      return currentIndexToOriginalIndex(index);
    };

    /********************
     *   MANIPULATION
     *******************/

    /**
     * Adds single row to collection at the specified position
     */
    this.addRow = function (position, row) {
      return this.addRows.apply(this, arguments);
    };

    /**
     * Adds more than one row to colelction at the specified position
     * @param position integer representing the position which add new rows to
     * @param Object... new rows data
     */
    this.addRows = function (position /*, rows ... */ ) {
      var rows = Array.prototype.slice.call(arguments, 0);
      var _tmp_data = _data().get();

      if (isNaN(position)) {
        position = _tmp_data.length;
      } else {
        rows.splice(0, 1);
      }

      args = rows.slice(0);

      /*
       * Building args
       * It should be:  [ position, 0, rows... ]
       */

      args.splice(0, 0, position, 0);

      /*
       * Add new row to collection
       * It should be:  _data.splice( position, 0, rows... )
       */

      Array.prototype.splice.apply( _tmp_data, args );

      _data = TAFFY( _tmp_data );


      var positionToRedraw = position;
      if ( isFiltered() || isQueried() ) {
        var _tmp_current_data = _currentData().get();
        positionToRedraw = _tmp_current_data.length;
        var result = isFiltered() ? filter(_queryText, rows).data : _query( _queryObject, rows);

        for (var i = 0, l = result.length; i < l; i++) {
          result[i]._original_index = position + i;
          result[i]._current_index = _tmp_current_data.push( result[i] ) - 1;
        }
        _currentData = TAFFY( _tmp_current_data );

      } else {

        // Table is not filtered, so we should recalculare the currentData pointing to all data
        // this fixes a render problem
        _currentData = TAFFY( _tmp_data );
      }

      var viewPort = getViewPort();

      this.resize();

      if (positionToRedraw >= viewPort.from && positionToRedraw <= viewPort.to) {
        removeOlderRows(viewPort.from, viewPort.to);
        _showData(true);
      }

      $self.trigger('newRows', [position, rows]);

      return this;
    };

    /**
     * Removes single row from collection at the specified postion
     */
    this.removeRow = function (position) {
      return this.removeRows.apply(this, arguments);
    };

    /**
     * Removes more than one row from collection
     * @param Integer... all position to remove
     */
    this.removeRows = function ( /*position ... */ ) {

      var
        indexes = Array.prototype.slice.call(arguments, 0),
        removedRows = [],
        viewPort = getViewPort(),
        redraw = false;

      // Sort indexes from greater to lesser
      indexes = unique(indexes).sort(function (a, b) {
        return a < b;
      });

      var _tmp_data = _data().get();
      for (var i = 0, j = 0, l = indexes.length, b, c, num = 1; i < l; i++) {
        b = indexes[i];
        c = indexes[i + 1];

        $self.trigger('removeData', [b, _tmp_data[b]]); // fire event on single row
        redraw = (b >= viewPort.from && b <= viewPort.to);

        unselectRowOnRemoveRow(b);

        // calculate sequential indexes
        if ((b - 1) == c) {
          num++;
          continue;
        }

        var removed = Array.prototype.splice.apply(_tmp_data, [indexes[j + (num - 1)], num]);
        removedRows = removedRows.concat(removed);

        j = i + 1;
        num = 1;
      }

      _data = TAFFY( _tmp_data );

      if (removedRows.length > 0 && (isFiltered() || isQueried()) ) {
        var result = isFiltered() ? filter(_queryText, removedRows).data : _query( _queryObject, removedRows);
        if (result.length) {
          var _tmp_current_data = _currentData().get();
          for (var i = result.length - 1; i >= 0; i--) {
            var datum = result[i];
            if (datum._current_index === undefined) continue;
            Array.prototype.splice.apply(_tmp_current_data, [datum._current_index, 1]);

            redraw = redraw || (datum._current_index >= viewPort.from && datum._current_index <= viewPort.to);
          }
          _currentData = TAFFY( _tmp_current_data );
        } else {
          redraw = false;
        }
      } else if ( removedRows.length > 0 ) {
        // Table has not been filtered, so we should reset currentData pointing to all data
        // this fixes a render problem
        _currentData = TAFFY( _tmp_data );
      }

      if (redraw) {
        this.resize();

        removeOlderRows(viewPort.from, viewPort.to);
        _showData(true);
      }

      return this;
    };

    /**
     * Replaces single row at the specified position with new given row data
     */
    this.replaceRow = function (position, row) {
      return this.replaceRows.apply(this, [
        [position, row]
      ]);
    };

    /**
     * Replaces more than one row from collection a the specified position
     * @param Array... a grouped 'position, row' for each row you want to replace
     */
    this.replaceRows = function ( /* [position, row] ... */ ) {

      var
        args = Array.prototype.slice.call(arguments, 0),
        redraw = false,
        viewPort = getViewPort(),
        _tmp_data = _data().get(),
        _tmp_current_data = _currentData().get();


      for (var i_arg = 0, l_arg = args.length; i_arg < l_arg; i_arg++) {
        var
          arg = args[i_arg],
          position = arg[0],
          row = arg[1],
          index = position;

        $self.trigger('replaceData', [position, _tmp_data[position], row]);

        redraw = redraw || (index >= viewPort.from && index <= viewPort.to);

        var removedRow = Array.prototype.splice.apply(_tmp_data, [index, 1, row]);

        index = ! ( isFiltered() || isQueried() ) ? index : (function() {
          var result = isFiltered() ? filter(_queryText, [removedRow[0]]).data : _query( _queryObject, [removedRow[0]]);
          if ( result.length ) {
              return removedRow[0]._current_index;
           } else {
              return undefined;
           }
        })();

        if (index !== undefined && ( isFiltered() || isQueried() ) ) {

          /*
            if (filter(_queryText, [row]).data.length) {
              row._original_index = position;
              row._current_index = index;
              Array.prototype.splice.apply(_currentData, [index, 1, row]);
            } else {
           */
          Array.prototype.splice.apply(_tmp_current_data, [index, 1, row]);

          // Restore index correctly
          row._current_index = removedRow[0]._current_index;
          row._original_index = removedRow[0]._original_index;
          //}
          redraw = redraw || (index >= viewPort.from && index <= viewPort.to);

        } else if ( index !== undefined ) {
          // table has not been filtered. we should replace the currentData containing the replaced row
          // this fixes a render problem
          Array.prototype.splice.apply(_tmp_current_data, [index, 1, row]);
        }
      }

      _data = TAFFY( _tmp_data );
      _currentData = TAFFY( _tmp_current_data );

      if (redraw) {
        this.resize();
        removeOlderRows(viewPort.from, viewPort.to);
        _showData(true);
      }

      return this;
    };



    /**
     * EVENTS
     */


    /**
     * Adds event to each row
     */
    this.addRowsEvent = function (type, fn) {
      body.delegate('div.' + options.rowCss, type, fn);
      return self;
    };

    /**
     * Adds event to TableRender object
     */
    this.addTableEvent = function (type, fn) {
      $self.bind(type, fn);
      return self;
    };

    /**
     * Removes event from table object
     */
    this.removeTableEvent = function (type, fn) {
      $self.unbind(type, fn);
      return self;
    };

    /**
     * Removes event from table rows
     */
    this.removeRowsEvent = function (type, fn) {
      body.undelegate('div.' + options.rowCss, type, fn);
      return self;
    };



    /********************
     * PRIVATE METHODS
     ********************/


    function getColumnIndexByKey(key) {
      var index = -1;
      $.each(_columns, function (i, item) {
        if (item.key == key) {
          index = i;
          return false;
        }
      });
      return index;
    }


    /**
     * Shows or hides a column at the specified index
     */
    function showHideColumn(index, show) {

      if (typeof index != 'number' && typeof index != 'string') {
        return false;
      }

      var col_index = -1;
      if (typeof index == 'number') {
        if (_columns[index]) {
          col_index = index;
        }
      } else {

        col_index = getColumnIndexByKey(index);

      }

      if (col_index == -1) {
        return false;
      }

      _columns[col_index].hidden = !show;

      if (_header_drawn) {
        // Redraw header
        self.drawHeader();
      }

      // TODO: do we have to redraw the body of the table?
      _refreshViewPort();


      $self.trigger(((show ? 'show' : 'hide') + '_column'), [_columns[col_index], col_index]);
      return true;
    }


    /*****************
     *   FILTERING
     *****************/

    /**
     * Filters data collection
     * @param query String used to filter data
     * @param data Array the collection to filter
     * @param attachIndex boolean if true new indexes will be attached to each object
     */
    function filter(query, data, attachIndex) {

      query = ("" + query).toLowerCase();
      var result = {
        indexes: [],
        data: []
      };

      for (var i = 0, l = data.length; i < l; i++) {
        var found = false;
        if (attachIndex) {
          data[i]._original_index = i; // store original index
        }
        for (var c = 0, lc = _columns.length; c < lc; c++) {
          var str = data[i][ _columns[c].key ];
          if (("" + str).toLowerCase().indexOf(query) != -1) {
            found = true;
            break;
          }
        }

        if ( found ) {

          if ( isQueried() ) {
            var r = _query( _queryObject, [data[i]], false );
            found = r.length > 0;
          }

          if ( found ) {
            result.indexes.push(i);
            var currentIndex = result.data.push( data[i] );

            if (attachIndex) {
              data[i]._current_index = (currentIndex - 1);
            }
          }
        }

        if ( !found && attachIndex ) {
          data[i]._current_index = i;
        }

      }

      return result;
    }



    function _query(queryObject, data, attachIndex) {
      var result = [];
      var keys = Object.keys(queryObject);
      for( var i = 0, l = data.length; i < l; i++ ) {
        var datum = data[ i ];

        // set original_index to single datum
        attachIndex && (datum._original_index = i);

        var match = 0;

        for ( var ki = 0; ki < keys.length; ki++ ) {
          var k = keys[ ki ];
          var v = queryObject[ k ];
          var colValue = datum[ k ];
          if ( $.isArray( v ) ) {
            for( var j = 0; j < v.length; j ++ ){
              var single_col_value = v[j];
              if ( single_col_value.toLowerCase() == colValue.toLowerCase() ) {
                match++;
                break;
              }
            }
          } else {
            if ( v.toLowerCase() == colValue.toLowerCase() ) {
              match++;
            }
          }
        }
        if ( match ==  keys.length ) {
          var currentIndex = result.push( datum );
          attachIndex && ( datum._current_index = (currentIndex - 1) );
        } else if ( attachIndex ) {
          datum._current_index = i;
        }
      }
      return result
    }


    /******************
     *    SELECTION
     ******************/

    /**
     * Marks row as selected intercepting row events
     */
    function rowSelection(e) {
      var
        // get current HTML row object
        currentRow = this,
        // get current HTML row index
        index = currentRow.offsetTop / (options.rowHeight + options.borderHeight);

      if (!options.multiselection) {
        // mark all other selected row as unselected
        self.clearSelection();
      }


      if (!(e.shiftKey || e.metaKey || e.ctrlKey)) {
        // clear selected row
        self.clearSelection();
      }

      var _tmp_current_data = _currentData().get();

      if (e.shiftKey && options.multiselection) {
        // Shift is pressed
        var
          _lastSelectedIndex = lastSelectedIndex(),
          // get last selected index
          from = Math.min(_lastSelectedIndex + 1, index),
          to = Math.max(_lastSelectedIndex, index),
          viewPort = getViewPort();

        // select all rows between interval
        for (var i = from; i <= to && _tmp_current_data[i]; i++) {
          if ($.inArray(i, selectedIndexes()) == -1) {
            selectRow(i);
            if (i >= viewPort.from && i <= viewPort.to) {
              var row = self.rowAt(i);
              $self.trigger('rowSelection', [i, row, true, _tmp_current_data[i]]);
            }
          }
        }

      } else if (e.ctrlKey || e.metaKey) { /* Ctrl is pressed ( CTRL on Mac is identified by metaKey property ) */

        // toggle selection
        if ($.inArray(index, selectedIndexes()) > -1) {
          unselectRow(index);
          $self.trigger('rowSelection', [index, this, false, _tmp_current_data[index]]);
        } else {
          selectRow(index);
          $self.trigger('rowSelection', [index, this, true, _tmp_current_data[index]]);
        }

      } else {
        // simple click
        selectRow(index);
        $self.trigger('rowSelection', [index, this, true, _tmp_current_data[index]]);
      }

    }

    /**
     * Returns all selected indexes
     */
    function selectedIndexes() {
      return _selectedIndexes;
    }

    /**
     * Returns last selected index
     */
    function lastSelectedIndex() {
      return selectedIndexes()[selectedIndexes().length - 1];
    }

    /**
     * Adds the specified row index to selected row indexes collection
     */
    function selectRow(index) {
      if (index === undefined || index < 0 || index >= _currentData().count() ) return;
      selectedIndexes().push(index);
    }

    /**
     * Remove the specified row index from selected row indexes collection
     */
    function unselectRow(index) {
      if (index === undefined || index < 0 || index >= _currentData().count() ) return;

      var pos = $.inArray(index, selectedIndexes());
      if (pos == -1) return;

      selectedIndexes().splice(pos, 1);
    }

    /*************************
     *    MANIPULATING
     *************************/

    /**
     * Marks the row at the given position as unselect and fires the correct event
     */
    function unselectRowOnRemoveRow(index) {
      var pos = $.inArray(index, self.selectedIndexes());
      var _tmp_data = _data().get();
      if (pos != -1) {
        if (isFiltered()) {
          var result = filter(_queryText, [ _tmp_data[index] ] );
          if (result.data.length) {
            var datum = result.data[0];
            if (datum._current_index !== undefined) {
              unselectRow(datum._current_index);
              var row = self.rowAt(datum._current_index);
              $self.trigger('rowSelection', [index, row, false, _currentData().get()[datum._current_index]]);
            }
          }
        } else {
          unselectRow(index);
          var row = self.rowAt(index);
          $self.trigger('rowSelection', [index, row, false, _currentData().get()[index]]);
        }
      }

      var currentIndex = !isFiltered() ? index : (function () {
        var datum = _tmp_data[index];
        if (filter(_queryText, [datum]).data.length) return datum._current_index;
        else return undefined;
      })();

      if (currentIndex === undefined) return;

      /** Replace current selected indexes */
      var indexes = unique(selectedIndexes()).sort(function (a, b) {
        return a > b;
      });
      _selectedIndexes = [];
      for (var i = 0; i < indexes.length; i++) {
        _selectedIndexes.push(currentIndex > indexes[i] ? indexes[i] : (indexes[i] - 1));
      }

    }

    /********************
     *     UTILITY
     ********************/

    /**
     * Returns the global index by given current index
     */
    function currentIndexToOriginalIndex(index) {
      if ( !isFiltered() && !isQueried() ) return index;
      var datum = _currentData().get()[index];
      if (datum._original_index === undefined) return index;
      return datum._original_index;
    }

    /**
     * Returns the current index by given global index
     */
    function originalIndexToCurrentIndex(index) {
      if ( !isFiltered() && !isQueried() ) return index;
      var datum = _data().get()[index];
      if (datum._current_index === undefined) return index;
      return datum._current_index;
    }

    /**
     * Returns true if shown data is filtered
     */
    function isFiltered() {
      return (_queryText !== undefined && _queryText.length);
    }

    /**
     * Returns true if shown data has been filtered by query
     */
    function isQueried() {
      return (_queryObject !== undefined && _queryObject);
    }

    /**
     * Prevent bug:
     * jQuery.unique doesn't work fine with array of integers
     */
    function unique(array) {
      var result = [];
      for (var i = 0, n = array.length; i < n; i++) {
        var found = false;
        for (var x = i + 1; x < n; x++) {
          if (array[x] == array[i]) {
            found = true;
            break;
          }
        }
        if (found) continue;
        result.push(array[i]);
      }
      return result;
    }

    /*******************
     *    LAYOUT
     *******************/

    /**
     * Resets all viewport coordinates
     */
    function resetViewPorts() {
      _oldViewPort = {
        from: -1,
        to: -1,
        height: 0
      };
      _viewPort = {
        from: 0,
        to: 0,
        height: 0
      };
    }

    /**
     * Returns new viewport coordinates
     */
    function newViewPort() {
      _oldViewPort = _viewPort;
      return (_viewPort = getViewPort());
    }

    /**
     * Calculates the viewport coordinates
     */
    function getViewPort() {
      var
      scrollTop = body_container[0].scrollTop,
        bodyHeight = body_container[0].offsetHeight,
        // calculate the start index
        from = parseInt(scrollTop / (options.rowHeight + options.borderHeight), 10),
        // calculate the end index
        to = from + parseInt((body_container[0].offsetHeight / (options.rowHeight + options.borderHeight)) * 1.5, 10);
      return {
        from: Math.max(from - options.threshold, 0),
        to: to + options.threshold,
        height: from + to
      };
    }

    /**********************
     *    RENDERING
     **********************/

    /**
     * Manages the scroll event
     */
    function _scroll(e) {
      if (_scrollTimer) {
        clearTimeout(_scrollTimer);
      }
      _scrollTimer = setTimeout(function () {
        if (_waiting) return;
        var scrollTop = body_container[0].scrollTop;
        newViewPort();
        _showData();
        $self.trigger('scroll', [scrollTop, body[0].offsetHeight, body_container[0].offsetHeight]); // fire event
      }, 1);
      e.preventDefault(); // prevent default function
      return false; // stop event
    }

    /**
     * Prepares table to add data
     */
    function showData(data) {

      _waiting = true;

      _currentData = TAFFY(data);
      _shownData = new Array(data.length);

      body_container[0].scrollTop = 0;

      body[0].innerHTML = '';

      body.addClass('loading');

      self.resize();

      resetViewPorts();
      newViewPort();

      //setTimeout(function() {
      _showData();
      _waiting = false;
      //}, 1000);
      body.removeClass('loading');
    }



    function _refreshViewPort(){
      var
        from = _viewPort.from,
        to = _viewPort.to,
        total = to - from;

      Array.prototype.splice.call( _shownData, [ from, total ].concat( new Array(total) ) );
      body[0].innerHTML = '';
      renderTable(from, to);
    }

    /**
     * Renders table showing data
     * @param skipRemove if true older rows will be kept in table
     */
    function _showData(skipRemove) {
      var x1 = _oldViewPort.from,
        x2 = _oldViewPort.to,
        y1 = _viewPort.from,
        y2 = _viewPort.to,
        from = y1,
        to = y2,
        removeFrom, removeTo;

      if (y1 > x1 && y1 < x2) {
        from = x2;
        to = Math.max(to, x2);
        removeFrom = x1;
        removeTo = y1 - 1;
      } else if (y2 > x1 && y2 < x2) {
        removeFrom = to + 1;
        removeTo = x2;
        to = Math.min(to, x1);
      } else if ((y1 > x2 || y2 < x1) && (x1 != -1 && x2 != -1)) {
        removeFrom = x1;
        removeTo = x2;
      }

      renderTable(from, to);

      if (!options.empties || skipRemove) return;

      removeOlderRows(removeFrom, removeTo);
    }

    /**
     * Removes rows that are no longer shown
     */
    function removeOlderRows(from, to) {
      for (var i = from; i <= to; i++) {
        if (_shownData[i] === undefined) continue;
        _shownData[i].parentNode.removeChild(_shownData[i]);
        _shownData[i] = undefined;
      }
    }

    /**
     * Builds table
     */
    function renderTable(from, to) {
      var _tmp_data = _currentData().get();
      for (var i = from; i <= to && _tmp_data[i]; i++) {
        var row = (_shownData[i] === undefined) ? renderRow(i) : redrawRow(i);

        if (row && (!row.parentNode || row.parentNode !== body[0])) {
          var older_row = _shownData[i];

          if ( older_row && (older_row.parentNode === body[0]) ){
            // Row has been already injected to body. Replace child with the new one
            body[0].replaceChild(row, older_row);
          } else {
            body[0].appendChild(row);
          }
          _shownData[i] = row;
        }
        // (function (_row, _index) {
        //   return setTimeout(function () {
        //     if ($.inArray(_index, _selectedIndexes) > -1) {
        //       $self.trigger('rowSelection', [_index, _row, true, _currentData[_index]]);
        //     }
        //   }, 1);
        // })(row, i);
      }
    }


    /**
     * Build single row
     */
    function renderRow(index) {
      if (!_currentData().get()[index]) return null;

      var
        datum = _currentData().get()[index],

      row = $(options.rowRender(datum, self.columns(), index, $.inArray(index, _selectedIndexes) > -1))[0];

      $(row).css({
        'top': (index * (options.rowHeight + options.borderHeight)),
        'height': options.rowHeight
      }).data("tablerender-id", datum.___id);

      return row;
    }


    /**
     * Draw row at the specified position
     */
    function redrawRow(index) {
      var row;
      if ((row = _shownData[index]) === undefined)
        return; // no row to redraw was found
      var newTop = (index * (options.rowHeight + options.borderHeight)); // calculate new row position
      if (row.offsetTop != newTop) {
        if (options.animate) {
          $(row).animate({
            top: newTop
          });
        } else {
          row.style.top = newTop + 'px'; // set new position ( faster than jQuery function )
        }
      }
      return row;
    }

    /**
     * Renders single row
     * This method can be overwritten using 'options.rowRender'
     */
    function _rowRender(datum, columns, index, selected) {
      // Faster than jQuery functions

      var row = document.createElement('div');
      row.id = "row_" + index;

      var cols = columns;
      $.each(cols, function(i, col){
        var el = document.createElement('div');
        el.id = "row_" + index + "_column_" + col.key;
        el.innerHTML = datum[ col.key ];
        $(el).addClass("column col_" + i);
        if ( col.hidden ){
          $(el).addClass('column_hidden');
        }
        $(row).append( el );
      });

      if (row) {
        $(row).attr('style', "position:absolute;left:0px;right:0px;").addClass(options.rowCss);
        if ( selected ){
          $(row).addClass("selected");
        }
      }
      return $(row); // browser compatibility; return a jQuery object
    }

    /**
     * Renders the table header
     * This method can be overwritten using 'options.rowRender'
     */
    function headRender(index, columnData, columns) {
      var el = $('<div style="float:left;" class="column col_' + index + ' col_' + columnData.key + '" >' + columnData.label + '</div>');
      if (columnData.hidden) {
        el.addClass('column_hidden');
      } else {
        el.removeClass('column_hidden');
      }
      return el;
    }

    /**
     * Returns true if column can be sorted
     * This method can be overwritten using 'options.rowRender'
     */
    function canBeSorted() {
      return true;
    }





    $(options.columns).each(function (i, col) {
      // add column
      self.addColumn(col, i);
    });

    if (options.selection) {
      // bind the selection event
      body.delegate('div.' + options.rowCss, 'click', rowSelection);
    }


    this.drawHeader();

  }

  /**
   * Attachs TableRender functions to matched HTML object
   * @param {Object} opt
   */
  $.fn.tablerender = function (opt) {
    var _arguments = Array.prototype.slice.call(arguments, 0);
    var element = this[0];
    var klass = $(element).data("_tablerender");
    if (!klass) {
      klass = new TableRender(element, typeof opt == 'object' ? opt : {});
    } else {
      var
      action = _arguments[0],
        args = _arguments.slice(1);

      if (klass[action] && klass[action].apply) {
        return klass[action].apply(klass, args);
      } else {
        return null;
      }
    }
    return this;
  };


  if (!$.introSort) {
    if (console) {
      console.warn("No $.introSort function found");
    }
  }
})(jQuery);