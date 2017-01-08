// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P7;
const PIN_SERVO = P12;

const SERVO_MOVE_TIME_MS = 1000;

const INITIAL_ANGLE = 0;
const MAX_POSSIBLE_ANGLE = 170;

var $servo = require('@amperka/servo').connect(PIN_SERVO);

// Кнопка для глобального включения / выключения
var $toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

var isSchemeEnabled = false;
function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log("Button click triggers new schema status: ", isSchemeEnabled);
}
$toggleButton.on('click', toggleSchemaStatus);



setInterval(
  function () {
    "use strict";

    if (!isSchemeEnabled) return;

    // Reset to default angle value

    $servo.write(INITIAL_ANGLE);

    let newAngle = Math.floor(MAX_POSSIBLE_ANGLE * Math.random());
    let timeFrom = getTime();
    $servo.write(newAngle);
    let timeTo = getTime();

    let totalTimeMs = 1e3 * (timeTo - timeFrom);
    let deltaAngle = newAngle - INITIAL_ANGLE;
    let timePerDegreeMs = totalTimeMs / deltaAngle;

    console.log(
      "Angle:", newAngle,
      "Time, ms:", totalTimeMs.toFixed(3),
      "Time per degree, ms:", timePerDegreeMs.toFixed(3)
    );

  },
  SERVO_MOVE_TIME_MS
);
