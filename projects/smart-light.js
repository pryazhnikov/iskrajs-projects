// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P7;
const PIN_INPUT_ULTRASONIC_TRIGGER = P12;
const PIN_INPUT_ULTRASONIC_ECHO = P13;
const PIN_INPUT_LIGHT_SENSOR = A0;
const PIN_OUTPUT_LIGHT = P0;

const MOTION_CHECK_TIME_MS = 400;
const LIGHT_ENABLE_TIME_MS = 15000;

const SONAR_ANOMALY_PERCENT = 10;
const LIGHT_DISABLE_TRESHOLD_LX = 30;

var $sonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin: PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin: PIN_INPUT_ULTRASONIC_ECHO,
  });

var $lightSensor = require('@amperka/light-sensor')
  .connect(PIN_INPUT_LIGHT_SENSOR);

// Кнопка для глобального включения / выключения
var $toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

var $light = require('@amperka/led')
  .connect(PIN_OUTPUT_LIGHT)
  .turnOff();

var isSchemeEnabled = true;
function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log('Button click triggers new schema status: ', isSchemeEnabled);
  if (!isSchemeEnabled) {
    lightDisable();
  }
}

$toggleButton.on('click', toggleSchemaStatus);

function hasAnomaliesInWindow(window) {
  if (!window.isFull()) {
    return false;
  }

  let foundValues = window.getLastValues();
  if (foundValues.length < 2) {
    return false;
  }

  let baseValue = foundValues[0];
  let baseDiff  = Math.abs(baseValue * SONAR_ANOMALY_PERCENT / 100);
  for (let key in foundValues) {
    let value = foundValues[key];
    let valueDiff = Math.abs((value - baseValue));
    if (valueDiff >= baseDiff) {
      return true;
    }
  }

  return false;
}

let lightStatus = {
  generation: 0,
  isEnabled: false,
  enableTime: 0,
};
function lightEnable() {
  if (lightStatus.isEnabled) return;

  lightStatus.generation++;
  lightStatus.isEnabled = true;
  lightStatus.enableTime = getTime().toFixed(0);

  $light.turnOn().brightness(1.0);
  console.log(
    'Light enabling:', lightStatus.enableTime
  );

  let disableGeneration = lightStatus.generation;
  setTimeout(
    function () {
      // Эта функция может вызваться после того, как свет выключится
      // по другой причине и включится снова
      if (lightStatus.generation == disableGeneration) {
        lightDisable();
      } else {
        console.log(
          'Light disable ignore!',
          'Disable generation:', disableGeneration,
          'Current generation:', lightStatus.generation
        );
      }
    },

    LIGHT_ENABLE_TIME_MS
  );
}

function lightDisable() {
  if (!lightStatus.isEnabled) return;

  let disableTime = getTime().toFixed(0);
  let workTime = disableTime - lightStatus.enableTime;
  console.log(
    'Light disabling:', disableTime,
    'Work time:', workTime
  );

  $light.turnOff();
  lightStatus.isEnabled = false;
}

var sonarValuesWindow = require('values-window')
  .createIntValuesWindow(3);
setInterval(
  function () {
    'use strict';

    if (!isSchemeEnabled) {
      return;
    }

    let lightValue = $lightSensor.read('lx');
    let timeStart = getTime();
    $sonicSensor.ping(
      function (err, value) {
        let timeFinish = getTime();
        let sonarValue = null;
        if (err) {
          console.log('Sensor: cannot get ultrasonic value:', err.msg);
        } else {
          // Расстояние меряем в миллиметрах, дробная часть не нужна
          sonarValue = Math.round(value);
        }

        let waitTimeMs = Math.round(1e3 * (timeFinish - timeStart));

        let isEnoughLight = (lightValue >= LIGHT_DISABLE_TRESHOLD_LX);
        let hasMovement = false;
        if (sonarValue) {
          sonarValuesWindow.addValue(sonarValue);
          hasMovement = hasAnomaliesInWindow(sonarValuesWindow);
        }

        if (isEnoughLight) {
          lightDisable();
        } else if (hasMovement) {
          lightEnable();
        }

        let movementStr = hasMovement ? 'Yes' : 'No';
        let sonarValuesStr = sonarValuesWindow
          .getLastValues()
          .join(', ');
        console.log(
          'Light value, lx:', lightValue.toFixed(3),
          'Wait time, ms:', waitTimeMs,
          movementStr,
          'Sonar value, mm:', sonarValuesStr
        );

      },

      'mm'
    );
  },

  MOTION_CHECK_TIME_MS
);
