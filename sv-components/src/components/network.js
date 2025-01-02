import { IEventAggregator, resolve, customElement, bindable } from 'aurelia';
import Graph from 'graphology';
import { Sigma } from 'sigma';
import ForceSupervisor from "graphology-layout-force/worker";
import { createNodeImageProgram } from "@sigma/node-image";
import { ColorMapper,TEXT_COLOR, getLineSize,drawRoundRect } from './color-mapper';

@customElement('sv-network')
export class Network {
  ea /* IEventAggregator*/ = resolve(IEventAggregator);
  container;
  searchinput;
  animationstarted = true;
  @bindable tabid;
  @bindable datachannel;
  @bindable searchValue;

  searchValueChanged(newValue, oldValue) {
    console.log('searchValue changed', newValue, oldValue);
    this.setSearchQuery(newValue)
  }

  attached() {
    this.typeColorMap = new ColorMapper();
    this.ea.subscribe('showtab', (showtabid) => {
      if (this.tabid === this.showtabid) {
        if (this.layout) this.startAnimate();//this.layout.start();
        else {
          console.warn('empty layout')
          this.renderer = new Sigma(this.graph, this.container, {
            // We don't have to declare edgeProgramClasses here, because we only use the default ones ("line" and "arrow")
            nodeProgramClasses: {
              image: createNodeImageProgram(),
              //gradient: NodeGradientProgram,
            },
            renderEdgeLabels: true,
            allowInvalidContainer: true
          });

          // Create the spring layout and start it
          this.layout = new ForceSupervisor(this.graph);
          this.startAnimate();//this.layout.start();
        }
      }
    });
    if (this.datachannel) {
      this.ea.subscribe(this.datachannel, (mydata) => {
        console.log('network received data:', mydata);
        if (Array.isArray(mydata)) {
          this.transformDataToGraph(mydata);
        } else {
          //process changes
          if (this.layout) this.stopAnimate();//this.layout.stop();
          if (mydata.type == 'changeNode') {
            console.log('network changeNode')
            this.renameNode(mydata.old, mydata.value)
          } else if (mydata.type == 'changeType') {
            console.log('network changeType')
            this.changeNodeType(mydata.node, mydata.value)
          } else if (mydata.type == 'changeEdge') {
            console.log('network changeEdge')
            //        {'type':'changeEdge','subject':subjectName,'object':objectName,'old':oldValue,'value':newValue})              
            this.updateEdge(mydata.subject, mydata.object, mydata.value)
          } else {
            console.warn('not recognized change', mydata);
          }
          if (this.layout) this.startAnimate();
        }
      })
    } else console.warn('datachannel empty')
    //this.showgraph();
    this.data = []; //TODO put data from other components
    this.transformDataToGraph(this.data);
  }
  state = { searchQuery: "" }
  // Actions:
  setSearchQuery(query) {
    this.state.searchQuery = query;

    if (this.searchValue !== query) this.searchValue = query;

    if (query) {
      const lcQuery = query.toLowerCase();
      const suggestions = this.graph
        .nodes()
        .map((n) => ({ id: n, label: this.graph.getNodeAttribute(n, "label") }))
        .filter(({ label }) => label.toLowerCase().includes(lcQuery));

      // If we have a single perfect match, them we remove the suggestions, and
      // we consider the user has selected a node through the datalist
      // autocomplete:
      if (suggestions.length === 1 && suggestions[0].label === query) {
        this.state.selectedNode = suggestions[0].id;
        this.state.suggestions = undefined;

        // Move the camera to center it on the selected node:
        const nodePosition = this.renderer.getNodeDisplayData(state.selectedNode);
        this.renderer.getCamera().animate(nodePosition, {
          duration: 500,
        });
      }
      // Else, we display the suggestions list:
      else {
        this.state.selectedNode = undefined;
        this.state.suggestions = new Set(suggestions.map(({ id }) => id));
      }
    }
    // If the query is empty, then we reset the selectedNode / suggestions state:
    else {
      this.state.selectedNode = undefined;
      this.state.suggestions = undefined;
    }

    // Refresh rendering
    // You can directly call `renderer.refresh()`, but if you need performances
    // you can provide some options to the refresh method.
    // In this case, we don't touch the graph data so we can skip its reindexation
    this.renderer.refresh({
      skipIndexation: true,
    });
  }

