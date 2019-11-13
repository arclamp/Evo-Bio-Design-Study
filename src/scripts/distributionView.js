import '../styles/index.scss';
import {formatAttributeData, maxTimeKeeper} from './dataFormat';
import * as d3 from "d3";
import {filterMaster} from './filterComponent';
import { pullPath } from './pathCalc';
import { renderTree } from './sidebarComponent';
import { colorKeeper } from '.';

const dimensions = {
    height: 80,
    observedWidth : 200,
    predictedWidth : 800,
    margin : 20,
    squareDim : 15,
    timeRange: 795
}

const brushColors = [
    ['#0D47A1', '#FFB74D'],
    ['#6A1B9A', '#FDD835'],
]

let colorBool = 0;

let selectedClades = [];


export function drawBranchPointDistribution(data, svg){

    let branchBar = svg.append('g').classed('branch-bar', true);
    branchBar.append('rect').classed('point-dis-rect', true)
        .attr('height', 25)
        .attr('x', -10)
        .attr('y', -10)
        .attr('fill', '#fff');

    let binWrap = branchBar.append('g').attr('transform', 'translate(102, -10)');

    branchBar.append('line')
        .attr('y1', 2)
        .attr('y2', 2)
        .attr('x1', '100')
        .attr('x2', 890)
        .attr('stroke', 'gray')
        .attr('stroke-width', .25);

    branchBar.append('text').text('Root').attr('transform', 'translate(70, 7)');
    let leafLabel = branchBar.append('g').classed('leaf-label', true).attr('transform', 'translate(950, 7)');
    leafLabel.append('text').text('Leaves');

    let nodeLengthArray = [];
    let nodeDuplicateCheck = []

    data.paths.map(path=> {
        path.filter(n=> n.leaf != true).map(node=> {
            if(nodeDuplicateCheck.indexOf(node.node) == -1){
                nodeDuplicateCheck.push(node.node);
                nodeLengthArray.push({'node': node.node, 'eMove': node.combLength });
            }
        })
    });

    let bPointScale = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, 795]);
    let pointGroups = branchBar.selectAll('g.branch-points').data(nodeLengthArray)
        .join('g').attr('class', (d, i)=> d.node).classed('branch-points', true);

    pointGroups.attr('transform', (d, i) => {
        return `translate(${(105 + bPointScale(d.eMove))}, 0)`});
    pointGroups.append('circle').attr('r', 5).attr('fill', '#fff').attr('opacity', 0.5)//.attr('fill', "rgba(123, 141, 153, 0.5)");

    let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, 795]);
    
    let binsRects = binWrap
        .selectAll('rect.bin')
        .data(data.groupBins[0].branches.map(m=> m.range))
        .join('rect')
        .classed('bin', true);

    binsRects.attr('width', (d, i, n)=> {
        return x(d[1]) - x(d[0]);
    }).attr('height', 20);

    binsRects.attr('transform', (d, i, n)=> {
        let step = x(d[1]) - x(d[0]);
        return `translate(${step*i},0)`});

    binsRects.attr('fill', 'gray').attr('stroke-width', 2).attr('stroke', 'white');

    let axis = d3.axisBottom(x);
    let axGroup = branchBar.append('g').call(axis)
    axGroup.attr('transform', 'translate(103, 10)');
    axGroup.select('path').attr('stroke-width', 0);

    return branchBar;
}

export function drawGroupLabels(pathData, svg, groupLabel){

    let cladeLabel = svg.append('g').classed('clade-label', true).attr('transform', 'translate(10, 0)');
    cladeLabel.append('rect')
        .attr('width', 50)
        .attr('height', (pathData.keys.length * (dimensions.height+ 15)))
        .attr('fill', 'gray')
        .style('opacity', 0.2)
        .on('mouseover', (d, i)=>{
            let treeNode  = d3.select('#sidebar').selectAll('.node');
            let treeLinks  = d3.select('#sidebar').selectAll('.link');
            treeNode.filter(f=> {
                if(f.data.leaf){
                    let test = d3.entries(f.data.attributes).filter(f=> groupLabel.includes(f.key))[0].value;
                    return groupLabel.includes(test.states.state);
                }else{
                    let test = d3.entries(f.data.attributes).filter(f=> groupLabel.includes(f.key))[0];
                    let testest = d3.entries(test.value.values).filter((f, i, n)=> {
                        let max = d3.max(n.map(m=> m.value));
                        return f.value === max;
                    })[0];
                    return groupLabel == testest.key;
                }
            }).classed('hover clade', true);
        
        treeLinks.filter(f=> {
            if(f.data.leaf){
                let test = d3.entries(f.data.attributes).filter(f=> groupLabel.includes(f.key))[0].value;
                return groupLabel.includes(test.states.state);
            }else{
                let test = d3.entries(f.data.attributes).filter(f=> groupLabel.includes(f.key))[0]
                let testest = d3.entries(test.value.values).filter((f, i, n)=> {
                    let max = d3.max(n.map(m=> m.value));
                    return f.value === max;
                })[0];
                return groupLabel == testest.key;
            }
        }).classed('hover clade', true);
        let species = d.paths.map(m=> m[m.length - 1].label);
        }).on('mouseout', (d, i)=> {
            let treeNode  = d3.select('#sidebar').selectAll('.node');
            let treeLinks  = d3.select('#sidebar').selectAll('.link');
            treeNode.classed('hover clade', false);
            treeLinks.classed('hover clade', false);
        });

    cladeLabel.append('text').text(d=> d.label)
    .style('text-anchor', 'middle')
    .attr('transform', `translate(23, ${(pathData.keys.length * (dimensions.height+ 15)/2)}), rotate(-90)`);

    return cladeLabel;
}

