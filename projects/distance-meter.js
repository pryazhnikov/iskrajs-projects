/**
 * Этот проект для измерения расстояния
 */

 // Настройки подключения датчиков
const PIN_STATUS_BUTTON = P0;
const PIN_INPUT_ULTRASONIC_TRIGGER = P12;
const PIN_INPUT_ULTRASONIC_ECHO = P13;

// Остальные настройки
const DISTANCE_MEASURE_INTERVAL_TIME_MS = 500;

// Контекст работы со схемой
let RangeScheme = {
  '_isEnabled': false,

  '_updateCallback': null,

  '_updateIntervalId': null,

  'isEnabled': function () {
    return this._isEnabled;
  },

  'toggleEnabled': function () {
    this._isEnabled = !this._isEnabled;
    this._processCallback();
  },

  'init': function (callback) {
    this._updateCallback = callback;
    this._processCallback();
  },

  '_processCallback': function () {
    if (this._isEnabled && this._updateCallback) {
      this._updateIntervalId = setInterval(this._updateCallback,  DISTANCE_MEASURE_INTERVAL_TIME_MS);
    } else if (!this._isEnabled && this._updateIntervalId) {
      clearInterval(this._updateIntervalId);
      this._updateIntervalId = null;
    }
  }
};

// Кнопка для глобального включения / выключения
var isSchemeEnabled = true;
var $toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

function toggleSchemaStatus() {
  RangeScheme.toggleEnabled();
  console.log("Button click triggers new schema status: ", RangeScheme.isEnabled());
}
$toggleButton.on('click', toggleSchemaStatus);

// Работа с дальномером
var $sonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin : PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin : PIN_INPUT_ULTRASONIC_ECHO
  });

function main() {
  "use strict";
  if (!RangeScheme.isEnabled()) {
    console.log("The scheme is disabled");
    return;
  }

  let timeStart = getTime();
  $sonicSensor.ping(
    function (err, value) {
      let timeFinish = getTime();
      let sonarValue = null;
      if (err) {
        console.log("Sensor: cannot get ultrasonic value:", err.msg);
      } else {
        // Расстояние меряем в миллиметрах, дробная часть не нужна
        sonarValue = Math.round(value);
      }

      let waitTimeMs = 1e3 * (timeFinish - timeStart);
      console.log(
        "Sonar value, mm:", sonarValue,
        "Wait time, ms:", waitTimeMs.toFixed(3)
      );

      if (waitTimeMs > DISTANCE_MEASURE_INTERVAL_TIME_MS) {
        console.log("Sonar wait time is greater than interval time", DISTANCE_MEASURE_INTERVAL_TIME_MS);
      }
    },
    "mm"
  );

}


RangeScheme.init(main);
