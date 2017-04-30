import { Template } from 'meteor/templating';
import { Weather } from '../../api/weather/weather.js';
import { Meteor } from 'meteor/meteor';

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
    return w[0];
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
    console.log(cloud_percent);
    console.log(p);
    console.log(actual_radiation);
    console.log(actual_radiation*panelSize*panelEff);
    console.log(total_energy);
    return total_energy;
  },
});

Template.Home_Page.onCreated(function onCreated() {
  this.autorun(() => {
    this.subscribe('Weather');
  });
});

Template.Home_Page.events({
  'submit .contact-data-form'(event, instance) {
    event.preventDefault();
    // Get name (text field)
    const latitude = event.target.Latitude.value;
    const longitude = event.target.Longitude.value;
    Meteor.call('checkWeather', latitude, longitude);
    //Meteor.call('checkRadiation', latitude, longitude);
  },
});

Template.Home_Page.onRendered(function onRendered() {
  this.$('.ui.accordion').accordion();
});
