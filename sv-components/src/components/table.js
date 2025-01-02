import { IEventAggregator, resolve, customElement, bindable } from 'aurelia';
//import { Handsontable } from 'handsontable';
import Handsontable from "handsontable";
//import handsontablecss from 'handsontable/dist/handsontable.full.css';

@customElement('sv-table')
export class Table {
  ea /* IEventAggregator*/ = resolve(IEventAggregator);
  mytable;
  hot;
  @bindable datachannel;
  @bindable tabid; //
  @bindable datatype = 'all'; //nodes,edges,all (default: all)
  showtable = true; //triggers showing/hiding table in view

  attached() {
    //default data
    //TODO read it from URL param
    let data = [
      ['Gene', 'Type', 'CEA', 'CA19_9', 'Tumor Size', 'Metabolic Activity', 'ctDNA', 'CRP', 'Bowel MovementPatterns',
        'Ki-67', 'Cascpase-3', 'MMP-1', 'Cell Proliferation'
      ],
      ["APC", "Tumor suppressor gene", 0.8, 0.3, 0.9, 0.7, 0.6, 0.2, 0.1, 0.9, -0.6, -0.7, 0.9],
      ["KRAS", "Kirsten Rat Sarcoma Viral Oncogene Homolog", 0.7, 0.4, 0.8, 0.6, 0.5, 0.3, 0, 0.8, -0.5, 0.2, 0.8],
      ["TP53", "Tumor Protein 53", 0.6, 0.2, 0.7, 0.5, 0.4, 0.4, 0.1, 0.7, 0.9, -0.4, 0.7],
      ["MLH1", "Mismatch Repair gene", 0.5, 0.3, 0.6, 0.4, 0.7, 0.5, 0.2, 0.6, 0.7, -0.3, 0.6],
      ["MSH2", "Mismatch Repair gene", 0.5, 0.3, 0.6, 0.4, 0.7, 0.5, 0.2, 0.6, 0.7, -0.3, 0.6],
      ["BRAF", "Oncogene MAPK/ERK signaling pathway", 0.4, 0.5, 0.5, 0.8, 0.3, 0.3, 0, 0.5, -0.2, 0.5, 0.5],
      ["SMAD4", "Tumor suppressor gene", 0.3, 0.2, 0.4, 0.3, 0.2, 0.4, 0.1, 0.4, 0.6, -0.5, 0.4],
      ["PIK3CA", "Oncogene", 0.6, 0.4, 0.7, 0.6, 0.5, 0.3, 0, 0.7, -0.4, 0.3, 0.7],
      ["NRAS", "Oncogene", 0.4, 0.3, 0.5, 0.5, 0.4, 0.2, 0.1, 0.5, -0.3, 0.2, 0.5],
      ["CTNNB1", "Cell adhesion signaling pathway", 0.3, 0.2, 0.4, 0.3, 0.3, 0.1, 0, 0.4, -0.2, -0.1, 0.4],
      ["FBXW7", "Tumor suppressor gene", 0.2, 0.1, 0.3, 0.2, 0.2, 0.3, 0.1, 0.3, 0.5, -0.4, 0.3]
    ];

    if (this.datatype == 'nodes') {
      data = this.getNodesData(data);

    } else if (this.datatype == 'edges') {
      data = this.getEdgesData(data);

    }
    //let container = document.getElementById('example');
    //this.hot = new Handsontable(container, {
    let that = this;
    this.hot = new Handsontable(this.mytable, {
      data: data,
      rowHeaders: true,
      colHeaders: true,
      autoWrapRow: true,
      autoWrapCol: true,
      licenseKey: 'non-commercial-and-evaluation', // for non-commercial use only
      // Define the afterChange hook
      afterChange: function (changes, source) {
        // Prevent triggering during initial data load
        if (source === 'loadData' || !changes) return;
        //this.layout.stop()
        // Iterate over each change and call changeContent()
        changes.forEach(([row, prop, oldValue, newValue]) => {
          // Optional: Pass relevant details to changeContent
          that.changeContent(row, prop, oldValue, newValue);
        });
        //this.layout.start()
      }
    });
    //register to resize table if tab is showed up
    this.ea.subscribe('showtab', (showtabid) => {
      if (this.tabid === showtabid) {
        console.log('Table refresh dimension for ', showtabid);
        this.hot.refreshDimensions();
        this.hot.render();
      }
    })
    //
    // Add a hook to detect 'Insert' key presses
    this.hot.addHook('beforeKeyDown', (event) => {
      // Key code 45 = 'Insert'
      if (event.keyCode === 45 && !event.shiftKey) {
        // Insert row
        event.preventDefault();
        // Optional: find the currently selected row to insert after
        //const [startRow] = this.hot.getSelectedLast() || [0];
        //this.hot.alter('insert_row', startRow + 1);
        let promptquestion = 'node name';
        this.addRow();
      } else if (event.keyCode === 45 && event.shiftKey) {
        // Shift + Insert -> Insert column
        event.preventDefault();
        // Optional: find the currently selected column to insert after
        this.addColumn();
      }
    });
  }