export function groupDistributions(pathData, mainDiv, scales, groupAttr){
    let groupKeys = scales.filter(f=> f.field === groupAttr)[0].scales.map(s=> s.scaleName);
    let branchBinCount = d3.median(pathData.map(m=> m.length)) - d3.min(pathData.map(m=> m.length))
   
    let pathGroups = groupKeys.map(group => {
        let paths = pathData.filter(path => {
            return group.includes(path[path.length - 1].attributes[groupAttr].values[groupAttr]);
        });

        let groupBins = binGroups(paths, group, scales, branchBinCount);
        return {'label': group, 'paths': paths, 'groupBins': groupBins}
    });

    let groupDivs = mainDiv.selectAll('.group-div').data(pathGroups).join('div').classed('group-div', true);

    groupDivs.each((d, i, n)=> {

        let group = d3.select(n[i]);
        group.style('text-align', 'center');
        group.append('text').text(d.label);
        group.append('text').text(` : ${d.paths.length} Paths` );
      
        let svg = group.append('svg');
        svg.attr('class', 'main-summary-view');
        svg.attr('id', `${d.label}-svg`);
        svg.attr('height', (d.groupBins.keys.length * (dimensions.height + 5)));
    
        let branchBar = drawBranchPointDistribution(d, svg);
        branchBar.attr('transform', 'translate(40, 10)')

        renderDistibutions(d.groupBins, d.label, group, branchBar, scales);
    });
}

export function binGroups(pathData, groupLabel, scales, branchCount){

    let attrHide = filterMaster.filter(f=> f.type === 'hide-attribute').map(m=> m.attribute);
    
    let keys = scales.map(s=> s.field).filter(f=> attrHide.indexOf(f) === -1);

    let newNormed = [...pathData];
    let keysToHide = attrHide.length > 0 ? scales.filter(f=> attrHide.indexOf(f.field) === -1).map(m=> m.field) : null;

    formatAttributeData(newNormed, scales, keysToHide);

    let maxBranch = d3.max(newNormed.map(p=> p.length)) - 1;
  
    let max = maxTimeKeeper[0]

    let normBins = new Array(branchCount).fill().map((m, i)=> {
            let step = max / branchCount;
            let base = (i * step);
            let top = ((i + 1)* step);
            return {'base': base, 'top': top, 'binI': i , 'step':step}
    });

    let internalNodes = newNormed.map(path => path.filter(node=> (node.leaf != true) && (node.root != true)));
    let leafNodes = newNormed.flatMap(path => path.filter(node=> node.leaf === true));
    let rootNodes = newNormed.flatMap(path => path.filter(node=> node.root === true));

    normBins.map((n, i)=> {
        let edges = internalNodes.flatMap(path => path.filter(node=> {
                return node.combLength > n.base && node.combLength <= n.top;
        } ));
        n.data = edges;
        return n;
    });

    let sortedBins = keys.map(key=> {
        let scale = scales.filter(f=> f.field === key)[0];
    
        let mapNorm = normBins.map(bin => {
            if(bin.data.length > 0){
                bin.fData = bin.data.map(d=> {
                    return d.attributes[key];
                })
            }else{
                bin.fData = [];
            }
            return {'data': bin.fData, 'range': [bin.base, bin.top], 'index': bin.binI, 'key': key };
        });
       
        let leafAttr = leafNodes.map(m=> m.attributes[key]);
        let leafData = {'data': leafAttr};
   
        if(scale.type === 'continuous'){
            let x = d3.scaleLinear().domain([scale.min, scale.max]).range([0, dimensions.height]);
    
            let histogram = d3.histogram()
            .value(function(d) { return d.values.realVal; })  
            .domain(x.domain())  
            .thresholds(x.ticks(20)); 
  
            mapNorm.map((n, i, nodeArray)=> {
                n.type = scale.type;
                n.bins = histogram(n.data);
                n.domain = [scale.max, scale.min];
                n.bins.count = branchCount;
                n.bins.groupLabel = groupLabel;

                if(d3.mean(n.bins.map(m=> m.length)) === 0){
                    if(i === 0){
                         n.bins = histogram(rootNodes.map(m=> m.attributes[key]));
                         n.data = rootNodes.map(m=> m.attributes[key]);
                         n.bins.count = branchCount;

                    }else{
                        n.bins = nodeArray[i-1].bins;
                        n.data = nodeArray[i-1].data;
                    }
                }
                return n;
            });

            //Histogram for observed////
            let maxO = d3.max(leafAttr.flatMap(v=> +v.values.realVal));
            let minO = d3.min(leafAttr.flatMap(v=> +v.values.realVal));
            let xO = d3.scaleLinear().domain([minO, maxO]).range([0, dimensions.height])

            let histogramO = d3.histogram()
            .value(function(d) { 
                return +d.values.realVal; })  
            .domain(xO.domain())  
            .thresholds(xO.ticks(20)); 

            leafData.bins = histogramO(leafAttr);
      
            let newK = {'key': key, 
                    'branches': [...mapNorm], 
                    'type': scale.type, 
                    'leafData': leafData, 
                    'rootData': rootNodes.map(m=> m.attributes[key])[0]}
   
            return newK;

        }else{
            //HANDLING DISCRETE//
            let states = leafAttr[0].scales.scales;
           
            let stateKeys = states[0].state? states.map(s=> s.state) : states.map(s=> s.scaleName)
          
            let rootNode = rootNodes[0].attributes[key]
            rootNode.bins = d3.entries(rootNodes[0].attributes[key].values).map(m=> {       
                let states = [{'state': m.key, 'value':m.value}];
                return {state: states, color : scale.stateColors.filter(f=> f.state === m.key)[0], max:80};
               });
            
            mapNorm.bins = null
            leafData.bins = states.map(s=> {
                return leafAttr.filter(f=> s.scaleName.includes(f.states.state))});
   
            let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.height]);
           
            mapNorm.map((n, i, nodeArray)=> {
                
                let colors = scale.stateColors;
                n.bins = stateKeys.map(state=> {
                    let test = n.data.flatMap(m=> Object.entries(m.values).filter(f=> f[0] === state))
                    .map(m=> {
                        return {'state': m[0], 'value':m[1]}
                    });
                    return {state: test, color : colors.filter(f=> f.state === state)[0], max:80};
                });
                //IF WE DONT HAVE ANY BRANCHES< WE ASSUME THAT THEY ARE THE SAME AS THE PREVIOUS
                if(n.bins[0].state.length === 0){
                    if(i === 0){
                        n.bins = d3.entries(rootNode.values).map(m=> {
                             let states = [{'state': m.key, 'value':m.value}];
                             return {state: states, color : colors.filter(f=> f.state === m.key)[0], max:80};
                            });
                    }else{
                        n.bins = nodeArray[i-1].bins;
                    }
                }
                n.type = scale.type;
                return n;
            });

            let newK = {'key': key, 
                        'branches': [...mapNorm], 
                        'type': scale.type, 
                        'leafData': leafData, 
                        'rootData': rootNodes.map(m=> m.attributes[key])[0],
                        'stateKeys': stateKeys,
                        'maxCount': d3.max(mapNorm.map(n=> n.data.length))
                    }
            return newK;
        }
    });

    sortedBins.group = groupLabel;
    sortedBins.branchCount = branchCount;
    sortedBins.keys = keys;
    return sortedBins;
}
/**
 * 
 * @param {*} pathData 
 * @param {*} groupLabel 
 * @param {*} mainDiv 
 * @param {*} scales 
 */