  setHoveredNode(node) {
    if (node) {
      this.state.hoveredNode = node;
      this.state.hoveredNeighbors = new Set(this.graph.neighbors(node));
    }

    if (!node) {
      this.state.hoveredNode = undefined;
      this.state.hoveredNeighbors = undefined;
    }

    // Refresh rendering
    this.renderer.refresh({
      // We don't touch the graph data so we can skip its reindexation
      skipIndexation: true,
    });
  }


  changeNodeType(nodeId, nodetype) {
    const mycolor = this.typeColorMap.getColor(nodetype);
    if (!this.graph.hasNode(nodeId)) {
      console.log(`Node "${nodeId}" does not exist. Creating.`);
      const angle = (this.graph.order * 2 * Math.PI) / this.graph.order;

      this.graph.addNode(nodeId, {
        label: nodeId,
        size: 5,
        color: mycolor, // Default color for objects without a type
        // type: 'object' // Optional: Define type as 'object'
        x: 100 * Math.cos(angle),
        y: 100 * Math.sin(angle)
      });

    }
    this.graph.setNodeAttribute(nodeId, 'color', mycolor);
    this.graph.setNodeAttribute(nodeId, 'subjectType', nodetype);
  }

  renameNode(oldName, newName) {
    if (!oldName) {
      console.log('oldname is null create Node')
      this.changeNodeType(newName, 'default');
      return;
    }
    if (!this.graph.hasNode(oldName)) {
      console.error(`Node "${oldName}" does not exist.`);
      return;
    }
    if (this.graph.hasNode(newName)) {
      console.error(`Node "${newName}" already exists.`);
      return;
    }

    // Get attributes of the old node
    const attributes = this.graph.getNodeAttributes(oldName);
    attributes.label = newName;

    // Add the new node with the same attributes
    this.graph.addNode(newName, attributes);

    // Transfer all edges from old node to new node
    this.graph.forEachEdge(oldName, (edge, attr, source, target) => {
      const connectedNode = source === oldName ? target : source;
      this.graph.addEdge(newName, connectedNode, attr);
    });

    // Remove the old node
    this.graph.dropNode(oldName);
  }

  /**
   * Updates or removes an edge based on the provided value.
   *
   * @param {string} subject - The source node identifier.
   * @param {string} object - The target node identifier.
   * @param {string|number} value - The value to determine the action.
   */
  updateEdge(subject, object, value) {
    // Check if the edge exists between subject and object
    if (!value || value == 0) {
      // Remove the edge if value is empty string or 0
      if (this.graph.hasEdge(subject, object)) this.graph.dropEdge(subject, object);
      console.log(`Edge between "${subject}" and "${object}" has been removed.`);
      return
    }
    if (this.graph.hasEdge(subject, object)) {
      // Update the 'label' attribute of the existing edge
      this.graph.setEdgeAttribute(subject, object, 'label', value);
      this.graph.setEdgeAttribute(subject, object, 'size', 1 + getLineSize(value, 5));
      console.log(`Edge between "${subject}" and "${object}" updated with label: "${value}".`);
    } else {
      if (value !== '' && value !== 0) {
        // Optionally, add the edge if it doesn't exist and value is valid
        this.graph.addEdge(subject, object, {
          relationship: 'related',
          type: 'line',
          label: value,
          size: 1 + getLineSize(value, 5),
        });
        console.log(`Edge between "${subject}" and "${object}" has been added with label: "${value}".`);
      } else {
        console.warn(`Edge between "${subject}" and "${object}" does not exist and no action was taken.`);
      }
    }
  }