  changeContent(row, prop, oldValue, newValue) {
    //do manipulation if the datatype is all
    if (this.datatype === 'all') {
      console.log(`Cell at row ${row}, column ${prop} changed from "${oldValue}" to "${newValue}".`);
      if (row == 0) {
        //change Object
        this.ea.publish(this.datachannel, { 'type': 'changeNode', 'old': oldValue, 'value': newValue })
      } else {
        if (prop == 0) {
          //change Subject
          this.ea.publish(this.datachannel, { 'type': 'changeNode', 'old': oldValue, 'value': newValue })
        } else if (prop == 1) {
          //change Subject type  
          const nodeName = this.hot.getDataAtCell(row, 0);
          this.ea.publish(this.datachannel, { 'type': 'changeType', 'node': nodeName, 'old': oldValue, 'value': newValue })
        } else {
          //change relationship
          const subjectName = this.hot.getDataAtCell(row, 0);
          const objectName = this.hot.getDataAtCell(0, prop);
          this.ea.publish(this.datachannel, { 'type': 'changeEdge', 'subject': subjectName, 'object': objectName, 'old': oldValue, 'value': newValue })
        }
      }
    } else if (this.datatype ==='nodes') {
      console.log(`Add node.Cell at row ${row}, column ${prop} changed from "${oldValue}" to "${newValue}".`);
        //add node
        if (prop == 0 || oldvalue) {
          console.log('publishing')
          this.ea.publish(this.datachannel, { 'type': 'changeNode', 'old': oldValue, 'value': newValue })
        }
    } else if (this.datatype ==='edges') {
      console.log(`Add edge.Cell at row ${row}, column ${prop} changed from "${oldValue}" to "${newValue}".`);
        //add edge 
        if (prop == 1 || oldvalue){
          const subjectName = this.hot.getDataAtCell(row, 0);
          const objectName = this.hot.getDataAtCell(row, prop);
          this.ea.publish(this.datachannel, { 'type': 'changeEdge', 'subject': subjectName, 'object': objectName, 'old': oldValue, 'value': newValue })
        }
    }

  }

  submit() {
    let mydata = this.hot.getData();
    console.log('submit data:', mydata);
    this.ea.publish(this.datachannel, mydata)
  }
  showHide() {
    this.showtable = !this.showtable;
  }

  addRow(promptquestion = 'Subject name') {
    let rawname = prompt(promptquestion, '');
    if (rawname) {
      let items = rawname.split(',');
      const newRowIndex = this.hot.countRows()
      this.hot.alter('insert_row_below', newRowIndex)
      this.hot.setDataAtCell(newRowIndex, 0, items[0]);
      this.hot.setDataAtCell(newRowIndex, 1, items.length>1?items[1]:'');
      this.hot.selectCell(newRowIndex, 0);
    }
  }
  addColumn(promptquestion = 'Object name') {
    let name = prompt(promptquestion, '');
    if (name) {
      // 1. Determine the index where the new column will be inserted (end of the table)
      const newColIndex = this.hot.countCols();

      // 2. Insert the new column at the determined index
      this.hot.alter('insert_col_end', newColIndex);

      // 3. Set the value of the first cell (row index 0) in the new column to 'name'
      this.hot.setDataAtCell(0, newColIndex, name);

      // Optional: If you want to focus on the newly added cell
      this.hot.selectCell(0, newColIndex);
    }
  }

  switchTo1Table() {

  }
  switchTo2Table() {

  }
  getNodesData(mydata) {
    let nodes = [];
    //go through all rows
    for (let i = 1; i < mydata.length; i++) {
      let item = [mydata[i][0], mydata[i][1]]
      nodes.push(item);
    }
    //go through first row - get column from 2 to end
    for (let i = 2; i < mydata[0].length; i++) {
      let item = [mydata[0][i]];
      nodes.push(item);
    }
    return nodes
  }

  getEdgesData(mydata) {
    let edges = [];
    //1. from node, 2. to node, 3. value, ...
    for (let i = 1; i < mydata.length; i++)
      for (let j = 2; j < mydata[i].length; j++) {
        let value = mydata[i][j];
        let edge = [mydata[i][0], mydata[0][j], value]
        edges.push(edge);
      }
    return edges;
  }
}