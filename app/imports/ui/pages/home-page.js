import { Template } from 'meteor/templating';
import { Weather } from '../../api/weather/weather.js';
import { Meteor } from 'meteor/meteor';
import { Chart } from 'chart.js';


function hourlyConsumption() {
  let t_consump = 0;
  const w = Weather.find().fetch()[0];

  for(var i = 0; i < w.devices.length; i ++)
  {
    let deviceTime = (w.devices[i].time)/60;
    t_consump+= (w.devices[i].power) * deviceTime;
  }
  return t_consump;
}

function hourlyProduction() {
  let t_prod = 0;
  const w = Weather.find().fetch()[0];
  const cloud_percent = parseFloat(w.clouds)/100.00;
  const p = (1 - (0.75 * (Math.pow(cloud_percent, 3))));
  const actual_radiation = p * parseFloat(w.radiation);

  t_prod = w.areaPanel * (w.absorbPanel/100) * actual_radiation;
  //console.log(t_prod);
  return t_prod;
}

function batteryGraph() {
  let prodArr = productionGraph();
  let conArr = consumptionGraph();
  let batArr = [];
  const w = Weather.find().fetch()[0];
  let storedEnergy = parseFloat(w.storedEnergy);
  let batteryCapacity = parseFloat(w.battery);

  for(let i = 0; i < 24; i++)
  {
    batArr[i] = 0;
  }

  for(let i = 0; i < 24; i++)
  {
    if(prodArr[i] > conArr[i])
    {
      if(storedEnergy >= batteryCapacity)
      {
        batArr[i] = prodArr[i] + batteryCapacity;
      }
      else
      {
        storedEnergy += prodArr[i] - conArr[i];
        if(storedEnergy >= batteryCapacity)
        {
          storedEnergy = batteryCapacity;
        }
        batArr[i] = prodArr[i] + storedEnergy;
      }

    }
    else
    {
      if( storedEnergy <= 0)
      {
        batArr[i] = prodArr[i];
      }
      else
      {
        storedEnergy += prodArr[i] - conArr[i];
        if(storedEnergy <= 0)
        {
          storedEnergy = 0;
        }
        batArr[i] = prodArr[i] + storedEnergy;
      }
    }
  }
  return batArr;

}

function productionGraph() {
  let prodArr = [];
  const w = Weather.find().fetch()[0];
  if (!w) {
    return [0];
  }
  for(let i = 0; i < 8; i++)
  {
    let cloud_percent = parseFloat(w.hourlyClouds[i].clouds)/100.00;
    let p = (1 - (0.75 * (Math.pow(cloud_percent, 3))));
    for(let j = i*3; j < i*3 + 3; j++)
    {
        //diving by 1000 to give KWH
        prodArr[j] = parseFloat(w.hourlyRadiation[j]) * p/1000.00 * w.areaPanel * (w.absorbPanel/100);
    }

  }
  return prodArr;
}

function productionTotal() {
 let prodArr = productionGraph();
 let totalProd = 0;
  for(let i = 0; i < prodArr.length; i++)
  {
    totalProd += parseFloat(prodArr[i]);
  }
  return totalProd;
}

function consumptionTotal() {
 let conArr = consumptionGraph();
 let totalCon = 0;
  for(let i = 0; i < conArr.length; i++)
  {
    totalCon += parseFloat(conArr[i]);
  }
  return totalCon;
}

function batteryUsageTotal() {
  let prodArr = productionGraph();
  let conArr = consumptionGraph();
  let batArr = batteryGraph();
  const w = Weather.find().fetch()[0];  
  let storedEnergy = parseFloat(w.storedEnergy);  
  let batteryCapacity = parseFloat(w.battery);
  let batTotal = 0;
  //if the difference, total of difference is total battery used
  for(let i = 0; i < prodArr.length; i++)
  {
    if(conArr[i] > prodArr[i]) {
        let energyDiff = conArr[i] - prodArr[i];
        let k = i - 1;
        if(k < 0)
        {
          k = 0;
        }
        let sEnergy = batArr[k] - prodArr[k];
        if (energyDiff > sEnergy) {
            batTotal += sEnergy;
        }
        else {
            batTotal += energyDiff;
        }
    }
  }
  return batTotal;
}

