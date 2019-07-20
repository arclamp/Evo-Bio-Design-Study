import '../styles/index.scss';
import {formatAttributeData} from './dataFormat';
import {renderAttributes,  drawContAtt, drawDiscreteAtt, renderPaths, drawPathsAndAttributes} from './rendering';
import {renderDistibutions} from './distributionView';
import * as d3 from "d3";

export function toolbarControl(toolbar, normedPaths, main, calculatedScales, moveMetric, pathView){

    let viewButton = toolbar.append('button').attr('id', 'view-toggle').attr('attr' , 'button').attr('class', 'btn btn-outline-secondary') ;

    if(pathView === 'paths'){
        viewButton.text('View Summary');
    }else if(pathView === 'summary'){
        viewButton.text('View Paths');
    }else{
        console.error('pathView parameter not found');
    }
    
    let filterButton = toolbar.append('button').attr('id', 'view-filter');
    filterButton.attr('class', 'btn btn-outline-secondary').text('Show Filters');
    filterButton.on('click', ()=> toggleFilters(filterButton, main, moveMetric, calculatedScales));

    let lengthButton = toolbar.append('button').attr('id', 'change-length').attr('class', 'btn btn-outline-secondary');
    if(moveMetric === 'move'){
        lengthButton.text('Show Edge Length');
    }else if(moveMetric === 'edgeLength'){
        lengthButton.text('Normalize Edge Length');
    }

    lengthButton.on('click', ()=> {
        if(lengthButton.text() === 'Show Edge Length'){
            lengthButton.text('Normalize Edge Length');
            main.selectAll('*').remove();//.selectAll('*').remove();
            if(viewButton.text() === 'View Summary'){
                drawPathsAndAttributes(normedPaths, main, calculatedScales, 'edgeLength');
            }else{
                renderDistibutions(normedPaths, main, calculatedScales, 'edgeLength');
            }
        }else{
            lengthButton.text('Show Edge Length');
            main.selectAll('*').remove();//.selectAll('*').remove();
            if(viewButton.text() === 'View Summary'){
                drawPathsAndAttributes(normedPaths, main, calculatedScales, moveMetric);
            }else{
                renderDistibutions(normedPaths, main, calculatedScales, moveMetric);
            }
        }
    });

    let scrunchButton = toolbar.append('button').attr('id', 'scrunch');
    scrunchButton.attr('class', 'btn btn-outline-secondary').text('Collapse Attributes');
    scrunchButton.on('click', ()=> toggleScrunch(scrunchButton, normedPaths, main, calculatedScales));

    let form = toolbar.append('form').classed('form-inline', true);
    let input = form.append('input').classed('form-control mr-sm-2', true)
    input.attr('type', 'search').attr('placeholder', 'Search').attr('aria-label', 'Search');
    let searchButton = form.append('button').classed('btn btn-outline-success my-2 my-sm-0', true).attr('type', 'submit').append('i').classed("fas fa-search", true)

    viewButton.on('click', ()=> togglePathView(viewButton, normedPaths, main, calculatedScales));

function toggleFilters(filterButton, main, moveMetric, scales){
    let filterDiv = d3.select('#filter-tab');
   
    if(filterDiv.classed('hidden')){
        filterButton.text('Hide Filters');
        filterDiv.classed('hidden', false);
        main.style('padding-top', '200px');
        renderAttToggles(filterDiv, normedPaths, calculatedScales, 'edgeLength');

        let keys = Object.keys(normedPaths[0][0].attributes);
        let selectWrapper = filterDiv.append('div').classed('select-wrapper', true);
        selectWrapper.append('h4').text('State Transition:');
        let attButton = stateChange(selectWrapper, keys, 'attr-select', 'Trait:');

        console.log(attButton);

        attButton.on("change", function(d) {
            var selectedOption = d3.select(this).property("value");

            let options = scales.filter(f=> f.field === selectedOption)[0];
            console.log(options)
            if(options.type === "discrete"){
                let optKeys = options.scales.map(s=> s.scaleName);
                let button1 = stateChange(selectWrapper, optKeys, 'predicted-state', 'From');
                let button2 = stateChange(selectWrapper, optKeys, 'observed-state', 'To');
            }
         })


      
       // let button1 = stateChange(selectWrapper, keys, 'predicted-state', 'From');
       // let button2 = stateChange(selectWrapper, keys, 'observed-state', 'To');
       // let sumbit = selectWrapper.append('button').classed('state-filter-submit btn btn-outline-secondary', true);
       // sumbit.text('Filter');

    }else{
        filterButton.text('Show Filters');
        filterDiv.selectAll('*').remove();
        filterDiv.classed('hidden', true);
        main.style('padding-top', '0px');
    }
}

}