  showgraph() {
    console.log('showgraph()')
    this.renderer = new Sigma(this.graph, this.container, {
      // We don't have to declare edgeProgramClasses here, because we only use the default ones ("line" and "arrow")
      nodeProgramClasses: {
        image: createNodeImageProgram(),
        //gradient: NodeGradientProgram,
      },
      renderEdgeLabels: true,
      allowInvalidContainer: true,
    });
    //hover feature
    // Bind graph interactions:
    this.renderer.on("enterNode", ({ node }) => {
      this.setHoveredNode(node);
    });
    this.renderer.on("leaveNode", () => {
      this.setHoveredNode(undefined);
    });
    //multiline label feature
    // Custom rendering for multi-line labels
    /*this.renderer.on('afterRender', () => {
      const ctx = this.renderer.context;
      this.graph.forEachNode((node, attrs) => {
        const { x, y } = this.renderer.getNodeDisplayData(node);
        const lines = attrs.label.split('\n');
        ctx.fillStyle = '#000'; // Text color
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((line, index) => {
          ctx.fillText(line, x, y - (lines.length / 2 - index) * 12); // Adjust 12 for line height
        });
      });
    });*/
    this.renderer.setSetting("defaultDrawNodeHover", (context/*: CanvasRenderingContext2D*/, data/*: PlainObject*/, settings/*: PlainObject*/) => {
      const size = settings.labelSize;
      const font = settings.labelFont;
      const weight = settings.labelWeight;
      const subLabelSize = size - 2;

      const label = data.label;
      const subLabel = data.clusterLabel;
      const clusterLabel = data.tag !== "unknown" ? data.tag : "";

      // Then we draw the label background
      context.beginPath();
      context.fillStyle = "#fff";
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 2;
      context.shadowBlur = 8;
      context.shadowColor = "#000";

      context.font = `${weight} ${size}px ${font}`;
      const labelWidth = context.measureText(label).width;
      context.font = `${weight} ${subLabelSize}px ${font}`;
      const subLabelWidth = subLabel ? context.measureText(subLabel).width : 0;
      context.font = `${weight} ${subLabelSize}px ${font}`;
      const clusterLabelWidth = clusterLabel ? context.measureText(clusterLabel).width : 0;

      const textWidth = Math.max(labelWidth, subLabelWidth, clusterLabelWidth);

      const x = Math.round(data.x);
      const y = Math.round(data.y);
      const w = Math.round(textWidth + size / 2 + data.size + 3);
      const hLabel = Math.round(size / 2 + 4);
      const hSubLabel = subLabel ? Math.round(subLabelSize / 2 + 9) : 0;
      const hClusterLabel = Math.round(subLabelSize / 2 + 9);

      drawRoundRect(context, x, y - hSubLabel - 12, w, hClusterLabel + hLabel + hSubLabel + 12, 5);
      context.closePath();
      context.fill();

      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
      context.shadowBlur = 0;

      // And finally we draw the labels
      context.fillStyle = TEXT_COLOR;
      context.font = `${weight} ${size}px ${font}`;
      context.fillText(label, data.x + data.size + 3, data.y + size / 3);

      if (subLabel) {
        context.fillStyle = TEXT_COLOR;
        context.font = `${weight} ${subLabelSize}px ${font}`;
        context.fillText(subLabel, data.x + data.size + 3, data.y - (2 * size) / 3 - 2);
      }

      context.fillStyle = data.color;
      context.font = `${weight} ${subLabelSize}px ${font}`;
      context.fillText(clusterLabel, data.x + data.size + 3, data.y + size / 3 + 3 + subLabelSize);
    })
    // search feature
    // Render nodes accordingly to the internal state:
    // 1. If a node is selected, it is highlighted
    // 2. If there is query, all non-matching nodes are greyed
    // 3. If there is a hovered node, all non-neighbor nodes are greyed
    this.renderer.setSetting("nodeReducer", (node, data) => {
      const res = { ...data };
      if (this.state.hoveredNeighbors && !this.state.hoveredNeighbors.has(node) && this.state.hoveredNode !== node) {
        res.label = "";
        res.color = "#f6f6f6";
      }
      if (this.state.selectedNode === node) {
        res.highlighted = true;
      } else if (this.state.suggestions) {
        if (this.state.suggestions.has(node)) {
          res.forceLabel = true;
        } else {
          res.label = "";
          res.color = "#f6f6f6";
        }
      }
      return res;
    });

    // Render edges accordingly to the internal state:
    // 1. If a node is hovered, the edge is hidden if it is not connected to the
    //    node
    // 2. If there is a query, the edge is only visible if it connects two
    //    suggestions
    this.renderer.setSetting("edgeReducer", (edge, data) => {
      const res = { ...data };

      if (
        this.state.hoveredNode &&
        !this.graph.extremities(edge).every((n) => n === this.state.hoveredNode || this.graph.areNeighbors(n, this.state.hoveredNode))
      ) {
        res.hidden = true;
      }

      if (
        this.state.suggestions &&
        (!this.state.suggestions.has(this.graph.source(edge)) || !this.state.suggestions.has(this.graph.target(edge)))
      ) {
        res.hidden = true;
      }

      return res;
    });

    // Create the spring layout and start it
    this.layout = new ForceSupervisor(this.graph, {
      maxIterations: 50,
      settings: {
        gravity: 0.0006, // ?number 0.0001: importance of the gravity force, that attracts all nodes to the center.
        attraction: 0.0005,//?number 0.0005: importance of the attraction force, that attracts each pair of connected nodes like elastics.
        repulsion: 0.1, //0.1 importance of the repulsion force, that attracts each pair of nodes like magnets.
        inertia: 0.4, // ?number 0.6: percentage of a node vector displacement that is preserved at each step. 0 means no inertia, 1 means no friction.
        maxMove: 5 //200 ?number 200: Maximum length a node can travel at each step, in pixel.

      }
    });
    this.startAnimate();
    //this.layout.start();
  }

