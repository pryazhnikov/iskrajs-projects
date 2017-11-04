
// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P7;
const PIN_SERVO = P12;

// Практика показывает, что при превышании 170 градусов, у сервопривода возникают проблемы. Ограничение снизу в 10 взято для симметрии
const SERVO_ANGLE_VALUE_MIN = 10;
const SERVO_ANGLE_VALUE_MAX = 170;
const SERVO_ANGLE_VALUE_INIT = (SERVO_ANGLE_VALUE_MIN + SERVO_ANGLE_VALUE_MAX) / 2;
const SERVO_ANGLE_VALUE_DELTA = (SERVO_ANGLE_VALUE_MIN + SERVO_ANGLE_VALUE_MAX) / 10;
const SERVO_MOVE_TIME_MS = 750;

var $myServo = require('@amperka/servo').connect(PIN_SERVO);
var ServoScanner = require('servo-scanner').connect(
  $myServo,
  SERVO_ANGLE_VALUE_INIT,
  SERVO_ANGLE_VALUE_MIN,
  SERVO_ANGLE_VALUE_MAX,
  SERVO_ANGLE_VALUE_DELTA
);

// Кнопка для глобального включения / выключения
var toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

var isSchemeEnabled = true;
function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log("Button click triggers new schema status: ", isSchemeEnabled);
}
toggleButton.on('release', toggleSchemaStatus);

function resetSchemaState() {
  console.log("Button hold triggers schema reset");

  ServoScanner.moveTo(SERVO_ANGLE_VALUE_INIT);
  // False т.к. при отпускании кнопки сработает событие release
  isSchemeEnabled = false;
}
toggleButton.on('hold', resetSchemaState);

setInterval(
  function () {
    if (!isSchemeEnabled) return;

    let angleBefore = ServoScanner.getAngle();
    ServoScanner.moveToNext();

    let angleAfter = ServoScanner.getAngle();
    let angleDelta = ServoScanner.getAngleDelta();
    console.log(
      "Time:", getTime().toFixed(3),
      "Old angle:", angleBefore,
      "New angle:", angleAfter,
      "Delta:", angleDelta
    );
  },
  SERVO_MOVE_TIME_MS
);
