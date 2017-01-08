// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P7;
const PIN_SERVO = P12;

const SERVO_MOVE_TIME_MS = 1000;

const MIN_POSSIBLE_ANGLE = 10;
const MAX_POSSIBLE_ANGLE = 170;
const INITIAL_ANGLE = (MAX_POSSIBLE_ANGLE + MIN_POSSIBLE_ANGLE) / 2;

function getRandomAngle() {
  let range = MAX_POSSIBLE_ANGLE - MIN_POSSIBLE_ANGLE;
  return MIN_POSSIBLE_ANGLE + Math.floor(range * Math.random());
}

//--

var $servo = require('@amperka/servo', {freq:25}).connect(PIN_SERVO);

// Кнопка для глобального включения / выключения
var $toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

var isSchemeEnabled = false;
var isReturnMove    = false;
function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log("Button click triggers new schema status: ", isSchemeEnabled);
}
$toggleButton.on('click', toggleSchemaStatus);

$toggleButton.on(
  'hold',
  function () {
    "use strict";

    console.log("Schema reset");

    $servo.write(INITIAL_ANGLE);
    isSchemeEnabled = false;
    isReturnMove = false;
  }
);

//--


setInterval(
  function () {
    "use strict";

    if (!isSchemeEnabled) return;

    if (isReturnMove) {
      // Reset to default angle value
      $servo.write(INITIAL_ANGLE);
    } else {
      let newAngle = getRandomAngle();
      let timeFrom = getTime();
      $servo.write(newAngle);
      let timeTo = getTime();

      let totalTimeMs = 1e3 * (timeTo - timeFrom);
      let deltaAngle = Math.abs(newAngle - INITIAL_ANGLE);
      let timePerDegreeMs = totalTimeMs / deltaAngle;

      console.log(
        "Angle delta:", deltaAngle,
        "Time, ms:", totalTimeMs.toFixed(3),
        "Time per degree, ms:", timePerDegreeMs.toFixed(3)
      );
    }

    isReturnMove = !isReturnMove;
  },
  SERVO_MOVE_TIME_MS
);