  /**
 * Transforms a data array into a Graphology graph.
 * @returns {Graph} - The resulting Graphology graph.
 */
  transformDataToGraph(data) {
    // Initialize a new undirected graph
    if (this.graph) {
      //this.graph.clear();
      this.graph.clearEdges();
    } else {
      this.graph = new Graph({ type: 'undirected' });
    }
    if (this.layout) {
      //this.layout.stop();
      this.stopAnimate();
    }
    // Your data array
    //console.log('transformDataToGraph data.length', data.length)
    if (data.length == 0) {

      data = [
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
    }


    // Extract header row
    const header = data[0];
    const objectNames = header.slice(2); // Exclude first two columns

    // Add Object nodes
    for (let i = 0; i < objectNames.length; i++) {
      const object = objectNames[i];
      if (!this.graph.hasNode(object)) {
        let angle = (i * 2 * Math.PI) / (data.length + objectNames.length);
        this.graph.addNode(object, {
          label: object,
          tag: 'object',
          clusterLabel: 'feature',
          size: 15,
          color: 'orange', // Default color for objects without a type
          // type: 'object' // Optional: Define type as 'object'
          x: 100 * Math.cos(angle),
          y: 100 * Math.sin(angle)
        });
      }
    }

    // Iterate through each Subject row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const subject = row[0];
      const subjectType = row[1];

      // Determine color based on type
      const color = this.typeColorMap.getColor(subjectType); // Default to gray if type not mapped
      let angle = ((i+objectNames.length) * 2 * Math.PI) / (data.length+objectNames.length);
      // Add Subject node
      if (!this.graph.hasNode(subject)) {
        this.graph.addNode(subject, {
          label: subject,
          tag: subjectType,
          clusterLabel: 'gene',
          size: 7,
          color: color,
          subjectType: subjectType,
          x: 100 * Math.cos(angle),
          y: 100 * Math.sin(angle)
        });
      }

      // Remove all edges from the graph

      // Iterate through predicate columns
      for (let j = 2; j < header.length; j++) {
        const object = header[j];
        const relationship = row[j];

        // Check if relationship exists (value === 1)
        if (relationship && (relationship != 0)) {
          //console.log('transformDataToGraph adding edge', subject, object)
          // Add edge between Subject and Object
          const edgeKey = `${subject}-${object}`;
          if (!this.graph.hasEdge(edgeKey)) {
            //console.log('edge not exist adding edge')
            this.graph.addEdge(subject, object, {
              relationship: 'related', // You can customize this as needed
              type: "line",
              label: relationship,
              size: 1 + getLineSize(relationship, 5),
              color: 'lightgrey'//this.typeColorMap.getRelationshipColor(relationship)

            });
          } else {
            //console.log('edge exist add edge')
          }
        }
      }
    }
    /*this.graph.nodes().forEach((node, i) => {
      const angle = (i * 2 * Math.PI) / this.graph.order;
      this.graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
      this.graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
    });*/
    if (!this.layout) {
      console.log('no layout showgraph()')
      this.showgraph();
    } else {
      console.log('layout detected, stop(), start()')

      this.startAnimate();//this.layout.start();
    }
  }
  layoutOnOff() {
    this.animationstarted = !this.animationstarted;
    if (this.animationstarted) this.layout.start()
    else this.layout.stop()
  }

  stopAnimate() {
    this.layout.stop()
  }
  startAnimate() {
    if (this.animationstarted) this.layout.start()
  }

    //set x,y points to circle
  
  resetLayout() {
    const nodes = this.graph.nodes();
    const numOfNodes = nodes.length;
  
    nodes.forEach((node, i) => {
      const angle = (i * 2 * Math.PI) / numOfNodes;
      this.graph.setNodeAttribute(node, 'x', 100 * Math.cos(angle));
      this.graph.setNodeAttribute(node, 'y', 100 * Math.sin(angle));
    });
  }
}