function gridUsageTotal() 
{    
  let conArr = consumptionGraph();    
  let batArr = batteryGraph();
  let prodArr = productionGraph();
  const w = Weather.find().fetch()[0];      
  let storedEnergy = parseFloat(w.storedEnergy);      
  let batteryCapacity = parseFloat(w.battery);    
  let gridTotal = 0;
   //if consumption > battery + produc, add the difference to gridTotal    
  for(let i = 0; i < conArr.length; i++)   
  {
    let k = i - 1;
    if(k < 0)
    {
        k = 0;
    }
    let sEnergy = batArr[k] - prodArr[k];

    if(conArr[i] > batArr[i])
    {
      gridTotal += conArr[i] - batArr[i];
    }
  }   
  return gridTotal;  
} 

function consumptionGraph() {
  let conArr = [];
  const w = Weather.find().fetch()[0];

  if (!w) {
    return [0];
  }
    for(let i = 0; i < 24; i++)
    {
      conArr[i] = 0;
    }

  for(let i = 0; i < w.devices.length; i++)
  {
    for(let j = 0; j < 24; j++)
    {
      //console.log('device time for' + i + ' :'+ parseInt(w.devices[i].time[j]));
      if(parseInt(w.devices[i].time[j]) != 0)
      {
        //converting to KWH
          //console.log('aassigning to array: ' + parseFloat(w.devices[i].power));
        conArr[j] += parseFloat(parseFloat(w.devices[i].power)/1000.00);
        //console.log('conArr at ind '+j+' :' + conArr[j])
      }

    }
  }
  const firstHour = parseInt(w.hourlyClouds[0].time);
  console.log('conArr: ' + conArr);
  return reorder(conArr);
}

function reorder(Arr)
{
  let d = new Date();
  let firstHour = d.getHours();
  let offset = firstHour;
  let lastInd = (Arr.length - 1) - offset;
  let finalArr = [];
  for(let i = 0; i < 24; i++)
  {
      finalArr[i] = 0;
  }

  for(let i = 0, j = offset; i < 24; i++, j++)
  {
    //console.log('i: '+i+' j:' + j);
    if(j < 24)
    {
      finalArr[i] = parseFloat(Arr[j]);
    }
    else
    {
      finalArr[i] = parseFloat(Arr[j - 24]);
    }
  }
  return finalArr;
}

function currentState() {
  let conArr = consumptionGraph();    
  //let batArr = batteryGraph();
  let prodArr = productionGraph();
  const w = Weather.find().fetch()[0];          
  let batteryCapacity = parseFloat(w.battery);    
  let maxBatProd = [0];
  let resultStr = 'None';
  for(let i = 0; i < 24; i++)
  {
    maxBatProd[i] = 0;
  }
  //find max possible
  for( let i = 0; i < prodArr.length; i++)
  {
    maxBatProd[i] = prodArr[i] + batteryCapacity;
  }
  
  if(conArr[0] > maxBatProd[0])
  {
    resultStr = 'GRID';
  }
  else if(conArr[0] < maxBatProd[0] && conArr[0] > prodArr[0])
  {
    resultStr = 'BATTERY';
  }
  else if (conArr[0] < prodArr[0] && conArr[0] > 0)
  {
    resultStr = 'SOLAR'
  }
  else
  {
    resultStr = 'NONE'
  }
  return resultStr;
}

