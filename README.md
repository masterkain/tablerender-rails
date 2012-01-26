TableRender is a jQuery based plugin.

_How can I render a table with too much data?_

TableRender is a jQuery-based plugin that parses and creates more than 100.000 table rows just in time.

Given a JSON object, TableRender parses, renders, filters and sorts all data.

Methods:

  * `addRow`, `addRows`
  * `removeRow`, `removeRows`
  * `replaceRow`, `replaceRows`
  * `search`
  * `filter`
  * `sort`

Supported browsers:

  * Internet Explorer 6 (not tested)
  * Internet Explorer 7
  * Internet Explorer 8
  * Internet Explorer 9
  * Firefox
  * Google Chrome
  * Safari
  * Opera

Requirements:

  * jQuery 1.4.2 or later
  * IntroSort script (used while sorting)

Example

    $('#example').table({
      columns: [
        {
          key: 'title',
          label: 'Title'
        },{
          key: 'name',
          label: 'Name'
        },{
          key: 'surname',
          label: 'Surname'
        }
      ],
      rowHeight: 20,
      headHeight: 20,
      borderHeight: 0,
      sortable: false,
      selection: true,
      multiselection: true,
      canBeSorted: function(column){
        return column != 3
      }
    });

    var jsonData = [];
    for ( var i=0; i < 100000; i++ ) {
      jsonData.push({
        title: 'Title ' + i,
        name: 'Name ' + i,
        surname: 'Surname ' + i
      });
    }

    $('#example').table().data( jsonData );