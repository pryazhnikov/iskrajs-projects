// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P7;
const PIN_STATUS_LIGHT = P0;
const PIN_SERVO = P9;
const PIN_INPUT_ULTRASONIC_TRIGGER = P12;
const PIN_INPUT_ULTRASONIC_ECHO = P13;

//--
// Практика показывает, что при превышании 170 градусов, у сервопривода возникают проблемы. Ограничение снизу в 10 взято для симметрии
const SERVO_ANGLE_VALUE_MIN = 10;
const SERVO_ANGLE_VALUE_MAX = 170;
const SERVO_ANGLE_VALUE_INIT = (SERVO_ANGLE_VALUE_MIN + SERVO_ANGLE_VALUE_MAX) / 2;
const SERVO_ANGLE_VALUE_DELTA = (SERVO_ANGLE_VALUE_MIN + SERVO_ANGLE_VALUE_MAX) / 10;
const SERVO_MOVE_TIME_MS = 750;

var $servo = require('@amperka/servo', {freq:25}).connect(PIN_SERVO);
var $sonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin : PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin : PIN_INPUT_ULTRASONIC_ECHO
  });


// Кнопка для глобального включения / выключения
var $toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

var $statusLight = require('@amperka/led')
  .connect(PIN_STATUS_LIGHT)
  .brightness(0.25)
  .turnOn();

var isSchemeEnabled = false;
function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log("Button click triggers new schema status: ", isSchemeEnabled);
  $statusLight.toggle(!isSchemeEnabled);
}
$toggleButton.on('click', toggleSchemaStatus);

$toggleButton.on(
  'hold',
  function () {
    "use strict";

    console.log("Schema reset to initial state");
    servoScanner.moveTo(SERVO_ANGLE_VALUE_INIT);
    isSchemeEnabled = false;
  }
);

//--
var servoScanner = require('servo-scanner').connect(
  $servo,
  SERVO_ANGLE_VALUE_INIT,
  SERVO_ANGLE_VALUE_MIN,
  SERVO_ANGLE_VALUE_MAX,
  SERVO_ANGLE_VALUE_DELTA
);

setInterval(
  function () {
    "use strict";

    if (!isSchemeEnabled) {
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
          "Servo angle:", servoScanner.getAngle(),
          "Sonar value, ms:", sonarValue,
          "Wait time, ms:", waitTimeMs.toFixed(3)
        );

        servoScanner.moveToNext();
      },
      "mm"
    );
  },
  SERVO_MOVE_TIME_MS
);
