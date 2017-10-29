/**
 * Этот проект для измерения расстояния
 */

 // Настройки подключения датчиков
const PIN_STATUS_BUTTON = P0;
const PIN_INPUT_ULTRASONIC_TRIGGER = P12;
const PIN_INPUT_ULTRASONIC_ECHO = P13;

// Остальные настройки
const DISTANCE_MEASURE_INTERVAL_TIME_MS = 500;

// Кнопка для глобального включения / выключения
var isSchemeEnabled = true;
var $toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log("Button click triggers new schema status: ", isSchemeEnabled);
}
$toggleButton.on('click', toggleSchemaStatus);


var $sonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin : PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin : PIN_INPUT_ULTRASONIC_ECHO
  });


function main() {
  "use strict";
  if (!isSchemeEnabled) {
    console.log("The schema is disabled");
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

setInterval(main,  DISTANCE_MEASURE_INTERVAL_TIME_MS);
