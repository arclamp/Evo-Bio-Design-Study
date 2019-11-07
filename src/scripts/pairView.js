import { pairPaths } from "./dataFormat";
import { dropDown } from "./buttonComponents";
import * as d3 from "d3";
import * as slide from 'd3-simple-slider';
import { renderTree } from "./sidebarComponent";
import { speciesTest, dataMaster } from ".";

export function rankingControl(data){
    let rankDiv = d3.select('#pair-rank').classed('hidden', false);
    rankDiv.selectAll('*').remove();

    let defaultW = [1, 1, 1];
  
    let weightPicker = rankDiv
      .append('svg')
      .attr('width', 800)
      .attr('height', 80)
      .append('g')
      .attr('transform', 'translate(30,10)');

    let labels = ['Distance', 'Delta', 'Closeness'];

    weightPicker.selectAll('text').data(labels).join('text')
    .text(d=> d)
    .attr('y', 10)
    .attr('x', (d, i)=> (200+(200 * i)));
  
    defaultW.forEach((color, i) => {
      var slider = slide
        .sliderBottom()
        .min(0)
        .max(1)
        .step(.1)
        .width(150)
        .default(defaultW[i])
        .displayValue(false)
        .fill('#7FB3D5')
        .on('end', num => {
         defaultW[i] = num;
         updateRanking(pairPaths(data), d3.select('.attr-drop.dropdown').select('button').text(), defaultW);
        });
  
      weightPicker
        .append('g')
        .attr('transform', `translate(${200+(200 * i)}, 20)`)
        .call(slider);
    });
    
  
}

export function generatePairs(data){

  console.log(data)

        let pairs = pairPaths(data);
        console.log(pairs)
        let weights = [1, 1, 1];

        let attKeys = d3.entries(pairs[0].p1[0].attributes)
                    .filter(f=> f.value.type === 'continuous')
                    .map(m=> {
                        return {'field': m.key, 'value': m.key }
                    });
        
        let drop = d3.select('.attr-drop.dropdown').selectAll('a').empty() ? dropDown(d3.select('#toolbar'), attKeys, attKeys[0].field, 'attr-drop') : d3.select('.attr-drop.dropdown').selectAll('a');

        drop.on('click', (d, i, n)=> {
            updateRanking(pairPaths(data), d.field);
            renderTree(d3.select('#sidebar'), null, true, d.field);
            d3.select('.attr-drop.dropdown').select('button').text(d.field);
        });

        updateRanking([...pairs], attKeys[0].field, weights);
}

export function updateRanking(pairs, field, weights){
    
    let deltaMax = d3.max([...pairs].map(m=> m.deltas.filter(f=> f.key === field)[0]).map(m=> m.value));
    let closeMax = d3.max([...pairs].map(m=> m.closeness.filter(f=> f.key === field)[0]).map(m=> m.value));
    let distMax = d3.max([...pairs].map(d=> d.distance))
    let deltaScale = d3.scaleLinear().domain([0, deltaMax]).range([0, 1]);
    let closeScale = d3.scaleLinear().domain([closeMax, 0]).range([0, 1]);
    let distScale = d3.scaleLinear().domain([0, distMax]).range([0, 1]);
    let pickedPairs = [...pairs].map(p=> {
        p.delta = p.deltas.filter(d=> d.key === field)[0];
        p.closeness = p.closeness.filter(d=> d.key === field)[0];
        p.deltaRank = deltaScale(p.delta.value);
        p.closenessRank = closeScale(p.closeness.value);
        p.distanceRank = distScale(p.distance);
        p.totalRank = (weights[0] * p.distanceRank) + (weights[1] * p.deltaRank) + (weights[2] * p.closenessRank);
        return p;
    })

    let sortedPairs = pickedPairs.sort((a, b)=> b.totalRank - a.totalRank).slice(0, 40);
    sortedPairs = sortedPairs.filter((f, i)=> i%2 === 0)
    drawSorted(sortedPairs, field);
}

