// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P7;
const PIN_INPUT_ULTRASONIC_TRIGGER = P12;
const PIN_INPUT_ULTRASONIC_ECHO = P13;
const PIN_INPUT_LIGHT_SENSOR = A0;
const PIN_OUTPUT_LIGHT = P0;

const MOTION_CHECK_TIME_MS = 500;
const LIGHT_ENABLE_TIME_MS = 5000; // = 5 секунд

const SONAR_ANOMALY_PERCENT = 10;

var $sonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin : PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin : PIN_INPUT_ULTRASONIC_ECHO
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
  console.log("Button click triggers new schema status: ", isSchemeEnabled);
  if (!isSchemaEnabled) {
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

let isLightEnabled = false;
function lightEnable() {
  if (isLightEnabled) return;

  console.log(
    "Light enabling:", getTime().toFixed(0)
  );

  $light.turnOn().brightness(1.0);
  isLightEnabled = true;
  setTimeout(lightDisable, LIGHT_ENABLE_TIME_MS);
}

function lightDisable() {
  if (isLightEnabled) {
    console.log(
      "Light disabling:", getTime().toFixed(0)
    );

    $light.turnOff();
    isLightEnabled = false;
  }
}

var sonarValuesWindow = require('values-window')
  .createIntValuesWindow(3);
setInterval(
  function () {
    "use strict";

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
          console.log("Sensor: cannot get ultrasonic value:", err.msg);
        } else {
          // Расстояние меряем в миллиметрах, дробная часть не нужна
          sonarValue = Math.round(value);
        }

        let waitTimeMs = Math.round(1e3 * (timeFinish - timeStart));

        let hasMovement = false;
        if (sonarValue) {
          sonarValuesWindow.addValue(sonarValue);
          hasMovement = hasAnomaliesInWindow(sonarValuesWindow);
        }

        if (hasMovement) {
          lightEnable();
        }

        let movementStr = hasMovement ? 'Yes' : 'No';
        let sonarValuesStr = sonarValuesWindow
          .getLastValues()
          .join(", ");
        console.log(
          "Light value, lx:", lightValue.toFixed(3),
          "Wait time, ms:", waitTimeMs,
          movementStr,
          "Sonar value, mm:", sonarValuesStr
        );

      },
      "mm"
    );
  },
  MOTION_CHECK_TIME_MS
);