function avgMoneyGenerated() {
  //dollars per hour from average rate after production - consumption
  const costPerKwh = 0.11;
  const avgEnergyRate = costPerKwh * (hourlyProduction() - hourlyConsumption());
  return avgEnergyRate;
}
function moneyGenerated() {
  //dollars per hour from production
  const costPerKwh = 0.11;
  const posEnergyRate = costPerKwh * hourlyProduction();
  return (posEnergyRate)/1000;
}

function moneyConsumed() {
  //dollars per hour from production
  const costPerKwh = 0.11;
  const posEnergyRate = costPerKwh * hourlyConsumption();
  return (posEnergyRate)/1000;
}

//create a function to update storeEnergy every minute using totalConsumption/totalProduction
function energyTime() {
  //this will be how many minutes of current usage left
  let energy_left_min = 0;
  const w = Weather.find().fetch()[0];
  const stored = w.storedEnergy;
  energy_left_min = stored / (hourlyProduction() - hourlyConsumption())/60.00;
  return energy_left_min;
}

function xaxis() {
  let d = new Date();
  let h = d.getHours();
  let labels = [];
  for (let i = 0; i < 24; i ++) {
    labels.push(h)
    if (h === 23) {
      h = 0;
    } else {
      h += 1;
    }
  }
  return labels;
}

/*window.setInterval(function(){
  let storedEnergy = 0;
  storedEnergy += (totalProduction() - totalConsumption())/60.00;
  const w = Weather.find().fetch()[0];
  w.update(weather._id, {
    $set: {storedEnergy},
  });
  energyTime();
}, 60000);
*/

Template.Home_Page.helpers({
  errorClass() {
    return Template.instance().messageFlags.get(displayErrorMessages) ? 'error' : '';
  },
  fieldError(fieldName) {
    const invalidKeys = Template.instance().context.invalidKeys();
    const errorObject = _.find(invalidKeys, (keyObj) => keyObj.name === fieldName);
    return errorObject && Template.instance().context.keyErrorMessage(errorObject.name);
  },
  /**
   * @returns {*} The location weather.
   */
  weather() {
    const w = Weather.find().fetch();
    console.log(w[0].devices);
    return w[0];
  },
  barRatio() {
    if (hourlyProduction() === 0) {
      return 0;
    } else if (totalConsumption() === 0) {
      return 100;
    } else {
      const totalEnergy = hourlyProduction() - hourlyConsumption();
      return (hourlyProduction()/hourlyConsumption())*100;
    }
  },
  efficiency() {
    const w_temp = Weather.find().fetch();
    const w = w_temp[0];
    const cloud_percent = parseFloat(w.clouds)/100.00;
    // const day = dayofYear(new Date());
    // const rad_ind = parseInt(day)*24;
    const p = (1 - (0.75 * (Math.pow(cloud_percent, 3))));
    const actual_radiation = p * parseFloat(w.radiation);
    // get from ui total_consumption per hour
    let total_consumption = 500;
    // get panelEff from ui
    let panelEff = .20;
    // assign total_consumption or return it

    // get panel size from ui
    const panelSize = 8;
    const total_energy = actual_radiation*panelSize*panelEff - total_consumption;
    return total_energy;
  },
  totalConsumptionHelper() {
    const difference = Math.round((hourlyConsumption() - hourlyProduction())/1000);
    if (difference < 0) {
      return 0;
    }
    return difference;
  },
  hourlyProductionHelper() {
    return Math.round(hourlyProduction()/1000);
  },
  rawCost() {
    return moneyConsumed().toFixed(2);
  },
  saved() {
    if (moneyGenerated() > moneyConsumed()) {
      return moneyConsumed().toFixed(2);
    }
    return moneyGenerated().toFixed(2);
  },
  finalCost() {
    const difference = moneyConsumed()-moneyGenerated();
    if (difference < 0) {
      return 0;
    }
    return difference.toFixed(2);
  },
  productionGraphHelper() {
    return productionGraph();
  },
  consumptionGraphHelper() {
    return consumptionGraph();
  },
  location() {
    const w = Weather.find().fetch();
    if (!w[0]){
      return '(No current location)';
    } else {
      return `(${w[0].name})`;
    }
  },
  productionTotalHelper() {
    return Math.round(productionTotal());
  },
  consumptionTotalHelper() {
    return Math.round(consumptionTotal());
  },
  batteryUsageTotalHelper() {
    return Math.round(batteryUsageTotal());
  },
  gridUsageTotalHelper() {
    return Math.round(gridUsageTotal());
  },
  solarUsageTotal() {
    return Math.round(consumptionTotal() - (batteryUsageTotal() + gridUsageTotal()));
  },
  batteryUsageTotalCostHelper() {
    return (batteryUsageTotal() * 0.11).toFixed(2);
  },
  gridUsageTotalCostHelper() {
    return (gridUsageTotal() * 0.11).toFixed(2);
  },
  solarUsageTotalCost() {
    return ((Math.round(consumptionTotal() - (batteryUsageTotal() + gridUsageTotal())))*0.11).toFixed(2);
  },
  totalSaved() {
    return (((consumptionTotal() - (batteryUsageTotal() + gridUsageTotal()))*0.11) + (batteryUsageTotal() * 0.11)).toFixed(2);
  },
  currentStateHelper() {
    if (currentState() === 'NONE') {
      return 'You are not currently consuming any energy';
    } else {
      return `You are currently running on ${currentState()}`;
    }
  },
  barColor() {
    const currentState = currentState();
    if (currentState === 'SOLAR') {
      return 'green';
    } else if (currentState === 'GRID') {
      return 'orange';
    } else if (currentState === 'BATTERY') {
      return 'green';
    } else if (currentState === 'NONE') {
      return 'grey';
    }
  }
});

