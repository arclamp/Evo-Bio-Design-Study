import '../styles/index.scss';
import {formatAttributeData} from './dataFormat';
import * as d3 from "d3";
import {filterMaster} from './filterComponent';
import {dataMaster} from './index';

export function renderDistibutions(normedPaths, mainDiv, scales, moveMetric){

    let pathdata = (filterMaster.length > 0)? filterMaster : dataMaster[0];

    let observedWidth = 200;
    let predictedWidth = 800;
    let height = 80;
  
    let keys = Object.keys(normedPaths[0][0].attributes);

    let newNormed = [...pathdata];

    formatAttributeData(newNormed, scales, null);

    let maxBranch = d3.max(newNormed.map(p=> p.length)) - 1;
    let medBranchLength = d3.median(newNormed.map(p=> p.length)) - 1;

    let normBins = new Array(medBranchLength + 1).fill().map((m, i)=> {
        let step = 1 / medBranchLength;
        let base = (i > 0) ? ((i - 1) * step) : 0;
        let top = (i * step);
        return {'base': base, 'top': top, 'binI': i }
    });
   
    let internalNodes = newNormed.map(path => path.filter(node=> node.leaf != true));

    normBins.map((n, i)=> {
        let edges = internalNodes.flatMap(path => path.filter(node=> {
            if(i === 0){
                return node.edgeLength === 0;
            }else{
                return node.edgeLength > n.base && node.edgeLength <= n.top;
            }
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
                bin.fData = bin.data = [];
            }
            return {'data': bin.fData, 'range': [bin.base, bin.top], 'index': bin.binI, 'key': key };
        })
   
        if(scale.type === 'continuous'){
            let max = d3.max(mapNorm.flatMap(m=> m.data).map(v=> v.realVal));
            let min = d3.min(mapNorm.flatMap(m=> m.data).map(v=> v.realVal));
            let x = d3.scaleLinear().domain([min, max]).range([0, height])
    
            let histogram = d3.histogram()
            .value(function(d) { return d.realVal; })  
            .domain(x.domain())  
            .thresholds(x.ticks(20)); 
  
            mapNorm.forEach(n=> {
                n.type = scale.type;
                n.bins = histogram(n.data);
                return n;
            });
       
        }else{
            mapNorm.bins = null
        }
        let newK = {'key': key, 'branches': mapNorm, 'type': scale.type }
      
        return newK;
    });

    console.log(sortedBins)

    let svg = mainDiv.append('svg');
    svg.attr('id', 'main-summary-view');
    svg.attr('height', (keys.length * (height + 5)));

    let branchScale = d3.scaleLinear().domain([0, medBranchLength]).range([0, 780]);

    let wrap = svg.append('g').classed('summary-wrapper', true);
    wrap.attr('transform', 'translate(10, 0)');

    let binnedWrap = wrap.selectAll('.attr-wrap').data(sortedBins).join('g').attr('class', d=> d.key + ' attr-wrap');
    binnedWrap.attr('transform', (d, i)=>  'translate(0,'+(i * (height + 5))+')');
    
    let label = binnedWrap.append('text').text(d=> d.key).attr('y', 40).attr('x', 80).style('text-anchor', 'end');

    let branchGroup = binnedWrap.selectAll('g.branch-bin').data(d=> {
        ///THIS IS RIGHT
        console.log('data before the branch bins',d);
        return d.branches}).join('g').classed('branch-bin', true);
 
    branchGroup.attr('transform', (d, i)=> 'translate('+(100 + branchScale(i))+')');

    let continDist = branchGroup.filter(f=> f.type === 'continuous');

    var lineGen = d3.area()
    .curve(d3.curveCardinal)
    .x((d, i)=> {
        let y = d3.scaleLinear().domain([0, 16]).range([0, height]);
        return y(i); 
    })
    .y0(d=> {
        let x = d3.scaleLinear().domain([0, 50]).range([0, 90]).clamp(true);
        return x(0);
    })
    .y1(d=> {
        let dat = Object.keys(d).length - 1
        let x = d3.scaleLinear().domain([0, 50]).range([0, 80]).clamp(true);

        return x(dat); 
    });

    continDist.each((d, i, nodes)=> {
        let distrib = d3.select(nodes[i]).selectAll('g').data([d.bins]).join('g').classed('distribution', true);
        distrib.attr('transform', 'translate(11, 80) rotate(-90)');
        let path = distrib.append('path').attr('d', lineGen);
        path.attr("fill", "rgba(133, 193, 233, .4)")
        .style('stroke', "rgba(133, 193, 233, .9)");
    })

    let contRect = continDist.append('rect').attr('height', height).attr('width', 10).style('fill', 'none').style('stroke', 'gray');
    let rangeRect = continDist.selectAll('rect.range').data(d=> {

        let newData = d.data.map(m=> {
            m.range = d.range;
            return m;
        })
        return newData}).join('rect').classed('range', true);

    rangeRect.attr('width', 10);
    rangeRect.attr('height', (d, i)=> {
        if(d.yScale != undefined){
            let newy = d.yScale;
            newy.range([80, 0]);
            return newy(d.lowerCI95) - newy(d.upperCI95)
        }else{
            return 0;
        }
    }).attr('transform', (d, i) => {
        let newy = d.yScale;
        newy.range([80, 0]);
        return 'translate(0,'+newy(d.upperCI95)+')'
    });
    
    /*

    let xScale = d3.scaleLinear();
    if(moveMetric === 'move'){
        xScale.domain([0, (maxBranch - 1)]).clamp(true);
    }else{
        xScale.domain([0, 1]).clamp(true);
    }
   
    let svg = mainDiv.append('svg');
    svg.attr('id', 'main-summary-view');

    let addMoveToAttributes = keys.map(key=> {
            let filtered = newNormed.map(path=> {
                return path.filter(n=> n.leaf != true);
            });
           
            let maxBranches = filtered.filter(row=> row.length === maxBranch);
            let maxMove = d3.max(maxBranches.flatMap(f=> f.flatMap(flat=> flat.edgeMove)));

            let data = filtered.map(path=> {
               
                let prevStep = 0;
                return path.map((node, i)=> {
                    let attr = node.attributes[key];
                    let lastnode = path.length - 1;

                    let step = node.edgeLength + prevStep;
                    node.edgeMove = step;
                    prevStep = prevStep + node.edgeLength;

                    if(attr.type === 'discrete'){
                        let thisScale = xScale;
                        thisScale.range([0, 790]);
                        attr.move = thisScale(i);
                        //let x = d3.scaleLinear().domain([0, maxMove]).range([0, 790]).clamp(true);
                        attr.edgeMove = thisScale(node.edgeMove);
                        attr.states = node.attributes[key].states.map(s=> {
                            s.move = attr.move;
                            s.edgeMove = attr.edgeMove;
                            return s;
                        });
                    }else{//continuous///
                        let thisScale = xScale;
                        thisScale.range([0, 790]);
                        let metric = function(index, max){
                            if(index < lastnode){
                                return thisScale(index);
                            }else{
                                return thisScale(max - 1);
                            }
                        };
                       attr.move = metric(i, maxBranch);
                    
                       let x = d3.scaleLinear().domain([0, maxMove]).range([0, 790]).clamp(true);
                       attr.edgeMove = x(node.edgeMove);
                    }
                    return attr;
                });
            });
            data.attKey = key;
            return data;
    });

    let summarizedData = addMoveToAttributes.map(attr=> {
       
        if(attr[0][0].type === 'discrete'){
            
           // let binCount = d3.max(attr.map(row=> row.length));
            let moveMap = attr.filter(row=> row.length === maxBranch)[0];
        
            let stateKeys = attr[0][0].states.map(s=> s.state);
            let distrib = {};
            distrib.stateData = {};
            stateKeys.forEach(key => {
              
                 let distribution = Array(maxBranch).fill({'data':[]}).map((u, i)=> {
                     let newOb = {'data': u.data};
                     newOb.move = moveMap[i].move;
                     newOb.edgeMove = moveMap[i].edgeMove;
                     return newOb;
                 });
                 attr.forEach((row)=> {
                     let test = row.filter(r=> r.leaf != true).map(node=> node.states.filter(s=> s.state === key)[0]);
                     test.forEach((t, i)=> {
                         let newT = t;
                         distribution[i].data.push(newT);
                    });
                 });
                 
                 distrib.stateData[key] = {};
                 let data = distribution.map(drow=> {
                     let filtered = drow.data.filter(d=> {
                         return d.move === drow.move;});
                     return filtered;
                 });
                 
                 let color = data[0][0].color;
               
                 let thisScale = [...scales].filter(f=> f.field == attr.attKey)[0].scales.filter(f=> f.scaleName == key)[0].yScale;
            
                 thisScale.range([0, 80]);
                 thisScale.clamp(true);
               
                 let realMean = data.map(branch=> d3.mean(branch.map(b=> b.realVal)));
                 let realStDev = data.map(branch=> d3.deviation(branch.map(b=> b.realVal)));
                 let realStUp = realMean.map((av, i)=> av + realStDev[i]);
                 let realStDown = realMean.map((av, i)=> av - realStDev[i]);
     
                let scaleMean = data.map(branch=> d3.mean(branch.map(b=> thisScale(b.realVal))));
                let scaleStDev = data.map(branch=> d3.deviation(branch.map(b=> thisScale(b.realVal))));
                let scaleStUp = scaleMean.map((av, i)=> av + scaleStDev[i]);
                let scaleStDown = scaleMean.map((av, i)=> av - scaleStDev[i]);
                let x = d3.scaleLinear().range([0, 790]).domain([0, 1]);
                let moves = distribution.map(d=> {
                    let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
                    return distance; });

                let final = moves.map((m, j)=> {
                     return {
                         'x': m,
                         'realMean': realMean[j],
                         'realStDev': realStDev[j],
                         'realStUp': realStUp[j],
                         'realStDown': realStDown[j],
                         'scaleMean': scaleMean[j],
                         'scaleStDev': scaleStDev[j],
                         'scaleStUp': scaleStUp[j],
                         'scaleStDown': scaleStDown[j],
                        };
                 });

                 console.log('final', final);
                 console.log('distribution', distribution);
                 console.log('distrib', distrib);

                 distrib.stateData[key].pathData = final;
                 distrib.stateData[key].color = color;

             });
             distrib.attKey = attr.attKey;
             distrib.type = 'discrete';
             return distrib;
        }else{
            attr.type = 'continuous';
            let thisScale = [...scales].filter(f=> f.field == attr.attKey)[0].yScale;
            thisScale.range([0, 80]);//.scales.filter(f=> f.scaleName == key)[0].yScale;
            thisScale.clamp(true);
            let newScale = attr.map(row=> {
                return row.map(n=> {
                    n.scaleVal = thisScale(n.realVal);
                    n.scaledHigh = thisScale(n.upperCI95);
                    n.scaledLow = thisScale(n.lowerCI95);
                    return n;
                });
            });
          
            newScale.type = 'continuous';
            newScale.attKey = attr.attKey;
            return newScale;
        }
    });

    ////data for observed traits////
    let observed = keys.map(key=> {
        let leaves = newNormed.map(path=> {
            return path.filter(n=> n.leaf === true)[0];
        });

        let data = leaves.map(leaf=> {
            let attr = leaf.attributes[key];
            if(attr.type === 'continuous'){
                return attr.realVal;
            }else if(attr.type === 'discrete'){
                return attr.winState;
            }else{
                console.error('attribute type not found');
            }
        });

        if(leaves[0].attributes[key].type === 'discrete'){
            let colorScales = scales.filter(f=> f.field === key)[0].stateColors;
            let stateCategories = leaves[0].attributes[key].states.map(m=> m.state);
            let states = stateCategories.map(st=> {
                let color = colorScales.filter(f=> f.state == st)[0].color;
                let xScale = d3.scaleLinear().domain([0, stateCategories.length-1]);
            
                return {'key': st, 'count': data.filter(f=> f === st).length, 'x': xScale, 'color': color };
            });
            let max = d3.max(states.map(m=> m.count));
            states.forEach(state=> {
                state.max = max;
                state.y = d3.scaleLinear().domain([0, max + 10]);
            });
            return states;
        }else{
   
            let colorScales = scales.filter(f=> f.field === key)[0].catColor;
            
            var max = d3.max(data);
            var min = d3.min(data);

            let x = d3.scaleLinear().range([0, width]);
            x.domain([0, 10]);

            let y = d3.scaleLinear()
            .range([height, 0]);

             var histogram = d3.histogram()
             .value(d=> d)
             .domain([min, max])
             .thresholds(x.ticks(10));

            var bins = histogram(data);

            let maxY = d3.max(bins.map(m=> m.length));
            y.domain([0, maxY]);
            
            let newBins = bins.map(h=> {
                h.x = x;
                h.y = y;
                h.color = colorScales;
                return h;
            });

           return newBins;
        };
    });

    let combinedData = observed.map((ob, i)=> {
        return {'observed': ob, 'predicted': summarizedData[i]};
    });


    let attributeGroups = svg.selectAll('.combined-attr-grp').data(combinedData).join('g').classed('combined-attr-grp', true);
    attributeGroups.attr('transform', (d, i)=> 'translate(0,'+(i * 110)+')');

    let predictedAttrGrps = attributeGroups.append('g').classed('summary-attr-grp', true);

    let innerTime = predictedAttrGrps.append('g').classed('inner-attr-summary', true);
    innerTime.attr('transform', 'translate(105, 0)');
    innerTime.append('line').attr('x1', 0).attr('y1', 40).attr('x2', 800).attr('y2', 40).attr('stroke', 'gray').attr('stroke-width', 0.5);
    let attrRect = innerTime.append('rect').classed('attribute-rect-sum', true);
    attrRect.attr('x', 0).attr('y', 0).attr('height', 80).attr('width', 800);
    let label = predictedAttrGrps.append('text').text(d=> d.predicted.attKey);
    label.attr('x', 100).attr('y', 25).attr('text-anchor', 'end');
    let cont = innerTime.filter(f=> f.predicted.type === 'continuous');

    //////////experimenting with continuous rendering///////////////////////////////
    let contpaths = cont.selectAll('g.summ-paths').data(d=> d.predicted).join('g').classed('summ-paths', true);
   // contpaths = contEnter.merge(contpaths);

    var lineGen = d3.line()
    .x(d=> {
        if(moveMetric === 'move'){return d.move;}
        else{return d.edgeMove; }})
    .y(d=> d.scaleVal);

    let line = contpaths.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line-sum")
    .style('stroke', (d)=> d[0].color);

    let nodes = contpaths.selectAll('.node-sum').data(d=> d).join('g').attr('class', 'node-sum');
    nodes.attr('transform', (d, i) => {
        if(moveMetric === 'move'){
            return 'translate('+ d.move +', 0)';
        }else{
            return 'translate('+ d.edgeMove +', 0)';
        }
    });
    nodes.append('rect').attr('x', 0).attr('y', 0).attr('width', 10).attr('height', 80).classed('inner-node-wrap', true);
    nodes.append('rect').attr('x', 0).attr('y', (d, i)=> d.scaledLow).attr('width', 10).attr('height', (d, i)=> {
        return (d.scaledHigh - d.scaledLow);
    }).classed('range-rect-sum', true).style('fill', d=> d.color);
    svg.attr('height', (summarizedData.length * 120));

    //////////experimenting with discrete rendering///////////////////////////////
    let disc = innerTime.filter(f=> f.predicted.type === 'discrete').classed('discrete-sum', true);

    let stateGroups = disc.selectAll('.state-sum').data(d=> Object.entries(d.predicted.stateData).map(m=> m[1])).join('g').classed('state-sum', true);
  //  stateGroups = stateEnter.merge(stateGroups);

    var lineGenD = d3.line()
    .x(d=> d.x)
    .y(d=> d.scaleMean);

    let lineD = stateGroups.append('path')
    .attr("d", d=> lineGenD(d.pathData))
    .attr("class", "inner-line-sum-discrete")
    .style('stroke', (d, i)=> {
        return d.color;
    });

    let area = d3.area()
    .x(d => {
        console.log(d);
        return d.x;})
    .y0(d => d.scaleStDown)
    .y1(d => d.scaleStUp);
    
    let areaG =   stateGroups.append("path")
    .attr("fill", d=> d.color)
    .attr("d", d=> {
        console.log(d.pathData);
        return area(d.pathData);})
    .classed('state-area-sum', true);

    let observedGroup = attributeGroups.append('g').classed('observed-att', true);
    observedGroup.attr('transform', 'translate(920, 0)');
    observedGroup.append('rect').attr('width', 200).attr('height', 80).attr('x', 0).attr('y', 0).classed('wrapper-rect', true);

    /////////OBSERVED DISCRETE RENDERING///////////////////////
    let observedDiscrete = observedGroup.filter(f=> f.predicted.type === 'discrete');
  
    let stateBars = observedDiscrete.selectAll('.state-bar').data(d=> d.observed).join('g').classed('state-bar', true);
   // stateBars = rectBarEnter.merge(stateBars);

    stateBars.attr('transform', (d, i)=> {
        d.x.range([0, 180]);
        console.log('d', d);
        return 'translate('+ d.x(i)+ ',0)';
    });

    let stateRects = stateBars.append('rect').classed('graph-bars', true);
   
    stateRects.attr('x', 0)
        .attr('height', (d, i)=> {
            let scale = d3.scaleLinear().domain([0, d.max + 10]).range([80, 0]);
            return scale(0) - scale(d.count);
        }).attr('y', (d, i)=> {
            let scale = d3.scaleLinear().domain([0, d.max + 10]).range([0, 80]);
            let move = 80 - (scale(d.count));
            return move;
        }).attr('width', 20).style('fill', d=> d.color);

    let labelsG = stateBars.append('g').attr('transform', 'translate(0, 80)');
    let labels = labelsG.append('text').text(d=> d.key);
    labels
    .style("text-anchor", "end")
    .attr("dx", "-.1em")
    .attr("dy", ".8em")
    .style('font-size', 9)
    .attr("transform", "rotate(-35)");

    //NEED TO FINISH THIS

    /////////OBSERVED Continuous RENDERING///////////////////////
    let observedContinuous = observedGroup.filter(f=> f.predicted.type === 'continuous');

    let binBars = observedContinuous.selectAll('.bin-bar').data(d=> d.observed).join('g').classed('bin-bar', true);

    // append the bar rectangles to the svg element
    
    binBars.append("rect")
        .attr("class", "bar")
        .attr("x", 1)
        .attr("transform", function(d, i) {
            return "translate(" + d.x(i) + "," + d.y(d.length) + ")"; })
     //   .attr("width", function(d) { return d.x(d.x1) - d.x(d.x0) -1 ; })
        .attr("width", 10)
        .attr("height", function(d) { return height - d.y(d.length); })
        .attr('fill', (d)=> d.color);
  /*
    // add the x Axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
  
    // add the y Axis
    svg.append("g")
        .call(d3.axisLeft(y));
*/
}
