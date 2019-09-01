import '../styles/index.scss';
import * as d3 from "d3";
import {pathSelected} from './selectedPaths';
import {formatAttributeData} from './dataFormat';
import {filterMaster, nodeFilter, getLatestData, leafStateFilter} from './filterComponent';
import { drawBranchPointDistribution } from './distributionView';

export function drawPathsAndAttributes(pathData, main, calculatedScales, moveMetric){

    let nodeTooltipFlag = true;

    let collapsed = d3.select('#scrunch').attr('value');
  
    main.select('#main-path-view').selectAll('*').remove();

    let pathGroups = renderPaths(pathData, main, calculatedScales, moveMetric);
  
      /// LOWER ATTRIBUTE VISUALIZATION ///
    let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
    let attrHide = filterMaster.filter(f=> f.type === 'hide-attribute').map(m=> m.attribute);

    let attKeys = attrHide.length > 0 ? calculatedScales.filter(f=> attrHide.indexOf(f.field) === -1).map(m=> m.field) : null;

    let attData = formatAttributeData(pathData, calculatedScales, attKeys);

    let attrMove = attKeys === null ? calculatedScales.length : attKeys.length;

    let predictedAttrGrps = renderAttributes(attributeWrapper, attData, calculatedScales, null, collapsed);
    let attributeHeight = (collapsed === 'true')? 22 : 45;
    pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (attrMove + 1))) +')');
    
    let cGroups = drawContAtt(predictedAttrGrps, moveMetric, collapsed);
    let dGroups = drawDiscreteAtt(predictedAttrGrps, moveMetric, collapsed, false);
    sizeAndMove(main.select('#main-path-view'), attributeWrapper, pathData, (attrMove * attributeHeight));



    let leafStates = d3.selectAll('.discrete-leaf');
    leafStates.on('click', (d, i)=> {
        if(nodeTooltipFlag){
            nodeTooltipFlag = false;
            d3.select("#state-tooltip").classed("hidden", true);
        }else{
            nodeTooltipFlag = true;
            d3.select("#state-tooltip")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px")
            .select("#value")
            .text(d.winState);
            d3.select("#state-tooltip").classed("hidden", false);

            d3.select("#filter-by-state").on('click', ()=> {
                
                leafStateFilter(d, calculatedScales);
                nodeTooltipFlag = false;
                d3.select("#state-tooltip").classed("hidden", true);

            });

            d3.select("#select-by-state").on('click', ()=> {
                let data = getLatestData();
                let test = data.filter(path => {
                    return path[path.length - 1].attributes[d.label].winState === d.winState;
                });

                let notIt = data.filter(path => {
                    return path[path.length - 1].attributes[d.label].winState != d.winState;
                });
            
                nodeTooltipFlag = false;
                d3.select("#state-tooltip").classed("hidden", true);

                pathSelected(test, notIt, calculatedScales, moveMetric);

            });

        }});

    return pathGroups;

}
export function sizeAndMove(svg, attribWrap, data, attrMove){
        //tranforming elements
    svg.style('height', ((data.length * (attrMove + 52))) + 'px');
    attribWrap.attr('transform', (d)=> 'translate(140, 25)');
        ///////////////////////////////////
}
export function renderPaths(pathData, main, scales, moveMetric){
    
    ////YOU SHOULD MOVE THESE APPENDING THINGS OUT OF HERE///////
    /////Rendering ///////
    let svgTest = main.select('#main-path-view');
    let svg = svgTest.empty() ? main.append('svg').attr('id', 'main-path-view') : svgTest;
    
    let nodeTooltipFlag = false;

    let pathWrapTest = svg.select('.path-wrapper');
    let pathWrap = pathWrapTest.empty() ? svg.append('g').classed('path-wrapper', true) : pathWrapTest;
    pathWrap.attr('transform', (d, i)=> 'translate(0,20)');

      /////Counting frequency of nodes//////
    let branchFrequency = pathData.flatMap(row=> row.flatMap(f=> f.node)).reduce(function (acc, curr) {
        if (typeof acc[curr] == 'undefined') {
          acc[curr] = 1;
        } else {
          acc[curr] += 1;
        }
        return acc;
        }, {});

     ///Scales for circles ///
    
    let circleScale = d3.scaleLog().range([6, 14]).domain([1, d3.max(Object.values(branchFrequency))]);

    let pathGroups = pathWrap.selectAll('.paths').data(pathData).join('g').classed('paths', true);
 
    let pathBars = pathGroups.append('rect').classed('path-rect', true);
    pathBars.attr('y', -8);

    //////////
    ///Selecting species
    /////////
    let pathAdd = pathGroups.append('g').classed("fas fa-search-plus", true);
    pathAdd.attr('transform', 'translate(15, 10)');
    pathAdd.append('circle').attr('r', 7).attr('fill', '#fff');
    pathAdd.append('text').text('+').attr('transform', 'translate(-5, 5)');

    pathAdd.style('cursor', 'pointer');

    pathAdd.on('click', (d, i, n)=>{

        let notIt = d3.selectAll(n).filter((f, j)=> j != i).classed('selected-path', false);
     
        if(d3.select(n[i]).classed('selected-path')){
            d3.select(n[i]).classed('selected-path', false);
            pathSelected(null, notIt.data(), scales, moveMetric);
        }else{
            d3.select(n[i]).classed('selected-path', true);
            pathSelected([d], notIt.data(), scales, moveMetric);
        }
    });

    /////////
    pathGroups.on('mouseover', function(d, i){
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let treeLinks  = d3.select('#sidebar').selectAll('.link');
        treeNode.filter(f=> {
            return d.map(m=> m.node).indexOf(f.data.node) > -1;
        }).classed('hover', true);
        treeLinks.filter(f=> d.map(m=> m.node).indexOf(f.data.node) > -1).classed('hover', true);
        return d3.select(this).classed('hover', true);
    }).on('mouseout', function(d, i){
        let treeNode  = d3.select('#sidebar').selectAll('.node').classed('hover', false);
        let treeLinks  = d3.select('#sidebar').selectAll('.link').classed('hover', false);
        return d3.select(this).classed('hover', false);
    });

    let speciesTitle = pathGroups.append('text').text(d=> {
      
       let string = d.filter(f=> f.leaf === true)[0].label;
        return string.charAt(0).toUpperCase() + string.slice(1);
    });

    speciesTitle.attr('x', 25).attr('y', 15);

    let timelines = pathGroups.append('g').classed('time-line', true);
    timelines.attr('transform', (d, i)=> 'translate(150, 0)');

    let lines = timelines.append('line')
    .attr('x1', 0)
    .attr('x2', 1000)
    .attr('y1', 15)
    .attr('y2', 15);

    let nodeGroups = timelines.selectAll('.node').data((d)=> {
        return d}).join('g').attr('class', (d, i, n)=> {
            return d3.select(n[n.length - 1]).data()[0].label + " node";
        });
   
    nodeGroups.attr('transform', (d)=> {
        let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
        let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
        return 'translate('+ distance +', 10)';});

    nodeGroups.on('click', (d, i, n)=> {
        if(nodeTooltipFlag){
            nodeTooltipFlag = false;
            d3.select("#branch-tooltip").classed("hidden", true);
        }else{
            nodeTooltipFlag = true;
            d3.select("#branch-tooltip")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px")
            .select("#value")
            .text(d.node);
            d3.select("#branch-tooltip").classed("hidden", false);

            d3.select("#filter-by-node").on('click', ()=> {
                nodeFilter(d.node, scales);
                nodeTooltipFlag = false;
                d3.select("#branch-tooltip").classed("hidden", true);
            });

            d3.select("#select-by-node").on('click', ()=> {
                let data = getLatestData();
                let test = pathGroups.filter(path => {
                    return path.map(node => node.node).indexOf(d.node) > -1;
                });
                let notIt = pathGroups.filter(path => {
                    return path.map(node => node.node).indexOf(d.node) === -1;
                });

                nodeTooltipFlag = false;
                d3.select("#branch-tooltip").classed("hidden", true);

                pathSelected(test.data(), notIt.data(), scales, moveMetric);

            });
        }
          
    });

    let circle = nodeGroups.append('circle').attr('cx', 0).attr('cy', 0).attr('r', d=> {
        return circleScale(branchFrequency[d.node]);
    }).attr('class', (d, i)=> 'node-'+d.node);

    circle.on('mouseover', function(d, i){
        let hovers = nodeGroups.filter(n=> n.node === d.node);
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let selectedBranch = treeNode.filter(f=> f.data.node === d.node).classed('selected-branch', true);
        return hovers.classed('hover-branch', true);
    }).on('mouseout', function(d, i){
        let hovers = nodeGroups.filter(n=> n.node === d.node);
        d3.selectAll('.selected-branch').classed('selected-branch', false);
        return hovers.classed('hover-branch', false);
    });

    let speciesNodeLabel = nodeGroups.filter(f=> f.label != undefined).append('text').text(d=> {
        let string = d.label.charAt(0).toUpperCase() + d.label.slice(1);
        return string;
    }).attr('x', 10).attr('y', 5);

    return pathGroups;
}
export function renderAttributes(attributeWrapper, data, scales, filterArray, collapsed){
    let attributeHeight = (collapsed === 'true')? 20 : 45;
    let predictedAttrGrps = attributeWrapper.selectAll('g').data((d, i)=> data[i]).join('g');
    predictedAttrGrps.classed('predicated-attr-groups', true);
    predictedAttrGrps.attr('transform', (d, i) => 'translate(0, '+(i * (attributeHeight + 5))+')');

    let attrLabel = predictedAttrGrps.append('text').text(d=> d[d.length - 1].label);
    attrLabel.classed('attribute-label', true);
    attrLabel.attr('transform', 'translate(-15, 20)');

    return predictedAttrGrps;
}
function collapsedPathGen(data){
    data.map((p, i)=>{
        let step = i === 0 ? 0 : 1;
        let test = (p.realVal > data[i-step].realVal) ? 1 : 18;
        p.change = test;
    })
}
async function continuousPaths(innerTimeline, moveMetric, collapsed){

    innerTimeline.data().forEach(path => {
        collapsedPathGen(path, moveMetric);
    });

    //THIS IS THE PATH GENERATOR FOR THE CONTINUOUS VARIABLES
    let height = (collapsed === 'true')? 20 : 45;
    var lineGen = d3.line()
    .x(d=> {
        let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
        let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
        return distance; })
    .y(d=> {
        let y = d.yScale;
        y.range([height, 0]);
        if(collapsed === 'true'){
            return d.change;
        }else{
            return y(d.realVal);
        }
    });

    let innerPaths = innerTimeline.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line")
    .style('stroke', (d)=> d[0].color);

    return innerPaths;
    ///////////////////////////////////////////////////////////
}
export function drawContAtt(predictedAttrGrps, moveMetric, collapsed){

    let continuousAtt = predictedAttrGrps.filter(d=> {
        return (d[d.length - 1] != undefined) ? d[d.length - 1].type === 'continuous' : d.type === 'continuous';
    });

    let attributeHeight = (collapsed === 'true') ? 20 : 45;

    let innerTimeline = continuousAtt.append('g').classed('attribute-time-line', true);
    /////DO NOT DELETE THIS! YOU NEED TO SEP CONT AND DICRETE ATTR. THIS DRAWS LINE FOR THE CONT/////
    let innerPaths = continuousPaths(innerTimeline, moveMetric, collapsed);
 ////////
    let attribRectCont = innerTimeline.append('rect').classed('attribute-rect', true);
    attribRectCont.attr('height', attributeHeight);
    let attributeNodesCont = innerTimeline.selectAll('g').data(d=> d).join('g').classed('attribute-node', true);

    let innerBars = attributeNodesCont.append('g').classed('inner-bars', true);

    let innerRect = innerBars.append('rect').classed('attribute-inner-bar', true);
    innerRect.attr('height', attributeHeight);
    innerBars.attr('transform', (d)=> {
        let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
        let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
        return 'translate('+ distance +', 0)';});
      
    let rangeRect = innerBars.append('rect').classed('range-rect', true);
    rangeRect.attr('width', 20).attr('height', (d, i)=> {
        let y = d.yScale;
        y.range([attributeHeight, 0]);
        let range = d.leaf ? 0 : y(d.lowerCI95) - y(d.upperCI95);
        let barHeight = (collapsed === 'true') ? 20 : range;
        return barHeight;
    });
    rangeRect.attr('transform', (d, i)=> {
        let y = d.yScale;
        y.range([attributeHeight, 0]);
        let move = (d.leaf || (collapsed === 'true')) ? 0 : y(d.upperCI95);
        return 'translate(0, '+ move +')';
    });
    rangeRect.style('fill', (d)=> {
        return d.colorScale(d.realVal);
    });
    rangeRect.attr('opacity', (d)=> {
        return d.satScale(d.realVal);
    });
    if(collapsed != 'true'){
        innerBars.append('rect').attr('width', 20).attr('height', 5)
        .attr('transform', (d, i)=> {
            let y = d.yScale;
            y.range([attributeHeight, 0]);
            return 'translate(0, '+ y(d.realVal) +')';})
        .attr('fill', d=> d.color).classed('val-bar', true);
    }

    /////AXIS ON HOVER////
    innerBars.on('mouseover', (d, i, n)=> {
        let y = d.yScale;
        y.range([0, attributeHeight]);
        d3.select(n[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(5));
        let tool = d3.select('#tooltip');
        tool.transition()
          .duration(200)
          .style("opacity", .9);
        let f = d3.format(".3f");
        tool.html('mean: '+f(d.realVal) +"</br>"+"</br>"+ 'upperCI: '+ f(d.upperCI95) +"</br>"+"</br>"+ 'lowerCI: '+ f(d.lowerCI95))
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
        tool.style('height', 'auto');
       
    }).on('mouseout', (d, i, n)=> {
        d3.select(n[i]).select('g.y-axis')
        d3.select(n[i]).select('g.y-axis').remove();
        let tool = d3.select('#tooltip');
        tool.transition()
          .duration(500)
          .style("opacity", 0);
    });

    return attributeNodesCont;
   
}
export function drawGroups(stateBins, scales){
   
    let height = 40;
    let main = d3.select('#main');
    
    let svgTest = main.select('#main-path-view');
    let svg = svgTest.empty() ? main.append('svg').attr('id', 'main-path-view') : svgTest;
    svg.selectAll('*').remove();

    svg.attr('height', (stateBins.length * (height + 20)));
    svg.append('g').attr('transform', 'translate(500, 20)').append('text').text(stateBins[0].field)

    let wrappers = svg.selectAll('.grouped').data(stateBins).join('g').classed('grouped', true);
    
    /*
    let wrapRect = wrappers.append('rect').attr('width', 1000);
    wrapRect.attr('height', height);
    wrapRect.style('fill', '#fff');
    wrapRect.style('stroke', 'red');
    */
    wrappers.each((d, i, n)=> {
        let branchBar = drawBranchPointDistribution(d.data, d3.select(n[i]));
        branchBar.select('.leaf-label').append('text').text((d, i) =>': '+ d.data.length).attr('transform', 'translate(45, 0)');

    });

    let groupLabels = wrappers.append('text').text((d, i)=> d.state);
    groupLabels.attr('transform', (d, i)=> 'translate(90, '+((height/2)+ 5)+')');
    groupLabels.style('text-anchor', 'end');

    let innerGroup = wrappers.append('g').classed('inner-wrap', true);
    innerGroup.attr('transform', (d,i)=> 'translate(100, 0)');
/*
    let innerWrapRect = innerGroup.append('rect').attr('width', 900);
    innerWrapRect.attr('height', height);
    innerWrapRect.style('fill', '#fff');
    innerWrapRect.style('stroke', 'gray');
*/
    let attWraps = innerGroup.selectAll('.att-wrapper').data((d, i)=> {
        let atts = formatAttributeData(d.data, scales, null);
        let attDataComb = atts[0].map((att, i)=> {
            let species = d.data[0].filter(f=> f.leaf === true)[0].label;
            att[att.length - 1].offset = 0;
            let attribute = {'label': att[att.length-1].label, 'type':att[att.length-1].type, 'data': [{'species': species, 'paths': att}]}
            for(let index = 1; index < atts.length; index++ ){
                let species = d.data[index].filter(f=> f.leaf === true)[0].label;
                let last = atts[index][i].length - 1
                atts[index][i][last].offset = (index * 8);
                attribute.data.push({'species': species, 'paths': atts[index][i]})
            }
            return attribute;
        });
        
        function findMaxState(states, offset){
            let maxP = d3.max(states.map(v=> v.realVal));
            let notMax = states.filter(f=> f.realVal != maxP);
            let winState = states[states.map(m=> m.realVal).indexOf(maxP)]
            winState.other = notMax;
            winState.offset = offset;
    
            return winState;
        }

       let mappedDis = attDataComb.map(dis=> {
           dis.data = dis.data.map((spec, i)=> {
               spec.paths = spec.paths.map(m=> {
                if(dis.type === 'discrete'){
                    let offset = 5 * i;
                    let maxProb = m.states? {'realVal': 1.0, 'state': m.winState, 'color':m.color, 'edgeMove': m.edgeMove, 'offset':m.offset, 'leaf': true} : findMaxState(m, offset); 
                    return maxProb;
                }else{
                    return m;
                }
            });
            return spec;
           });
           return dis;
       });
       console.log('mdiss',mappedDis)
       return mappedDis;
    }).join('g').classed('att-wrapper', true);

    wrappers.attr('transform', (d, i)=> 'translate(10,'+(i * (5 * height)+ 50)+')');
    svg.attr('height', 1000);

    let labels = attWraps.append('text')
    .text(d=> d.label)
    .style('text-anchor', 'end')
    .style('font-size', 11)
    labels.attr('transform', 'translate(0,'+(50/2)+')');

    let speciesGrp = attWraps.selectAll('g').data(d=> {
        d.data = d.data.map(m=> {
            m.type = d.type;
            return m;
        });
        return d.data;
    }).join('g').classed('species', true);

    let lineGenD = d3.line()
       .x(d=> {
           let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
           let distance = d.edgeMove;
           return x(distance);
        })
       .y(d=> {
           let y = d3.scaleLinear().domain([0, 1]).range([20-2, 1]);
           //return y(d.realVal) + d.offset;
           return y(d.realVal);
       });

       let lineGenC = d3.line()
       .x(d=> {
           let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
           let distance = d.edgeMove;
           return x(distance);
        })
       .y(d=> {
           let y = d.yScale;
           y.range([20-2, 1]);
           return y(d.realVal) + 2;
       });

       let innerStatePaths = speciesGrp.append('path')
       .attr("d", d=> {
            return (d.type === 'discrete') ? lineGenD(d.paths) : lineGenC(d.paths);
        })
       .attr("class", (d, i)=> {
            return d.species + " inner-line"})
       .style('stroke-width', 0.7)
       .style('fill', 'none')
       .style('stroke', 'gray');

}
export function drawDiscreteAtt(predictedAttrGrps, moveMetric, collapsed, bars){

    let discreteAtt = predictedAttrGrps.filter(d=> {
        return d[d.length - 1].type === 'discrete';
    });

    discreteAtt.selectAll('*').remove();

    let attributeHeight = (collapsed === 'true')? 20 : 45;

    let innerTimelineDis = discreteAtt.append('g').classed('attribute-time-line', true);

    innerTimelineDis.append('line').classed('half', true).attr('x1', 0).attr('y1', 22).attr('x2', 1010).attr('y2', 22);
    
    let statePath = innerTimelineDis.selectAll('g').data(d=> {
        let disct = d.map(m=> {
            let test = (m.leaf == true) ? m.states.map(s=> {
                s.move = m.move;
                s.edgeMove = m.edgeMove;
                s.color = m.color;
                return s;
            }) : m;
            return test;
        });
        let keys = disct[0].map(s=> s.state);
        let lines = keys.map(key=> {
            return disct.map(m=> m.filter(f=> f.state == key)[0]);
        });
        return lines;
    }).join('g').classed('state-path', true);

    var lineGen = d3.line()
    .x(d=> {
        let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
        let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
        return distance + 7;})
    .y(d=> {
        let y = d3.scaleLinear().domain([0, 1]).range([attributeHeight-2, 1]);
        return y(d.realVal);
    });

    let innerStatePaths = statePath.append('path')
    .attr("d", lineGen)
    .attr("class", (d, i)=> d[0].species + " inner-line")
    .style('stroke-width', 0.7)
    .style('stroke', (d)=> {
        return d[0].color;});

    let attribRectDisc = innerTimelineDis.append('rect').classed('attribute-rect', true);
    attribRectDisc.attr('height', attributeHeight);
    let attributeNodesDisc = innerTimelineDis.selectAll('.attribute-node-discrete').data(d=> {
        return d;}).join('g').classed('attribute-node-discrete', true);

    attributeNodesDisc.attr('transform', (d)=> {
        let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
        if(d[0]){
            let distance = (moveMetric === 'move') ? d[0].move : x(d[0].edgeMove);
            return 'translate('+distance+', 0)';
        }else{
            let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
            return 'translate('+distance+', 0)';
        }
    });

    attributeNodesDisc.append('rect').attr('width', 20).attr('height', attributeHeight).attr('opacity', 0);

    attributeNodesDisc.append('line').attr('x1', 10).attr('x2', 10).attr('y1', 0).attr('y2', attributeHeight);

        /////AXIS ON HOVER////
    attributeNodesDisc.on('mouseover', (d, i, n)=> {
            let y = d3.scaleLinear().domain([1, 0]);
            y.range([0, attributeHeight]);
            d3.select(n[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(3));
        }).on('mouseout', (d, i, n)=> {
            d3.select(n[i]).select('g.y-axis')
            d3.select(n[i]).select('g.y-axis').remove();
        })

    if(bars === false){

        let stateDots = attributeNodesDisc.filter((att, i)=> att[0] != undefined).selectAll('.dots').data(d=> {
            return d;
        }).join('circle').classed('dots', true);
        
        stateDots.attr('cx', 10).attr('cy', (d)=> {
            let y = d3.scaleLinear().domain([0, 1]).range([attributeHeight - 2, 2]);
            return y(d.realVal);
        }).attr('r', 2).style('fill', d=> d.color);
    
        stateDots.filter(f=> f.realVal > 0.5).attr('r', 4);
    
        stateDots.on("mouseover", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(200)
              .style("opacity", .9);
            let f = d3.format(".3f");
            tool.html(d.state + ": " + f(d.realVal))
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
            })
          .on("mouseout", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(500)
              .style("opacity", 0);
            });
    
        let endStateDot = attributeNodesDisc.filter((att, i)=> {
            return att[0] === undefined;}).classed('discrete-leaf', true);
    
        endStateDot.append('circle').attr('cx', 10).attr('cy', 2).attr('r', 7).style('fill', d=> {
           return d.color;
        });
        ////NEED TO MAKE A FUNCTION TO ASSIGN COLOR OF STATES//////
    
        endStateDot.append('text').text(d=> d.winState).attr('transform', 'translate(20, 5)').style('font-size', 10);

    }else{
        attributeNodesDisc.filter((att, i)=> {
            return att[0] != undefined;}).append('rect').attr('height', attributeHeight).attr('width', 20).attr('fill', '#fff')
        let stateBars = attributeNodesDisc.filter((att, i)=> att[0] != undefined).selectAll('.dis-rect').data(d=> {
            return d;
        }).join('rect').classed('dis-rect', true);

        stateBars.attr('width', 20).attr('height', (d, i)=> {
         
            let y = d3.scaleLinear().domain([0, 1]).range([0, attributeHeight]);
            return y(d.realVal);
        });

        stateBars.attr('fill', (d, i)=> d.color);
        stateBars.attr('opacity', '0.7');
        stateBars.attr('stroke', '#fff');
        stateBars.attr('transform', (d, i, n)=> {
            let y = d3.scaleLinear().domain([0, 1]).range([0, attributeHeight]);
            let probability = d3.selectAll(n).data().sort((a, b)=> b.realVal - a.realVal);
            let chosenIn = probability.map(p=> p.state).indexOf(d.state);
         
            if(chosenIn === 0){
                    return 'translate(0,0)';
            }else{
                ///need to make this a reduce function///
                let valueAdd = 0;
                    for(let step = 0; step < chosenIn; step++){
                        valueAdd = valueAdd + probability[step].realVal;
                    }
                return 'translate(0,'+(y(valueAdd))+')';
            }
        });

        stateBars.on("mouseover", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(200)
              .style("opacity", .9);
            let f = d3.format(".3f");
            tool.html(d.state + ": " + f(d.realVal))
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
            })
          .on("mouseout", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(500)
              .style("opacity", 0);
            });
    
        let endStateDot = attributeNodesDisc.filter((att, i)=> {
            return att[0] === undefined;}).classed('discrete-leaf', true);
    
        endStateDot.append('circle').attr('cx', 10).attr('cy', 2).attr('r', 7).style('fill', d=> {
           return d.color;
        });

        endStateDot.append('text').text(d=> d.winState).attr('transform', 'translate(20, 5)').style('font-size', 10);

    }

    return attributeNodesDisc;
}