Template.Home_Page.onCreated(function onCreated() {
    this.subscribe(Weather.getPublicationName());
});

Template.Home_Page.events({
  'submit .location-data'(event, instance) {
    event.preventDefault();
    // Get name (text field)
    const latitude = document.getElementById("latInput").value;
    const longitude = document.getElementById("longInput").value;
    Meteor.call('checkWeather', latitude, longitude);
    //Meteor.call('checkRadiation', latitude, longitude);
  },
  'submit .panel-data'(event, instance) {
    event.preventDefault();
    // Get name (text field)
    const areaPanel = document.getElementById("panelAreaInput").value;
    const absorbPanel = document.getElementById("panelAbsorbInput").value;
    const battery = document.getElementById("batteryInput").value;
    const weathers = Weather.find().fetch();
    const weather = weathers[0];
    Weather.update(weather._id, {
     $set: { areaPanel, absorbPanel, battery},
    });
    //Meteor.call('checkRadiation', latitude, longitude);
  },
});

Template.Home_Page.onRendered(function onRendered() {
  this.$('.ui.accordion').accordion();
  this.$('.carousel.carousel-slider').carousel({fullWidth: true});

  this.autorun(() => {
    if (this.subscriptionsReady()){
    var ctx = document.getElementById("myChart");

    var fillBetweenLinesPlugin = {
      afterDatasetsDraw: function (chart) {
        var ctx = chart.chart.ctx;
        var xaxis = chart.scales['x-axis-0'];
        var yaxis = chart.scales['y-axis-0'];
        var datasets = chart.data.datasets;
        ctx.save();

        for (var d = 0; d < datasets.length; d++) {
          var dataset = datasets[d];
          if (dataset.fillBetweenSet == undefined) {
            continue;
          }

          // get meta for both data sets
          var meta1 = chart.getDatasetMeta(d);
          var meta2 = chart.getDatasetMeta(dataset.fillBetweenSet);

          ctx.beginPath();

          // vars for tracing
          var curr, prev;

          // trace set1 line
          for (var i = 0; i < meta1.data.length; i++) {
            curr = meta1.data[i];
            if (i === 0) {
              ctx.moveTo(curr._view.x, curr._view.y);
              ctx.lineTo(curr._view.x, curr._view.y);
              prev = curr;
              continue;
            }
            if (curr._view.steppedLine === true) {
              ctx.lineTo(curr._view.x, prev._view.y);
              ctx.lineTo(curr._view.x, curr._view.y);
              prev = curr;
              continue;
            }
            if (curr._view.tension === 0) {
              ctx.lineTo(curr._view.x, curr._view.y);
              prev = curr;
              continue;
            }

            ctx.bezierCurveTo(
                prev._view.controlPointNextX,
                prev._view.controlPointNextY,
                curr._view.controlPointPreviousX,
                curr._view.controlPointPreviousY,
                curr._view.x,
                curr._view.y
            );
            prev = curr;
          }


          // connect set1 to set2 then BACKWORDS trace set2 line
          for (var i = meta2.data.length - 1; i >= 0; i--) {
            curr = meta2.data[i];
            if (i === meta2.data.length - 1) {
              ctx.lineTo(curr._view.x, curr._view.y);
              prev = curr;
              continue;
            }
            if (curr._view.steppedLine === true) {
              ctx.lineTo(prev._view.x, curr._view.y);
              ctx.lineTo(curr._view.x, curr._view.y);
              prev = curr;
              continue;
            }
            if (curr._view.tension === 0) {
              ctx.lineTo(curr._view.x, curr._view.y);
              prev = curr;
              continue;
            }

            // reverse bezier
            ctx.bezierCurveTo(
                prev._view.controlPointPreviousX,
                prev._view.controlPointPreviousY,
                curr._view.controlPointNextX,
                curr._view.controlPointNextY,
                curr._view.x,
                curr._view.y
            );
            prev = curr;
          }

          ctx.closePath();
          ctx.fillStyle = dataset.fillBetweenColor || "rgba(0,0,0,0.1)";
          ctx.fill();
        }
      } // end afterDatasetsDraw
    }; // end fillBetweenLinesPlugin

    Chart.pluginService.register(fillBetweenLinesPlugin);
    Chart.defaults.global.responsive = true
    Chart.defaults.global.maintainAspectRatio = true
    var data = {
    labels: xaxis(),
    datasets: [
      {
        label: "Solar Energy Generated",
        fill: false,
        lineTension: 0,
        backgroundColor: "rgba(75,192,192,0.4)",
        borderColor: "rgba(75,192,192,1)",
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: "rgba(75,192,192,1)",
        pointBackgroundColor: "#fff",
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgba(75,192,192,1)",
        pointHoverBorderColor: "rgba(220,220,220,1)",
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: productionGraph(),
        spanGaps: false,
        //fillBetweenSet: 1,
        //fillBetweenColor: "rgba(255,0,0, 0.2)",
      },
      {
        label: "Energy Usage",
        fill: false,
        lineTension: 0,
        backgroundColor: "rgba(128,0,0,0.4)",
        borderColor: "rgba(128,0,0,0.4)",
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: "rgba(75,192,192,1)",
        pointBackgroundColor: "#fff",
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgba(75,192,192,1)",
        pointHoverBorderColor: "rgba(220,220,220,1)",
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: consumptionGraph(),
        spanGaps: false,
      },
      {
        label: "Battery Storage",
        fill: false,
        lineTension: 0,
        backgroundColor: "rgba(0,0,0,1)",
        borderColor: "rgba(0,0,0,1)",
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: "rgba(75,192,192,1)",
        pointBackgroundColor: "#fff",
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgba(75,192,192,1)",
        pointHoverBorderColor: "rgba(220,220,220,1)",
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: batteryGraph(),
        spanGaps: false,
      }
    ]
  };
    let options= {
      scales: {
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'kWh'
          }
        }],
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Time of Day'
          }
        }]
      }
    }
  var myLineChart = new Chart(ctx, {
    type: 'line',
    data: data,
    options: options,
  });
  };
});
});

