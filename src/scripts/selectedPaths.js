import * as d3 from "d3";
import { branchPaths, renderPaths, renderAttributes, drawContAtt, drawDiscreteAtt, drawPathsAndAttributes } from './renderPathView';
import { formatAttributeData } from './dataFormat';
import { filterMaster } from './filterComponent';
import { dataMaster, collapsed } from './index';

export let selectedPaths = [];

export function pathSelected(selectedPath, otherPaths, scales, moveMetric) {


    let selectedDiv = d3.select('div#selected');
    let main = d3.select('div#main');
    if (selectedPath === null) {

        selectedPaths = [];

        d3.select('div#selected').selectAll('*').remove();
        selectedDiv.style('height', 0);
        d3.select('div#main').style('padding-top', '0px');
        let main = d3.select('div#main');
        drawPathsAndAttributes([...otherPaths], main, scales, moveMetric, false);
    } else {
       
        selectedPaths.push(selectedPath);
        console.log('selected', selectedPaths)
        renderSelectedView(selectedPaths, otherPaths, selectedDiv, scales, moveMetric);
        let sortedPaths = sortOtherPaths([...selectedPath], otherPaths);
        
        /// LOWER ATTRIBUTE VISUALIZATION ///
        let pathGroups = drawPathsAndAttributes(sortedPaths.map(s => s.data), main, scales, moveMetric, false);

        main.style('padding-top', '250px');
    }
}
export function sortOtherPaths(pathData, otherPaths) {

    let thisSpecies = pathData.filter(f => f.leaf)[0];
    let chosenPath = pathData.reverse().map(m => m.node);

    let rankedPaths = otherPaths.map(path => {
        let step = 0;
        let test = path.reverse().map((node, i) => {
            if (chosenPath.indexOf(node.node));
            return { 'indexOf': chosenPath.indexOf(node.node), 'pathIndex': i, 'node': node, 'chosen': chosenPath[chosenPath.indexOf(node.node)] };
        }).filter(f => f.indexOf > -1);
        let distance = (test[0].indexOf + test[0].pathIndex);
        return { 'data': path.reverse(), 'distance': distance };

    });
    let sortedData = rankedPaths.sort(function(a, b) { return a.distance - b.distance; });
    return sortedData;
}
export function renderSelectedView(pathData, otherPaths, selectedDiv, scales, moveMetric) {

    let attributeHeight = 45;

    let selectedSpecies = pathData.flatMap(p => p.filter(f => f.leaf === true).map(n => n.node));
    let treeNodes = d3.select('#sidebar').select('svg').selectAll('.node');
    treeNodes.filter(node => selectedSpecies.indexOf(node.data.node) > -1).classed('selected', true);

    ////FILTER MASTER TO HIDE ATTRIBUTES THAT ARE DESELECTED FROM FILTERBAR
    let attrHide = filterMaster.filter(f => f.type === 'hide-attribute').length > 0 ? filterMaster.filter(f => f.type === 'hide-attribute').map(m => m.attribute) : [];
    let attrFilter = attrHide.length > 0 ? scales.filter(sc => {
        return attrHide.indexOf(sc.field) === -1;
    }).map(m => m.field) : null;

    ////IF THE SELECTED DIV IS THERE ALREADY USE THAT/////
    let selectedToolTest = selectedDiv.select('.selected-toolbar');
    let selectedTool = selectedToolTest.empty() ? selectedDiv.append('div').classed('selected-toolbar', true) : selectedToolTest;
    selectedTool.selectAll('*').remove();

    ///////////////////////

    let sortByDistanceDiv = selectedTool.append('div').style('display', 'inline-block');
    sortByDistanceDiv.append('text').text('Topology: ');
    let sortByDistanceButton = sortByDistanceDiv.append('button').classed('btn btn-secondary btn-sm', true);
    sortByDistanceButton.text('Sort Most to Least');
    sortByDistanceButton.on('click', () => sortPaths(sortByDistanceButton));

    /////////////Sorting by attribute///////////////
    let attrKeys = scales.map(m => m.field);
    let attrSortWrap = selectedTool.append('div').style('display', 'inline-block');
    attrSortWrap.append('h6').text('Sort by: ').style('display', 'inline');

    let radioDiv = attrSortWrap.selectAll('div.attr-radio').data(attrKeys).join('div').classed('attr-radio form-check form-check-inline', true);
    let radio = radioDiv.append('input').attr('type', 'radio').property('name', 'attribute-radio-sort').property('value', d => d).attr('id', (d, i) => 'radio-' + i).classed("form-check-input", true);
    radioDiv.append('label').text(d => d).property('for', (d, i) => 'radio-' + i).classed("form-check-label", true);

    let svgTest = selectedDiv.select('svg.select-svg');
    let svg = svgTest.empty() ? selectedDiv.append('svg').classed('select-svg', true) : svgTest;

    svg.selectAll('*').remove();

    let branchFrequency = pathData.flatMap(row => row.flatMap(f => f.node)).reduce(function(acc, curr) {
        if (typeof acc[curr] == 'undefined') {
            acc[curr] = 1;
        } else {
            acc[curr] += 1;
        }
        return acc;
    }, {});

    ///RENDERING SELECTED PATHS////
    if (pathData.length === 1) {

        /////////////////////////////////////////////////

        let selectWrap = svg.append('g').classed('select-wrap', true);
        selectWrap.attr('transform', (d, i) => 'translate(0,20)');

        ///Scales for circles ///
        let circleScale = d3.scaleLog().range([6, 14]).domain([1, d3.max(Object.values(branchFrequency))]);

        let selectedGroups = selectWrap.selectAll('.paths').data(pathData).join('g').classed('paths', true);

        let pathBars = selectedGroups.append('rect').classed('path-rect', true);
        pathBars.attr('y', -8);

        //////////
        ///Selecting species
        /////////
        let pathRemove = selectedGroups.append('g').classed('x-icon', true);
        pathRemove.attr('transform', 'translate(15, 10)');
        pathRemove.append('circle').attr('r', 7).attr('fill', '#fff');
        pathRemove.append('text').text('x').attr('transform', 'translate(-5, 5)');

        pathRemove.style('cursor', 'pointer');

        pathRemove.on('click', (d, i, n) => {
            d3.selectAll('.high').classed('high', false);
            d3.selectAll('.low').classed('low', false);
            treeNodes.select('.selected').classed('selected', false);
            pathSelected(null, dataMaster[0], scales, moveMetric);
        });

        /////////

        selectedGroups.on('mouseover', function(d, i) {
            let treeNode = d3.select('#sidebar').selectAll('.node');
            let treeLinks = d3.select('#sidebar').selectAll('.link');
            treeNode.filter(f => {
                return d.map(m => m.node).indexOf(f.data.node) > -1;
            }).classed('hover', true);
            treeLinks.filter(f => d.map(m => m.node).indexOf(f.data.node) > -1).classed('hover', true);
            return d3.select(this).classed('hover', true);
        }).on('mouseout', function(d, i) {
            let treeNode = d3.select('#sidebar').selectAll('.node').classed('hover', false);
            let treeLinks = d3.select('#sidebar').selectAll('.link').classed('hover', false);
            return d3.select(this).classed('hover', false);
        });

        let speciesTitle = selectedGroups.append('text').text(d => {
            let string = d.filter(f => f.leaf === true)[0].label;
            return string.charAt(0).toUpperCase() + string.slice(1);
        });

        speciesTitle.attr('x', 25).attr('y', 15);

        let timelines = selectedGroups.append('g').classed('time-line', true);
        timelines.attr('transform', (d, i) => 'translate(150, 0)');

        let lines = timelines.append('line')
            .attr('x1', 0)
            .attr('x2', 1000)
            .attr('y1', 15)
            .attr('y2', 15);

        let nodeGroups = timelines.selectAll('.node').data((d) => d).join('g').classed('node', true);

        nodeGroups.attr('transform', (d) => {
            let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
            let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
            return 'translate(' + distance + ', 10)';
        });

        let circle = nodeGroups.append('circle').attr('cx', 0).attr('cy', 0).attr('r', d => {
            return circleScale(branchFrequency[d.node]);
        }).attr('class', (d, i) => 'node-' + d.node);

        circle.on('mouseover', function(d, i) {
            let hovers = nodeGroups.filter(n => n.node === d.node);
            let treeNode = d3.select('#sidebar').selectAll('.node');
            let selectedBranch = treeNode.filter(f => f.data.node === d.node).classed('selected-branch', true);
            return hovers.classed('hover-branch', true);
        }).on('mouseout', function(d, i) {
            let hovers = nodeGroups.filter(n => n.node === d.node);
            d3.selectAll('.selected-branch').classed('selected-branch', false);
            return hovers.classed('hover-branch', false);
        });

        let speciesNodeLabel = nodeGroups.filter(f => f.label != undefined).append('text').text(d => {
            let string = d.label.charAt(0).toUpperCase() + d.label.slice(1);
            return string;
        }).attr('x', 10).attr('y', 5);

        selectedGroups.attr('transform', (d, i) => 'translate(0,' + (i * 60) + ')');

        let nodes = selectedGroups.select('.time-line').selectAll('.node');
        nodes.on('mouseover', (d, i) => {

            let nearest = otherPaths.filter(path => {
                let nodearray = path.flatMap(f => f.node);
                return nodearray.indexOf(d.node) > -1;
            });

            let nearestA = nearest[0];
            let nearestB = nearest[1];
            console.log(nearestA, nearestB)
        });

        //////PLAYING WITH FUNCTION TO CALULATE DISTANCES

        /// LOWER ATTRIBUTE VISUALIZATION ///
        let attributeWrapper = selectedGroups.append('g').classed('attribute-wrapper', true);
        let attData = formatAttributeData(pathData, scales, attrFilter);
        let attributeGroups = renderAttributes(attributeWrapper, attData, scales, null);


        selectedGroups.attr('transform', (d, i) => 'translate(10,' + (i * ((attributeHeight + 5) * (Object.keys(d[1].attributes).length + 1))) + ')');

        drawContAtt(attributeGroups);
        drawDiscreteAtt(attributeGroups, scales);

        //sizeAndMove(svg, attributeWrapper, pathData, (attrMove * attributeHeight));
        //tranforming elements
        svg.style('height', '250px');
        selectedDiv.style('height', ((pathData.length + attributeGroups.data().map(m => m[0]).length) * 45) + 50 + 'px');
        attributeWrapper.attr('transform', (d) => 'translate(140, 25)');
        return svg;
    } else if(pathData.length > 1 && pathData.length < 5) {

        let maxBranch = d3.max(selectedPaths.map(p => p.length));
        let longestBranch = selectedPaths.filter(path => path.length === maxBranch)[0];
        let startBranch = longestBranch.filter(f=> f.leaf != true);
        let commonNodeStart = startBranch;
        //FIND THE COMMON BRANCHES BETWEEN ALL OF THE SELECTED///
        selectedPaths.map(path => {
            commonNodeStart = [...path].filter(f => {
                return (commonNodeStart.map(m => m.node).indexOf(f.node) > -1) & f.leaf != true });
        });

        let children = selectedPaths.map(path => {
            let nodeIndex = path.map(p => p.node);
            let thresh = nodeIndex.indexOf(commonNodeStart[commonNodeStart.length - 1].node);
            let subset = path.filter((f, i) => i > thresh);
            return subset;
        });

        commonNodeStart[commonNodeStart.length - 1].children = children.map((path, i) => {
            let max = d3.max(path.map(p => p.edgeMove)) - commonNodeStart[commonNodeStart.length - 1].edgeMove;
            return path.map((chil, j, n) => {
                chil.parentBase = commonNodeStart[commonNodeStart.length - 1].edgeMove;
                chil.move = chil.edgeMove - commonNodeStart[commonNodeStart.length - 1].edgeMove;
                chil.base = (j === 0) ? 0 : n[j - 1].edgeMove - commonNodeStart[commonNodeStart.length - 1].edgeMove;
                let parentScale = d3.scaleLinear().domain([0, 1]).range([0, 1000])
                let scaledParentMove = parentScale(commonNodeStart[commonNodeStart.length - 1].edgeMove);
                chil.xScale = d3.scaleLinear().domain([0, max]).range([0, (1000 - scaledParentMove)]);
                chil.level = i;
                return chil;
            });
        });

        let selectWrap = svg.append('g').classed('select-wrap', true);
        selectWrap.attr('transform', (d, i) => 'translate(0,20)');

        ///Scales for circles ///
        let circleScale = d3.scaleLog().range([6, 14]).domain([1, d3.max(Object.values(branchFrequency))]);

        let selectedGroups = selectWrap.selectAll('.paths').data([commonNodeStart]).join('g').classed('paths', true);

        let pathBars = selectedGroups.append('rect').classed('path-rect', true);
        pathBars.attr('y', -8);


        //////////
        ///Selecting species
        /////////
        let pathRemove = selectedGroups.append('g').classed('x-icon', true);
        pathRemove.attr('transform', 'translate(15, 10)');
        pathRemove.append('circle').attr('r', 7).attr('fill', '#fff');
        pathRemove.append('text').text('x').attr('transform', 'translate(-5, 5)');

        pathRemove.style('cursor', 'pointer');

        pathRemove.on('click', (d, i, n) => {
            d3.selectAll('.high').classed('high', false);
            d3.selectAll('.low').classed('low', false);
            treeNodes.select('.selected').classed('selected', false);
            pathSelected(null, dataMaster[0], scales, moveMetric);
        });

        /////////

        let timelines = selectedGroups.append('g').classed('time-line', true);
        timelines.attr('transform', (d, i) => 'translate(150, 0)');

        let lines = timelines.append('line')
            .attr('x1', 0)
            .attr('x2', (d, i) => {
                let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
                return x(d[d.length - 1].edgeMove)
            })
            .attr('y1', 15)
            .attr('y2', 15);

        let nodeGroups = timelines.selectAll('.node').data((d) => d).join('g').classed('node', true);

        nodeGroups.attr('transform', (d) => {
            let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
            let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
            return 'translate(' + distance + ', 10)';
        });

        nodeGroups.classed('common-node', true);

        let childNodeWrap = nodeGroups.filter(c => c.children != undefined).selectAll('g.child').data(d => d.children).join('g').classed('child', true);

        let childNodes = childNodeWrap.selectAll('g.node').data(d => d).join('g').classed('node', true)
        childNodes.attr('transform', (d, i, n) => {
            return 'translate(' + d.xScale(d.move) + ', ' + (d.level * 20) + ')';
        });

        childNodeWrap.append('path').attr('d', (d, i, n) => {
            let pathArray = [{ 'x': 0, 'y': 0 }, { 'x': 0, 'y': i }];
            d.map(m => {
                pathArray.push({ 'x': m.xScale(m.move), 'y': m.level })
            });
            let line = d3.line()
                .curve(d3.curveMonotoneY)
                .x(function(d) {
                    return d.x;
                })
                .y(d => (d.y * 20))
            return line(pathArray);
        }).attr('stoke-width', '2px').attr('fill', 'none').attr('stroke', 'gray');

        childNodeWrap.on('mouseover', (d, i)=> {
            let specArray = d.map(m=> m.species);
            let hovers = nodeGroups.filter(n => n.node === d.node);
            let commonHover = [...commonNodeStart].map(c=> c.node).concat(d.map(n=> n.node));
            console.log('common hover',commonHover, 'nodewrap', d)
            let treeNode = d3.select('#sidebar').selectAll('.node');
            let treeLinks  = d3.select('#sidebar').selectAll('.link');
            treeNode.filter(f => commonHover.indexOf(f.data.node) > -1).classed('hover', true);
            treeLinks.filter(f => commonHover.indexOf(f.data.node) > -1).classed('hover', true);
            return hovers.classed('hover-branch', true);
        }).on('mouseout', (d, i)=> {
            d3.selectAll('.hover').classed('hover', false);
        });



        let circle = nodeGroups.append('circle').attr('cx', 0).attr('cy', 0).attr('r', d => {
            return circleScale(branchFrequency[d.node]);
        }).attr('class', (d, i) => 'node-' + d.node);

        let childCirc = childNodes.append('circle').attr('r', 7).attr('fill', 'red').attr('y', 5);

        childCirc.on('mouseover', function(d, i) {
            let hovers = nodeGroups.filter(n => n.node === d.node);
            let treeNode = d3.select('#sidebar').selectAll('.node');
            let selectedBranch = treeNode.filter(f => f.data.node === d.node).classed('selected-branch', true);
            console.log(selectedBranch);
            return hovers.classed('hover-branch', true);
        }).on('mouseout', function(d, i) {
            let hovers = nodeGroups.filter(n => n.node === d.node);
            d3.selectAll('.selected-branch').classed('selected-branch', false);
            console.log(d.species)
            return hovers.classed('hover-branch', false);
        });

        childNodes.filter(f => f.leaf === true).append('text').text(d => d.label).attr('x', 9).attr('y', 4);

        let attWrap = svg.append('g').classed('attribute-wrapper', true);

        let attributeData = commonNodeStart[commonNodeStart.length - 1].children.map(ch => {
            return [...commonNodeStart].concat(ch);
        });

        let attData = formatAttributeData(pathData, scales, attrFilter);
        let attDataComb = attData[0].map((att, i)=> {
            let species = pathData[0].filter(f=> f.leaf === true)[0].label;
            att[att.length - 1].offset = 0;
            let attribute = {'label': att[att.length-1].label, 'data': [{'species': species, 'paths': att}]}
          
            for(let index = 1; index < attData.length; index++ ){
                let species = pathData[index].filter(f=> f.leaf === true)[0].label;
                let last = attData[index][i].length - 1
                attData[index][i][last].offset = (index * 8);
                attribute.data.push({'species': species, 'paths': attData[index][i]})
            }
            return attribute;
        })

        console.log(attDataComb);
     
        let attGroups = attWrap.selectAll('g').data(attDataComb).join('g').classed('attr', true);

        attGroups.attr('transform', (d, i) => 'translate(140,' + (32+ (pathData.length*20) + (i * (attributeHeight + 5))) + ')');
        
        let dataGroups = attGroups.selectAll('g.path-grp').data((d, i)=> {
            let speciesArray = d.data.map(m=> {
                m.paths.map(path=>{
                    path.species = m.species;
                    path.index = i;
                    return path;
                })
                return m.paths});
            return speciesArray}).join('g').classed('path-grp', true);

        let contGroups = drawContAtt(dataGroups, moveMetric, collapsed);
       
        let valueBars = contGroups.selectAll('.val-bar').on('mouseover', (d, i)=> {
            let tool = d3.select('#tooltip');
            tool.transition()
                .duration(200)
                .style("opacity", .9);
            let f = d3.format(".3f");
            tool.html(d.species + ": " + f(d.realVal))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        }).on("mouseout", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(500)
              .style("opacity", 0);
            });

        valueBars.attr('opacity', 0.4);

        let disGroups = drawDiscreteAtt(dataGroups, moveMetric, collapsed);
        disGroups.selectAll('.dots').style('opacity', 0.4);

        let disLeaves = disGroups.filter(d=> d.leaf === true);

        disLeaves.attr('transform', d=> 'translate(1000,'+(d.offset)+')');
        disLeaves.selectAll('circle').attr('stroke', '#fff').attr('stroke-width', '1px');

        disLeaves.selectAll('circle').on('mouseover', (d, i)=> {
            let tool = d3.select('#tooltip');
            tool.transition()
                .duration(200)
                .style("opacity", .9);
            tool.html(d.species + ": " + d.winState)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        }).on("mouseout", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(500)
              .style("opacity", 0);
            });

        /////ADDED LABELS///////
        let attrLabel = dataGroups.filter((f, i)=> i === 0).append('text').text(d=> d[d.length - 1].label);
        attrLabel.classed('attribute-label', true);
        attrLabel.attr('transform', 'translate(-15, 20)');

        d3.select('#selected').style('height', (50 + (pathData.length * 20) + (attDataComb.length * 53))+ 'px');
        svg.style('height', (50 + (pathData.length * 20) + (attDataComb.length * 53)) + 'px');
        pathBars.style('height', (children.length * 25)+'px');
    }else{
        console.log("more than 5 need distribution view");
    }

    d3.selectAll('.selected-path').classed('selected-path', false);

    ////RADIO BUTTON THAT COLORS BASE DON ATTRIBUTE VALUE////
    radio.on('click', (d, i) => {
        let leaf = pathData.map(node => node.filter(d => d.leaf === true)[0])[0];
        let sorted = [...otherPaths].sort(function(a, b) {
            return a.filter(n => n.leaf === true)[0].attributes[d].realVal - b.filter(n => n.leaf === true)[0].attributes[d].realVal;
        });

        let main = d3.select('div#main');
        /// LOWER ATTRIBUTE VISUALIZATION ///
        drawPathsAndAttributes(sorted.reverse(), main, scales, moveMetric);
        main.style('padding-top', '250px');

        let paths = main.select('svg#main-path-view').selectAll('.paths');

        let high = paths.filter(path => {
            let leafOther = path.filter(node => node.leaf === true)[0];
            return leafOther.attributes[d].realVal > leaf.attributes[d].realVal;
        });
        high.classed('high', true);

        let highLeaves = high.data().map(path => path.filter(f => f.leaf === true)[0].node);

        treeNodes.filter(f => highLeaves.indexOf(f.data.node) > -1).classed('high', true);

        let low = paths.filter(path => {
            let leafOther = path.filter(node => node.leaf === true)[0];
            return leafOther.attributes[d].realVal < leaf.attributes[d].realVal;
        });
        low.classed('low', true);

        let lowLeaves = low.data().map(path => path.filter(f => f.leaf === true)[0].node);

        treeNodes.filter(f => lowLeaves.indexOf(f.data.node) > -1).classed('low', true);

        let same = paths.filter(path => {
            let leafOther = path.filter(node => node.leaf === true)[0];
            return leafOther.attributes[d].realVal === leaf.attributes[d].realVal;
        });
        same.classed('same', true);
    });


}

function sortPaths(sortButton) {
    if (sortButton.text() === 'Sort Most to Least') {
        sortButton.text('Sort Least to Most');
    } else {
        sortButton.text('Sort Most to Least');
    }
}