function toggleScrunch(button, normedPaths, main, calculatedScales){
    if(button.text() === 'Collapse Attributes'){
        button.text('Expand Attributes');
        main.selectAll('*').remove();//.selectAll('*').remove();
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move', true);
    }else{
        button.text('Collapse Attributes');
        main.selectAll('*').remove();//.selectAll('*').remove();
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move', false);
    }
}

/**
 * 
 * @param {*} viewButton button that changes the actual view the text of the button determines what the view should change to 
 * @param {*} normedPaths 
 * @param {*} main 
 * @param {*} calculatedScales 
 */
function togglePathView(viewButton, normedPaths, main, calculatedScales){
   
    if(viewButton.text() === 'View Paths'){
        viewButton.text('View Summary');
        main.selectAll('*').remove();//.selectAll('*').remove();
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move');
    }else{
        viewButton.text('View Paths');
        main.selectAll('*').remove();
        renderDistibutions(normedPaths, main, calculatedScales, 'move');
    }
}

export function renderAttToggles(filterDiv, normedPaths, scales, moveMetric){

    ////NEED TO GET RID OF TOGGLE SVG
    let keys = Object.keys(normedPaths[0][0].attributes);
   
    let svg = filterDiv.append('svg').classed('attr-toggle-svg', true)

   let title = svg.append('text').text('Attributes: ')
    title.attr('x', 20).attr('y', 10);
    
    let labelWrap = svg.append('g').attr('transform', 'translate(20, 25)');
    let labelGroups = labelWrap.selectAll('g').data(keys).join('g'); 
    
    labelGroups.attr('transform', (d, i)=> 'translate(0,'+(i* 25)+')');

    let toggle = labelGroups.append('circle').attr('cx', 0).attr('cy', 0);
    toggle.classed('toggle shown', true);
    toggle.style('fill', (d, i)=>{
        return scales.filter(f=> f.field === d)[0].catColor;
    });

    toggle.on('click', function(d, i){
        let togg = d3.select(this);
        toggleCircle(togg, scales);
        let newKeys = d3.selectAll('.shown');
        let attributeWrapper = d3.selectAll('.attribute-wrapper');
        attributeWrapper.selectAll('g').remove();
        let attributeHeight = 45;
      
          /// LOWER ATTRIBUTE VISUALIZATION ///
      
        let attData =  formatAttributeData(normedPaths, scales, newKeys.data());
        let predictedAttrGrps = renderAttributes(attributeWrapper, attData, scales, null);

        d3.select('#main-path-view').style('height', ((normedPaths.length + predictedAttrGrps.data().map(m=> m[0]).length)* 30) + 'px');
        d3.selectAll('.paths').attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (newKeys.data().length + 1))) +')');
        
        drawContAtt(predictedAttrGrps, moveMetric);
        drawDiscreteAtt(predictedAttrGrps, scales, moveMetric);

    });
    let labelText = labelGroups.append('text').text(d=> d).style('font-size', 10);
    labelText.attr('transform', 'translate(10, 4)')
   
    
}

function toggleCircle(circle, scales){
    if(circle.classed('shown')){
        circle.classed('shown', false);
        circle.style('fill', '#fff');
    }else{
        circle.classed('shown', true);
        circle.style('fill', (d, i)=> scales.filter(f=> f.field === d)[0].catColor);
    }
}

export function stateChange(selectorDiv, keys, selectId, label){

    let dropDownWrapper = selectorDiv.append('div').classed('selector', true);
    let header = dropDownWrapper.append('h5').text(label);
    	// create the drop down menu of cities
	let selectOp = dropDownWrapper
    .append("select")
    .attr("id", selectId);
    
    let options = selectOp.selectAll("option")
    .data(keys).join("option");

    options.text(d=> d).attr("value", d=> d);
/*
    d3.select("#"+selectId).on("change", function(d) {
       var selectedOption = d3.select(this).property("value");
      console.log('work work work', selectedOption);
    })*/

    return d3.select('#'+ selectId);


}