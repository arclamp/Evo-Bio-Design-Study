import '../styles/index.scss';
import * as d3 from "d3";
import {loadData} from './dataLoad';
import {calculateScales, matchLeaves, matchEdges, normPaths, filterKeeper} from './dataFormat';
import {allPaths, pullPath, getPath} from './pathCalc';
import {drawPathsAndAttributes} from './renderPathView';
import {renderTree, buildTreeStructure, renderTreeButtons} from './sidebarComponent';
import {toolbarControl, renderAttToggles} from './toolbarComponent';
import { updateMainView } from './viewControl';

export const dataMaster = [];
export const collapsed = false;


let wrap = d3.select('#wrapper');
let main = wrap.select('#main');
let selectedPaths = wrap.select('#selected');
let sidebar = wrap.select('#sidebar');
let toolbarDiv = wrap.select('#toolbar');


let tooltip = wrap.append("div")
.attr("id", "tooltip")
.style("opacity", 0);

function go(edges, edgeLen, leafChar, labels, attributes) {
    //helper function to create array of unique elements
    Array.prototype.unique = function() {
        return this.filter(function (value, index, self) { 
            return self.indexOf(value) === index;
        });
    }

    //Mapping data together/////
    let edgeSource = edges.rows.map(d=> d.V1);
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.V2) == -1 );

    ///MAKE A ESTIMATED SCALES THING
    let calculatedAtt = {
        'awesomeness' : attributes.awesomeness,
        'island' : attributes.island,
        'SVL' : attributes.SVL,
        'ecomorph': attributes.ecomorph,
    }

    let colorKeeper = [
        ['#0dc1d1', '#c8f7fd'],
        ['#3AD701', '#2a9b01'],
        ['#fec303', '#d3a001'],
        ['#fe4ecb', '#d30197'],
        ['#f36b2c'],
        ['#1abc9c'],
        ['#493267'],
        ['#a40b0b'],
        ['#0095b6'],
    ]

    ////CALCULATE THE SCALES FOR EACH ATTRIBUTE////////
    let calculatedScales = calculateScales(calculatedAtt, colorKeeper);

    ///MATCH LEAF CHARACTERS AND LABELS TO LEAVES///
    let matchedLeaves = matchLeaves(labels, leaves, leafChar, calculatedScales);

    //MATCH CALC ATTRIBUTES TO EDGES///
    let matchedEdges = matchEdges(edges, edgeLen, calculatedAtt, calculatedScales);

    ///CALCULATES PATHS FROM THE DATA////
    let paths = allPaths(matchedEdges, matchedLeaves, "V1", "V2");
 
   let normedPaths = normPaths(paths, calculatedAtt, calculatedScales);

   dataMaster.push(normedPaths);
   
 
    toolbarControl(toolbarDiv, normedPaths, main, calculatedScales, 'edgeLength', 'paths');
    
    let filterDiv = wrap.select('#filter-tab').classed('hidden', true);

    ////////TREE RENDER IN SIDEBAR////////
    let nestedData = buildTreeStructure(paths, edges);

    renderTreeButtons(nestedData, normedPaths, calculatedScales, sidebar, false);

    let tree = renderTree(nestedData, normedPaths, calculatedScales, sidebar, false);
    
      /// LOWER ATTRIBUTE VISUALIZATION ///
   updateMainView(calculatedScales, 'edgeLength');
}

(async () => {
  // Get query arguments.
  const query = new URLSearchParams(window.location.search);
  const params = {
    multinet: query.get('multinet'),
    workspace: query.get('workspace'),
    graph: query.get('graph'),
  };

  if (params.multinet && params.workspace && params.graph) {
    console.log(params);
  } else {
    const edges = await loadData(d3.json, './public/data/anolis-edges.json', 'edge');
    const edgeLen = await loadData(d3.json, './public/data/anolis-edge-length.json', 'edge');
    const leafChar = await loadData(d3.json, './public/data/anolisLeafChar.json', '');
    const labels = await loadData(d3.json, './public/data/anolis-labels.json', '');

    const awesomeness = await loadData(d3.json, './public/data/anolis-awesomeness-res.json', 'continuous');
    const island = await loadData(d3.json, './public/data/anolis-island-res.json', 'discrete');
    const SVL = await loadData(d3.json, './public/data/anolis-svl-res.json', 'continuous');
    const ecomorph = await loadData(d3.json, './public/data/anolis-ecomorph-res.json', 'discrete');
    const attributes = {
      awesomeness,
      island,
      SVL,
      ecomorph,
    };

    go(edges, edgeLen, leafChar, labels, attributes);
  }

  /*
  loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
      let pathArray = pullPath([], [data], [], [], 0);

      //console.log('pa',pathArray);
  });*/
  /*
  loadData(d3.json, './public/data/geospiza_loop_all_asr_features.json').then(data=> {
      let pathArray = pullPath([], [data], [], [], 0);

      console.log('pa RICH',pathArray);
  });*/
  /*
  loadData(d3.json, './public/data/anolis_rich_ASR_pad_vs_tail.json').then(data=> {
      let pathArray = pullPath([], [data], [], [], 0);

      console.log('anolis RICH',pathArray);
  });*/
})();
