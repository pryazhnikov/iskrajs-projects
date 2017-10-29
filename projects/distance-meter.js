/**
 * Этот проект для измерения расстояния
 */

// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P0;
const PIN_INPUT_ULTRASONIC_TRIGGER = P12;
const PIN_INPUT_ULTRASONIC_ECHO = P13;

// Остальные настройки
const DISTANCE_MEASURE_INTERVAL_TIME_MS = 500;

// "Высокоуровневый" объект для работы со схемой
let RangeScheme = {
  '_isEnabled': false,

  '_updateCallback': null,

  '_enabledChangeCallback': null,

  '_updateIntervalId': null,

  'isEnabled': function () {
    return this._isEnabled;
  },

  'setEnabledChangeCallback': function (callback) {
    this._enabledChangeCallback = callback;
  },

  'toggleEnabled': function () {
    this._isEnabled = !this._isEnabled;
    this._processCallback();
  },

  'run': function (updateCallback) {
    this._updateCallback = updateCallback;
    this._processCallback();
  },

  '_processCallback': function () {
    if (this._enabledChangeCallback) {
      this._enabledChangeCallback(this._isEnabled);
    }

    if (this._isEnabled && this._updateCallback) {
      let measurePeriodTime = DISTANCE_MEASURE_INTERVAL_TIME_MS;
      let context = this;
      this._updateIntervalId = setInterval(
        function () {
          context._updateCallback(measurePeriodTime);
        },
        measurePeriodTime
      );
    } else if (!this._isEnabled && this._updateIntervalId) {
      clearInterval(this._updateIntervalId);
      this._updateIntervalId = null;
    }
  }
};

// Кнопка для глобального включения / выключения
var $toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

$toggleButton.on('click', function () { RangeScheme.toggleEnabled(); });
RangeScheme.setEnabledChangeCallback(
  function (newEnabledValue) {
    console.log("The new scheme enabled value: ", newEnabledValue);
    LED1.write(newEnabledValue ? 1 : 0);
  }
);

// Работа с дальномером
var $sonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin : PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin : PIN_INPUT_ULTRASONIC_ECHO
  });

function getNewDistanceValue(measurePeriodTime) {
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

      if (waitTimeMs > measurePeriodTime) {
        console.log("Sonar wait time is greater than measure period time", measurePeriodTime);
      }
    },
    "mm"
  );

}

// Запуск схемы
RangeScheme.run(getNewDistanceValue);