export function renderDistibutions(pathData, groupLabel, mainDiv, branchBar, scales){

    mainDiv.classed(groupLabel, true);
    let svg = mainDiv.select(`#${groupLabel}-svg`);

    //     ///////RENDERING//////////
    
    let branchScale = d3.scaleLinear().domain([0, pathData.branchCount]).range([0, dimensions.timeRange]);
    let pointGroups = branchBar.selectAll('g.branch-points');
  
    let wrap = svg.append('g').classed('summary-wrapper', true);
    wrap.attr('transform', 'translate(50, 50)');

    let binnedWrap = wrap.selectAll('.attr-wrap').data(pathData).join('g').attr('class', d=> d.key + ' attr-wrap');

    binnedWrap.attr('transform', (d, i, n)=>  {
            if(i === 0){
                return 'translate(0,0)';
            }else{
                let selected = d3.selectAll(n).filter((f, j)=>j < i).data();
                let sum = d3.sum(selected.flatMap(s=> s.type === 'continuous'? dimensions.height+5 : (s.stateKeys.length*(dimensions.squareDim+4))));
                d.sum = sum;
                return `translate(0, ${sum})`;
            }
    });
    
    let label = binnedWrap.append('text').text(d=> d.key)
    .attr('y', 40)
    .attr('x', 80)
    .style('text-anchor', 'end')
    .style('font-size', 11);

    let groupLabelBars = drawGroupLabels(pathData, svg, groupLabel);

    let predictedWrap = binnedWrap.append('g').classed('predicted', true);
    predictedWrap.attr('transform', 'translate(25, 0)');
    predictedWrap.filter(f=> f.type === 'discrete').append('g').classed('win-line', true);

    //ROOT RENDERING
    let root = predictedWrap.selectAll('g.root').data(d=> {
        return [d.rootData]}).join('g').classed('root', true);
    root.attr('transform', `translate(60,0)`);

    let contRoot = root.filter(f=> f.type === "continuous");
    contRoot.append('rect')
        .attr('height', dimensions.height)
        .attr('width', 12)
        .attr('fill', '#fff')
        .style('stroke-width', '0.5px')
        .style('stroke', 'black')//.attr('x', 70);

    let rootRange = contRoot.append('rect')
        .attr('width', 12)
        .attr('height', d=> {
            let newy = d.scales.yScale;
            newy.range([(dimensions.height - 5), 0]);
            return newy(d.values.lowerCI95) - newy(+d.values.upperCI95)
        }).attr('transform', (d, i) => {
            let newy = d.scales.yScale;
            newy.range([(dimensions.height - 5), 0]);
            return 'translate(0,'+newy(+d.values.upperCI95)+')'
        }).style('opacity', 0.5).attr('fill', "rgba(133, 193, 233)");

        let rootAv = contRoot.append('rect').attr('width', 12).attr('height', 3);
    
        rootAv.attr('transform', (d, i) => {
                let newy = d.scales.yScale;
                newy.range([dimensions.height, 0]);
                let mean = +d.values.realVal;
                return 'translate(0,'+newy(mean)+')';
        }).attr('fill', '#004573');

       // Discrete Root
    let disRoot = root.filter(f=> f.type === "discrete");
    let rootStateGroups = disRoot.selectAll('g.root-state-groups').data(d=> {
        return d.bins}).join('g').classed('root-state-groups', true);

    rootStateGroups.attr('transform', (d, i)=> `translate(0, ${3.5+(i*(dimensions.squareDim+2))})`);
    rootStateGroups.append('rect')
        .attr('height', dimensions.squareDim)
        .attr('width', dimensions.squareDim)
        .attr('fill', '#fff').attr('opacity', 1);

    let rootRects = rootStateGroups.append('rect')
        .classed('color-rect', true)
        .attr('height', dimensions.squareDim)
        .attr('width', dimensions.squareDim);

    rootRects.attr('fill', (d, i)=> {
            return `rgba(89, 91, 101, ${d.state[0].value})`;
        }).attr('stroke-width', 0.5).attr('stroke', `rgba(200, 203, 219, .9)`);

    let winStateRoot = disRoot.selectAll('g.root-state-groups')
        .filter((f, j, n)=>{
            let maxVal = d3.max(d3.selectAll(n).data().map(m=> m.state[0].value));
            return f.color.state === d3.selectAll(n).data().filter(m=> m.state[0].value === maxVal)[0].color.state;
        }).classed('win', true);

    winStateRoot.select('rect.color-rect').attr('fill', (c, i)=> {
            return c.color.color;
        }).attr('opacity', (c)=>{
            let sum = d3.sum(c.state.flatMap(s=> s.value));
            return sum/c.state.length;
        })

    let branchGroup = predictedWrap.selectAll('g.branch-bin').data(d=> {
            return d.branches}).join('g').classed('branch-bin', true);

    branchGroup.attr('transform', (d, i, n)=> {
        let step = n.length < 11 ? (d.range[1] - d.range[0]) / 5 : 0
        let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.timeRange])
            return 'translate('+(100 + (branchScale(i)) + x(step)) +', 0)'});

    let discreteDist = branchGroup.filter(f=> f.type === 'discrete');

    /////////EXPERIMENT////////
    let stateBarsPredicted = discreteDist.selectAll('g.histo-bars')
    .data(d=> d.bins).join('g')
    .classed('histo-bars', true);
  
    stateBarsPredicted.attr('transform', (d, i)=> `translate(${dimensions.squareDim}, ${3.5+(i*(dimensions.squareDim+2))})`);
  
    let bars = stateBarsPredicted.append('rect')
              .attr('height', dimensions.squareDim)
              .attr('width', (d, i, n)=> {
                let dev = d3.deviation(d.state.map(m=> m.value));
                let mean = d3.mean(d.state.map(m=> m.value));
                let x = d3.scaleLinear().domain([0, 1]).range([0, 40]);
                return x(mean)
              })
              .attr('fill', d=> d.color.color)
              .attr('opacity', 0.3)

    // let devDotHigh = stateBarsPredicted.append('circle')
    //           .attr('cy', dimensions.squareDim / 2)
    //           .attr('cx', (d, i, n)=> {
    //             let dev = d3.deviation(d.state.map(m=> m.value));
    //             let mean = d3.mean(d.state.map(m=> m.value));
    //             let x = d3.scaleLinear().domain([0, 1]).range([0, 40]);
    //             return x(mean + dev)
    //           })
    //           .attr('r', 2)
    //           .attr('fill', d=> d.color.color)
    //           .attr('opacity', 1)

    // let devDotLow = stateBarsPredicted.append('circle')
    //           .attr('cy', dimensions.squareDim / 2)
    //           .attr('cx', (d, i, n)=> {
    //             let dev = d3.deviation(d.state.map(m=> m.value));
                
    //             let mean = d3.mean(d.state.map(m=> m.value));
    //             let x = d3.scaleLinear().domain([0, 1]).range([0, 40]);
    //             return x(mean - dev)
    //           })
    //           .attr('r', 2)
    //           .attr('fill', d=> d.color.color)
    //           .attr('opacity', 1)

    /////////END XPERIMENT////////

    let stateBinsPredicted = discreteDist.selectAll('g.state-bins')
        .data(d=> d.bins).join('g')
        .classed('state-bins', true);

    stateBinsPredicted.attr('transform', (d, i)=> `translate(0, ${3.5+(i*(dimensions.squareDim+2))})`);

    stateBinsPredicted.append('rect')
        .attr('height', dimensions.squareDim)
        .attr('width', dimensions.squareDim)
        .attr('fill', '#fff').attr('opacity', 1);

    let stateRects = stateBinsPredicted.append('rect')
        .classed('state-rect', true)
        .attr('height', dimensions.squareDim)
        .attr('width', dimensions.squareDim);
    stateRects.attr('fill', (d, i, n)=> {
        let sum = d3.sum(d.state.map(m=> m.value))
        let av = sum / d.state.length;
        let scale = d3.scaleLinear().domain([0, 1]).range([0, 1]);
        return `rgba(89, 91, 101, ${scale(av)})`;
    }).attr('stroke-width', 0.5).attr('stroke', `rgba(200, 203, 219, .9)`);

    stateRects.on('mouseover', (d, i, n)=> {
        let sum = d3.sum(d.state.map(m=> m.value))
        let av = sum / d.state.length;
        let tool = d3.select('#tooltip');
        tool.transition()
            .duration(200)
            .style("opacity", .9);
        
        let f = d3.format(".3f");
          
        tool.html(`${d.state[0].state} : ${f(av)}`)
            .style("left", (d3.event.pageX - 40) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        tool.style('height', 'auto');

    }).on('mouseout', ()=>{
        let tool = d3.select('#tooltip');
        tool.transition()
          .duration(500)
          .style("opacity", 0);
    });

    let lastBranch = discreteDist.filter((d, i, n)=>{
        return i === n.length - 1
    }).selectAll('g.state-bins').append('text').text((d, i)=> {
        return d.color.state;
    });
    lastBranch.attr('y', 10).attr('x', dimensions.squareDim+4).style('font-size', 10);

    discreteDist.each((d, i, node)=>{
        let maxBin = 0;
        let maxState = null;
        d.bins.map(m=> {
            if(d3.sum(m.state.flatMap(s=> s.value)) > maxBin){
                maxBin = d3.sum(m.state.flatMap(s=> s.value));
                maxState = m.color.state;
            }
        });
  
        let winStates = d3.select(node[i]).selectAll('g.state-bins')
            .filter((f, j, n)=>{
                return f.color.state === maxState;
            }).classed('win', true);

        winStates.select('rect.state-rect').attr('fill', (c)=> {
                return c.color.color;
            }).attr('opacity', (c)=>{
                let sum = d3.sum(c.state.flatMap(s=> s.value));
                return sum/c.state.length;
            })
    });

    let disWrap = predictedWrap.filter(f=> f.type === 'discrete')
    let pathKeeper = []
    disWrap.each((d, i, node)=> {
        let winPosArray = [];
        d3.select(node[i]).selectAll('.win').each((r, j, n)=>{
            winPosArray.push([n[j].getBoundingClientRect().x,(n[j].getBoundingClientRect().y + 10)])
            winPosArray.push([n[j].getBoundingClientRect().x + 15,(n[j].getBoundingClientRect().y + 10)])
        });
        pathKeeper.push([...winPosArray]);
        let lineThing = d3.line();
        winPosArray[winPosArray.length -1][1] = winPosArray[winPosArray.length -1][1] + 2;
        winPosArray[winPosArray.length -2][1] = winPosArray[winPosArray.length -2][1] + 2;
        d.win = winPosArray;
    });

    disWrap.each((e, i, n)=> {
        let lineThing = d3.line();
        d3.select(n[i]).select('.win-line').append('path').attr('d', (d)=> lineThing(d.win))
        .attr('transform', 'translate(-75, -'+n[i].getBoundingClientRect().y+')')
        .attr('fill', 'none')
        .attr('stroke', `rgba(200, 203, 219, .9)`)
        .attr('stoke-width', 1)
    })

    //CONTIN PREDICTED
    let continDist = branchGroup.filter(f=> f.type === 'continuous');

    continDist.on('mouseover', (d, i, node)=> {
        let list = d.data.map(m=> m.node);
        let selected = pointGroups.filter(p=> {
            return list.indexOf(p.node) > -1}).classed('selected', true);
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let selectedBranch = treeNode.filter(f=> list.indexOf(f.data.node) > -1).classed('selected-branch', true);
        let y = d3.scaleLinear().domain(d.domain).range([0, dimensions.height])
        let axis = d3.select(node[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(5));
    }).on('mouseout', (d, i, node)=> {
        d3.selectAll(".branch-points.selected").classed('selected', false);
        d3.selectAll('.selected-branch').classed('selected-branch', false);
        d3.select(node[i]).select('.y-axis').remove();
    });

    var lineGen = d3.area()
    .curve(d3.curveCardinal)
    .x((d, i, n)=> {
        let y = d3.scaleLinear().domain([0, n.length - 1]).range([0, dimensions.height]).clamp(true);
        return y(i); 
    })
    .y0(d=> {
        return 0;
    })
    .y1((d, i, n)=> {
        let dat = Object.keys(d).length - 1
        let x = d3.scaleLinear().domain([0, 50]).range([0, ((dimensions.predictedWidth/n.count)*.7)]).clamp(true);
        return x(dat); 
    });

    continDist.each((d, i, nodes)=> {
        let distrib = d3.select(nodes[i])
            .selectAll('g')
            .data([d.bins])
            .join('g')
            .classed('distribution', true);
        distrib.attr('transform', 'translate(11, '+dimensions.height+') rotate(-90)');
        let path = distrib.append('path').attr('d', lineGen);
        path.attr("fill", "rgba(133, 193, 233, .4)")
        .style('stroke', "rgba(133, 193, 233, .9)");
    });

    let contRect = continDist.append('rect')
        .attr('height', dimensions.height)
        .attr('width', 10)
        .style('fill', 'none')
        .style('stroke', 'gray');

    let rangeRect = continDist.selectAll('rect.range').data(d=> {
        let newData = d.data.map(m=> {
            m.range = d.range;
            return m;
        })
        return newData}).join('rect').classed('range', true);

    rangeRect.attr('width', 10);
    rangeRect.attr('height', (d, i)=> {
        if(d.scales.yScale != undefined){
            let newy = d.scales.yScale;
            newy.range([80, 0]);
            return newy(d.values.lowerCI95) - newy(d.values.upperCI95)
        }else{
            return 0;
        }
    }).attr('transform', (d, i) => {
        let newy = d.scales.yScale;
        newy.range([80, 0]);
        return 'translate(0,'+newy(d.values.upperCI95)+')'
    });

    rangeRect.attr('fill', "rgba(133, 193, 233, .05)");

    let avRect = continDist.append('rect').attr('width', 10).attr('height', (d, i)=> {
        if(d.data[0] != undefined){
            return 3;
        }else{
            return 0;
        }
    });

    avRect.attr('transform', (d, i) => {
        if(d.data[0] != undefined){
            let newy = d.data[0].scales.yScale;
            newy.range([dimensions.height, 0]);
            let mean = d3.mean(d.data.map(m=> +m.values.realVal));
            return 'translate(0,'+newy(mean)+')';
        }else{
            return 'translate(0,0)';
        }
    }).attr('fill', '#004573');


     //////START BRANCH EXPERIMENT
     let brush = d3.brushY().extent([[0, 0], [20, dimensions.height]])
     brush.on('end', brushed);

     continDist.append("g")
     .classed('continuous-branch-brush', true)
     .attr("class", "brush")
     .call(brush);
 
    function brushed(){
        let data = d3.select(this.parentNode).data()[0]
        var s = d3.event.selection;

        var zero = d3.format(".3n");

        let index = d3.select('#toolbar').selectAll('.brush-span').size();
      
        let classLabel = index === 0 ? 'one' : 'two';

        if(s != null){
            let treeTest = d3.select('#sidebar').selectAll('.node').filter(f=> {
                return f.data.leaf === true});

            if(treeTest.empty()){
                renderTree(d3.select('#sidebar'), null, true);
            }
            
            let y = d3.scaleLinear().domain([data.domain[0], data.domain[1]]).range([0, dimensions.height])
            let attribute = data.key;
            let brushedVal = [y.invert(s[1]), y.invert(s[0])];

            let treeNode  = d3.select('#sidebar').selectAll('.node');

            let selectedNodes = brushedNodes(data, brushedVal, classLabel);
            let selectedBranch = selectedNodes[0];
            let secondGrp = selectedNodes[1];
            let antiSelected = selectedNodes[2];
            let antiSecond = selectedNodes[3];

            if(index < 2){

                let doesItExist = d3.select('#toolbar').selectAll('.brush-span').filter((f, i, n)=> {
                    return d3.select(n[i]).attr('value') == `${data.bins.groupLabel}-${data.key}`;
                });
    
                if(doesItExist.size() === 0){

                    d3.select(this).select('.selection')
                    .style('fill', `${brushColors[index][0]}`)
                    .attr('stroke', `${brushColors[index][0]}`)
                    .attr('stroke-width', 2);

                    d3.select(this).select('.overlay')
                    .attr('stroke', brushColors[index][1])
                    .attr('stroke-width', 2);

                    let badge = d3.select('#toolbar')
                        .append('span')
                        .attr('class', classLabel)
                        .attr('id', classLabel)
                        .classed('brush-span', true)
                        .classed(`${data.bins.groupLabel}`, true)
                        .classed('badge badge-secondary', true)
                        .style('background', brushColors[index][0])
                        .attr('value', `${data.bins.groupLabel}-${data.key}`)
                        .datum(this)
                        .text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);

                    let xOut = badge.append('i').classed('close fas fa-times', true).style('padding-left', '10px');

                    xOut.on('click', (d, i, n)=> {
                        d3.select(d).call(brush.move, null);
                        d3.select(n[i].parentNode).remove();
                        d3.select(d).select('.overlay').attr('stroke-width', 0);
                    });
    
                }else{

    
                    doesItExist.text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);
                    let xOut = doesItExist.append('i').classed('close fas fa-times', true).style('padding-left', '10px');

                    xOut.on('click', (d, i, n)=> {
                        d3.select(d).call(brush.move, null);
                        d3.select(d).select('.overlay').attr('stroke-width', 0);
                        d3.select(n[i].parentNode).remove();
                    });
                   
                    d3.select(doesItExist.datum()).call(brush.move, null);
                    d3.select(doesItExist.datum()).select('.overlay').attr('stroke-width', 0)

                    doesItExist.datum(this)

                    treeNode.selectAll(`.${data.key}`)
                        .selectAll(`${data.bins.groupLabel}`)
                        .selectAll('.second-branch')
                        .classed('second-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);

                    treeNode.selectAll(`.${data.key}`)
                        .selectAll('.selected-branch')
                        .classed('selected-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);

                        treeNode.selectAll(`.${data.key}`)
                        .selectAll('.anti-brushed-second')
                        .classed('anti-brushed-second', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);

                        treeNode.selectAll(`.${data.key}`)
                        .selectAll('.anti-brushed-branch')
                        .classed('anti-brushed-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);


                    let label = doesItExist.attr('id');

                    index = label === 'one' ? 0 : 1;

                    d3.select(this).select('.selection')
                        .style('fill', `${brushColors[index][0]}`)
                        .attr('stroke', `${brushColors[index][0]}`)
                        .attr('stroke-width', 2);

                    d3.select(this).select('.overlay')
                        .attr('stroke', brushColors[index][1])
                        .attr('stroke-width', 2);

                    brushedNodes(data, brushedVal, label);
                    
                }

            }else{

                d3.select('#toolbar').selectAll('.brush-span').filter((f, i)=> i === 0).remove();

                let classLabel = colorBool === 0 ? 'one': 'two';

                d3.select('#toolbar')
                    .append('span')
                    .attr('class', )
                    .classed('brush-span', true)
                    .classed('badge badge-secondary', true)
                    .style('background', brushColors[colorBool][0])
                    .attr('value', `${data.bins.groupLabel}-${data.key}`)
                    .text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);
                colorBool === 0 ? colorBool = 1 : colorBool = 0;
                secondGrp.classed(classLabel, true);
                selectedBranch.classed(classLabel, true);
            }

        }else{
            d3.selectAll(`.${data.key}.brushed-branch`).classed('brushed-branch', false);
            d3.selectAll(`.${data.key}.brushed-second`).classed('brushed-second', false);
        }
     }

     ///OBSERVED/////

     let observedWrap = binnedWrap.append('g').classed('observed', true);
     observedWrap.attr('transform', (d, i, n)=> {
         return 'translate('+ (dimensions.predictedWidth + 150) +', 0)'})


    ////OBSERVED CONTIUOUS/////

    let contOb = observedWrap.filter(f=> f.type === 'continuous');
    contOb.attr('transform', `translate(${dimensions.predictedWidth + 160}, -15)`)

    let contBars = contOb.selectAll('g.ob-bars').data(d=> {
        return d.leafData.bins}).join('g').classed('ob-bars', true);

    let cRects = contBars.append('rect').attr('width', (d, i, n)=> {
        let width = dimensions.observedWidth / n.length;
        return width;
    }).attr('height', (d, i)=> {
        let y = d3.scaleLinear().domain([0, Object.keys(d).length]).range([(dimensions.height - dimensions.margin), 0])
        return y(Object.keys(d).length - 2)
    }).attr('fill', 'rgba(133, 193, 233, .5)');

    contBars.attr('transform', (d, i, n)=> {
        let movex = dimensions.observedWidth / n.length;
        let y = d3.scaleLinear()
            .domain([0, Object.keys(d).length])
            .range([(dimensions.height - dimensions.margin), 0]);

        let movey = dimensions.height - y(Object.keys(d).length - 2);
        return 'translate('+(movex * i)+', '+movey+')'});

    contOb.each((d, i, nodes)=> {

        let xvalues = d.leafData.data.map(m=> {
            return +m.values.realVal});
        let x = d3.scaleLinear()
            .domain([d3.min(xvalues), d3.max(xvalues)])
            .range([0, dimensions.observedWidth]);

        let y = d3.scaleLinear()
            .domain([0, d3.max(d.leafData.bins.map(b=> Object.keys(b).length)) - 2])
            .range([(dimensions.height - dimensions.margin), 0]);
        
        d3.select(nodes[i])
            .append('g')
            .classed('x-axis', true)
            .call(d3.axisBottom(x))
            .attr('transform', 'translate(0, '+dimensions.height+')')

        d3.select(nodes[i]).append('g')
            .classed('y-axis', true)
            .call(d3.axisLeft(y).ticks(4))
            .attr('transform', 'translate(0, '+dimensions.margin+')');

            d3.select(nodes[i]).select('.x-axis').selectAll('text').style('font-size', '8px');
            d3.select(nodes[i]).select('.y-axis').selectAll('text').style('font-size', '8px');

            d3.select(nodes[i])
            .append('g')
            .classed('x-axis-label', true)
            .append('text').text('Frequency')
            .attr('transform', `translate(-20, ${dimensions.height- 10}) rotate(-90)`)
            .style('font-size', '10px');

    });
    
    ////Observed Discrete////
    let discOb =  observedWrap.filter(f=> f.type === 'discrete');

    discOb.attr('transform', `translate(${dimensions.predictedWidth + 160}, 5)`)
    let discBars = discOb.selectAll('g.ob-bars').data(d=> {
        return d.stateKeys.map((key, i)=>{
            return {state: key, data: d.leafData.bins[i], max: d3.sum(d.leafData.bins.map(b=> b.length))}
        });
    }).join('g').classed('ob-bars', true);
    let dRects = discBars.append('rect').attr('width', (d, i, n)=> {
        let width = dimensions.observedWidth / n.length;
        return width;
    }).attr('height', (d, i, n)=> {
        let height = d.data[0] ? (d.data[0].scales.stateColors.length * dimensions.squareDim - 10): 0;
        let y = d3.scaleLinear().domain([0, d.max]).range([0, (height)])
        return y(d.data.length);
    }).attr('fill', (d, i) => {
        return d.data[0] != undefined ? d.data[0].color : '#fff';
    }).attr('opacity', 0.3);

    discBars.attr('transform', (d, i, n)=> {
        let movex = dimensions.observedWidth / n.length;
        let height = d.data[0] ? (d.data[0].scales.stateColors.length * dimensions.squareDim - 10) : 0;
        let y = d3.scaleLinear().domain([0, d.max]).range([0, (height-5)])
        let movey = (height-5) - y(d.data.length);
        return 'translate('+(movex * i)+', '+movey+')'});

    dRects.on('mouseover', (d, i, n)=> {
        let state = d3.select('g.'+d[0].label).selectAll('g.state');
        state.filter(f=> {
            return f[0].state === d[0].winState}).attr('opacity', 0.8);
        state.filter(f=> f[0].state != d[0].winState).attr('opacity', 0.1);
        d3.select(n[i]).attr('opacity', 0.9);
    }).on('mouseout', (d, i, n)=> {
        d3.select(n[i]).attr('opacity', 0.3);
        let state = d3.select('g.'+d[0].label).selectAll('g.state').attr('opacity', 0.6);
    });

    discOb.each((d, i, nodes)=> {
            let labels = d.leafData.bins.map(b=> {
                return b[0] != undefined ? b[0].winState : '';
                })
            let xPoint = d3.scalePoint().domain(d.stateKeys).range([0, dimensions.observedWidth]).padding(.6)
            let height = d.stateKeys ? (d.stateKeys.length * dimensions.squareDim - 10) : 0;
            let y = d3.scaleLinear().domain([0, d.leafData.data.length]).range([(height), 0]);
            d3.select(nodes[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(4))//.attr('transform', 'translate(0, '+height+')');
            d3.select(nodes[i]).append('g').classed('x-axis', true).call(d3.axisBottom(xPoint)).attr('transform', 'translate(0, '+height+')');

            d3.select(nodes[i]).select('.x-axis').selectAll('text').style('font-size', '8px');
            d3.select(nodes[i]).select('.y-axis').selectAll('text').style('font-size', '8px');
    });

}

function brushedNodes(data, brushedVal, classLabel){
    let time = d3.extent(data.data.map(d=> d.combLength))
    let nodes = data.data.filter(f=> {
        return (f.values.realVal >= brushedVal[0]) && (f.values.realVal <= brushedVal[1]);
    })
    let notNodes = data.data.filter(f=> {
        return (f.values.realVal < brushedVal[0]) || (f.values.realVal > brushedVal[1]);
    });
   
    let nodeNames = nodes.map(m=> m.node);
    let notNodeNames = notNodes.map(m=> m.node);

    let timeNodes = d3.extent(nodes.map(m=> m.combLength));
    let treeNode = d3.select('#sidebar').selectAll('.node');

    let selectedBranch = treeNode.filter(f=> {
        return nodeNames.indexOf(f.data.node) > -1;
    }).classed('brushed-branch', true);

    let notNodeSelectedBranch = treeNode.filter(f=> notNodeNames.indexOf(f.data.node) > -1).classed('anti-brushed', true);

    let test = pullPath([], selectedBranch.data(), [], [], 0);
    let notTest = pullPath([], notNodeSelectedBranch.data(), [], [], 0);

    let testtest = test.flatMap(t=> t).filter(f=>{
        return f.data.attributes[data.key].values.realVal >= brushedVal[0] && f.data.attributes[data.key].values.realVal <= brushedVal[1];
    }).map(m=> m.data.node);

    let notTestTest = notTest.flatMap(t=> t).filter(f=>{
        return f.data.attributes[data.key].values.realVal < brushedVal[0] || f.data.attributes[data.key].values.realVal > brushedVal[1];
    }).map(m=> m.data.node);
    
    let secondGrp = treeNode.filter(f=> (nodeNames.indexOf(f.data.node) === -1)&&(testtest.indexOf(f.data.node) > -1))
        .classed('brushed-second', true)
        .classed(`${data.key}`, true)
        .classed(classLabel, true);
    let secondLinks = d3.select('#sidebar').selectAll('.link')
        .filter(f=> (nodeNames.indexOf(f.data.node) === -1)&&(testtest.indexOf(f.data.node) > -1))
        .classed('brushed-second', true)
        .classed(`${data.key}`, true)
        .classed(classLabel, true);
    
    selectedBranch.classed(`${data.key}`, true).classed(classLabel, true).classed('brushed-branch', true);
   
    let notNodeSecondGrp = treeNode
        .filter(f=> (notNodeNames.indexOf(f.data.node) === -1 )&& (notTestTest.indexOf(f.data.node) > -1))
        .classed('anti-brushed-second', true)
        .classed(`${data.key}`, true)
        .classed(classLabel, true);

    let secondAntiLinks = d3.select('#sidebar').selectAll('.link')
            .filter((f, j)=> (notNodeNames.indexOf(f.data.node) === -1)&&(notTestTest.indexOf(f.data.node) > -1));
    secondAntiLinks.classed('anti-brushed-second', true).classed(`${data.key}`, true).classed(classLabel, true);
 
    notNodeSelectedBranch.classed('anti-brushed', true).classed(classLabel, true).classed(classLabel, true);


    return [selectedBranch, secondGrp, notNodeSelectedBranch, notNodeSecondGrp];
}
