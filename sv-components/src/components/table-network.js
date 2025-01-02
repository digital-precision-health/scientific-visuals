import { IEventAggregator, resolve, customElement, bindable } from 'aurelia';
//import { Handsontable } from 'handsontable';
import Handsontable from "handsontable";
//import handsontablecss from 'handsontable/dist/handsontable.full.css';

@customElement('sv-table-network')
export class TableNetwork {
    //showtable=true;
    hidetable = false;
    showHide(){
    }
    showHideTable(){
        this.hidetable = !this.hidetable;
    }

    svTable;//: any; // Replace 'any' with the actual type of sv-table's viewmodel if available
    svEdges;
    svNodes;

    /**
     * Method triggered by the button to add a row.
     * Delegates the call to the sv-table component's addRow() method.
     */
    addRow() {
      if (this.svTable && typeof this.svTable.addRow === 'function') {
        this.svTable.addRow();
      } else {
        console.warn('svTable reference is not available or addRow method is undefined.',this.svTable);
      }
    }
    addColumn() {
        if (this.svTable && typeof this.svTable.addColumn === 'function') {
          this.svTable.addColumn();
        } else {
          console.warn('svTable reference is not available or addColumn method is undefined.',this.svTable);
        }
      }    
}