function drawSorted(pairs, field){

  let pairColor = ['#FF5733', '#129BF5'];
   
    let width = 600;
    let height = 100;
    let xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    d3.select('#main').selectAll('*').remove()
    let svg = d3.select('#main').append('svg');
    svg.attr('height', pairs.length * 150)
    let wrap = svg.append('g');
    wrap.attr('transform', 'translate(20, 100)')
    let pairWraps = wrap.selectAll('g.pair-wrap').data(pairs).join('g').classed('pair-wrap', true);
    pairWraps.attr('transform', (d, i)=> `translate(50,${i*150})`);
    pairWraps.append('rect')
        .attr('width', (d, i)=> {
            return width - xScale(d.common.edgeMove);
        })
        .attr('height', height)
        .attr('x', d=> xScale(d.common.edgeMove))
        .attr('stroke-width', 1).attr('stroke', 'black')
        .attr('fill', '#fff');

    pairWraps.append('text').text((d, i)=> {
        return `${d.p1[d.p1.length - 1].label} + ${d.p2[d.p2.length - 1].label}`
    }).attr('y', -10);

    let scoreWrap = pairWraps.append('g').classed('score-wrap', true);
    let scoreGroups = scoreWrap.selectAll('g.score').data((d, i)=> {
        return [{label: 'Distance', value: d.distance, rank: d.distanceRank}, 
         {label: 'Delta', value: d.delta.value, rank: d.deltaRank},
         {label: 'Closeness', value: d.closeness.value, rank: d.closenessRank}
        ];
    }).join('g').classed('score', true);

    let scoreLabel = scoreWrap.append('g').attr('transform', `translate(650, 0)`);
    scoreLabel.append('text').text('Rank').attr('y', 20).style('text-anchor', 'end').style('font-size', 11);
    scoreLabel.append('text').text('Value').attr('y', 40).style('text-anchor', 'end').style('font-size', 11);

    scoreGroups.attr('transform', (d, i, n)=> {
       return  i === 0 ? `translate(${(670)},0)` : 
       `translate(${(660+(d3.sum(d3.selectAll(n).filter((f, j)=> i > j).data().map(m=> m.label.length * 6)))+ (i*30))},0)`;
    });
    var zero = d3.format(".3n");
    scoreGroups.append('text').text((d, i)=>  d.label).style('font-size', 10);
    scoreGroups.append('text').text((d, i)=> zero(d.rank)).style('font-size', 10).attr('y', 20);
    scoreGroups.append('text').text((d, i)=> zero(d.value)).style('font-size', 10).attr('y', 40);

    let pairGroup = pairWraps.selectAll('g.pair').data(d=> [d.p1, d.p2]).join('g').classed('pair', true);

    var lineGen = d3.line()
    .x(d=> {
        let x = d3.scaleLinear().domain([0, 1]).range([0, width]);
       let distance = x(d.edgeMove);
        return distance; })
    .y(d=> {
        let y = d.attributes[field].yScale;
        y.range([height, 0]);
        return y(d.attributes[field].realVal);
    });

    let innerPaths = pairGroup.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line")
    .style('stroke', (d, i)=> pairColor[i])
   // .style('stroke', 'rgb(165, 185, 198)');

    let branches = pairGroup.selectAll('g.branch').data(d=> d).join('g').classed('branch', true);
    branches.attr('transform', (d, i)=> `translate(${xScale(d.edgeMove)}, 0)`);
    branches.filter(f=> f.leaf != true).append('rect').attr('width', 10).attr('height', (d)=> {
        let y = d.attributes[field].yScale;
        return y(d.attributes[field].lowerCI95) - y(d.attributes[field].upperCI95)
    }).attr('fill', 'rgb(165, 185, 198, .5)').attr('y', (d, i)=> {
        let y = d.attributes[field].yScale;
        return y(d.attributes[field].upperCI95);
    });

    branches.append('rect').attr('width', 10).attr('height', 4).attr('y', (d, i)=> {
        return d.attributes[field].yScale(d.attributes[field].realVal) - 2;
    });

    pairWraps.append('rect').attr('width', (d, i)=> {
        return xScale(d.common.edgeMove)})
        .attr('height', height)
        .attr('fill', '#fff').style('opacity', 0.7);
        let yAxisG = pairWraps.append('g').classed('y-axis', true);
        let xAxisG = pairWraps.append('g').classed('x-axis', true);
        xAxisG.call(d3.axisBottom(xScale).ticks(10));
        xAxisG.attr('transform', `translate(0, ${height})`)

    pairWraps.on('mouseover', (d, i)=> {
        //let species = [...d.p1.map(n=> n.node)].concat(d.p2.map(n=> n.node));
        let species1 = d.p1.map(n=> n.node);
        let species2 = d.p2.map(n=> n.node);
        let labels = [...d.p1.filter(n=> n.leaf === true).map(m=> m.label)].concat(d.p2.filter(n=> n.leaf === true).map(m=> m.label));
        let neighbors = labels.flatMap(m=> {
            let start = speciesTest[0].indexOf(m);
            let ne = speciesTest[0].filter((f, j)=> (j < (+start + 4)) && (j > (+start - 4)));
            return ne;
        });
        
        let neighNodes = dataMaster[0].filter(f=> neighbors.indexOf(f[f.length -1].label) > -1).flatMap(m=> m.map(f=> f.node))
       
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let treeLinks  = d3.select('#sidebar').selectAll('.link');
        let pairNode1 = treeNode.filter(f=> {
            return species1.indexOf(f.data.node) > -1;
        }).classed('hover one', true);

        let pairNode2 = treeNode.filter(f=> {
          return species2.indexOf(f.data.node) > -1;
      }).classed('hover two', true);

     
        treeLinks.filter(f=> species1.indexOf(f.data.node) > -1).classed('hover one', true);
        treeLinks.filter(f=> species2.indexOf(f.data.node) > -1).classed('hover two', true);
        
        treeNode.filter(f=> neighNodes.indexOf(f.data.node) > -1).classed('hover-neighbor', true);
        //Hiding Others
        treeNode.filter(f=> (neighNodes.indexOf(f.data.node) === -1) && (species1.concat(species2).indexOf(f.data.node) === -1)).classed('hover-not', true);
        
        //Coloring Niehgbors
        treeLinks.filter(f=> neighNodes.indexOf(f.data.node) > -1).classed('hover-neighbor', true);
        //Hiding Others
        treeLinks.filter(f=> (neighNodes.indexOf(f.data.node) === -1) && (species1.concat(species2).indexOf(f.data.node) === -1)).classed('hover-not', true);

        return d3.select(this).classed('hover', true);
    })
    .on('mouseleave', function(){
       // let axisGroup = d3.select(this).select('.y-axis');
       // axisGroup.remove();
        let treeNode  = d3.select('#sidebar').selectAll('.node')
        .classed('hover', false)
        .classed('hover-neighbor', false)
        .classed('hover-not', false)
        .classed('two', false)
        .classed('one', false);
        let treeLinks  = d3.select('#sidebar').selectAll('.link')
        .classed('hover', false)
        .classed('hover-neighbor', false)
        .classed('hover-not', false)
        .classed('two', false)
        .classed('one', false);
        return d3.select(this).classed('hover', false);
    });

    let axisGroup = pairWraps.append('g').classed('y-axis', true);
  
    axisGroup.each((d, i, n)=> {
        let scale = d.p1[0].attributes[field].yScale;
        d3.select(n[i]).call(d3.axisLeft(scale).ticks(5));
    });

    let mouseG = pairWraps.append("g")
    .attr("class", "mouse-over-effects");

  mouseG.append("path") // this is the black vertical line to follow mouse
    .attr("class", "mouse-line")
    .style("stroke", "black")
    .style("stroke-width", "1px")
    .style("opacity", "0");

   var mousePerLine = mouseG.selectAll('.mouse-per-line')
   .data((d, i)=> {
      // console.log(d)
    return [d.p1, d.p2]})
   .join("g")
   .attr("class", "mouse-per-line");

 mousePerLine.append("circle")
   .attr("r", 7)
   .style("stroke", function(d) {
     return 'red';
   })
   .style("fill", "none")
   .style("stroke-width", "1px")
   .style("opacity", "0");

  mousePerLine.append("text").attr('class', 'value')
   .attr("transform", "translate(10,3)");

  mousePerLine.append("text").attr('class', 'species')
   .attr("transform", "translate(10,3)");

mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
      .attr('width', width) // can't catch mouse events on a g element
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseout', function() { // on mouse out hide line, circles and text
        d3.selectAll(".mouse-line")
          .style("opacity", "0");
        d3.selectAll(".mouse-per-line circle")
          .style("opacity", "0");
        d3.selectAll(".mouse-per-line text")
          .style("opacity", "0");
      })
      .on('mouseover', (d, i, n)=> { // on mouse in show line, circles and text
        d3.select(n[i].parentNode).selectAll('.mouse-line')
          .style("opacity", "1");
          d3.select(n[i].parentNode).selectAll(".mouse-per-line circle")
          .style("opacity", "1");
          d3.select(n[i].parentNode).selectAll(".mouse-per-line text")
          .style("opacity", "1");
      })
      .on('mousemove', (dat, i, n)=> { // mouse moving over canvas
        var mouse = d3.mouse(n[i]);
       
        d3.select(n[i].parentNode).select('.mouse-line')
          .attr("d", function() {
            var d = "M" + mouse[0] + "," + height;
            d += " " + mouse[0] + "," + 0;
            return d;
          });
       
          d3.select(n[i].parentNode).selectAll('.mouse-per-line')
          .attr("transform", function(d, j, node) {
         
            var xDate = xScale.invert(mouse[0]),
                bisect = d3.bisector(function(d) { return d.edgeLength; }).right,
                idx = bisect(d.values, xDate);
            
            let line = n[i].parentNode.parentNode.getElementsByClassName('inner-line');
          
            var beginning = 0,
                end = line[j].getTotalLength(),
                target = null

            while (true){
               target = Math.floor((beginning + end) / 2);
               var pos = line[j].getPointAtLength(target);
              if ((target === end || target === beginning) && pos.x !== mouse[0]) {
                  break;
              }
              if (pos.x > mouse[0])      end = target;
              else if (pos.x < mouse[0]) beginning = target;
              else break; //position found
            }
            let y = dat.p1[0].attributes[field].yScale;
          
            d3.select(node[j]).select('text.value')
              .text(y.invert(pos.y).toFixed(2))
              .style('font-size', 11)
              .attr('y', ()=> {
                  return j === 0 ? 10 : -10;
                });

            d3.select(node[j]).select('text.species')
                .text(d[d.length-1].label)
                .style('font-size', 11)
                .attr('y', ()=> {
                    return j === 0 ? 19 : -19;
                  });
              
            return "translate(" + mouse[0] + "," + pos.y +")";
          });
      });
   
}