
// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P7;
const PIN_SERVO = P12;

// Практика показывает, что при превышании 170 градусов, у сервопривода возникают проблемы. Ограничение снизу в 10 взято для симметрии
const SERVO_ANGLE_VALUE_MIN = 10;
const SERVO_ANGLE_VALUE_MAX = 170;
const SERVO_ANGLE_VALUE_INIT = (SERVO_ANGLE_VALUE_MIN + SERVO_ANGLE_VALUE_MAX) / 2;
const SERVO_ANGLE_VALUE_DELTA = (SERVO_ANGLE_VALUE_MIN + SERVO_ANGLE_VALUE_MAX) / 10;
const SERVO_MOVE_TIME_MS = 750;

// Класс для работы
function ServoScanner(
  Servo,
  initialAngle,
  minAngle,
  maxAngle,
  angleDelta
) {
  this._Servo = Servo;
  this._minAngle = minAngle;
  this._maxAngle = maxAngle;
  this._angleDelta = angleDelta;
  this.moveTo(initialAngle);
}

ServoScanner.prototype.getAngle = function () {
  return this._angle;
};

ServoScanner.prototype.getAngleDelta = function () {
  return this._angleDelta;
};

ServoScanner.prototype.moveTo = function (newAngle) {
  if ((newAngle < this._minAngle) || (this._maxAngle < newAngle)) {
    return false;
  }

  this._angle = newAngle;
  return this._Servo.write(this._angle);
};

ServoScanner.prototype.moveToNext = function () {
  let newAngle = this._angle + this._angleDelta;
  if (newAngle > this._maxAngle) {
    // Новый угол выходит за границы диапазона
    this._angleDelta = -1 * Math.abs(this._angleDelta);
    newAngle = this._angle + this._angleDelta;
  } else if (newAngle < this._minAngle) {
    this._angleDelta = Math.abs(this._angleDelta);
    newAngle = this._angle + this._angleDelta;
  }

  return this.moveTo(newAngle);
};

var myServo = require('@amperka/servo').connect(PIN_SERVO);
var ServoWrapper = new ServoScanner(
  myServo,
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

  ServoWrapper.moveTo(SERVO_ANGLE_VALUE_INIT);
  // False т.к. при отпускании кнопки сработает событие release
  isSchemeEnabled = false;
}
toggleButton.on('hold', resetSchemaState);

setInterval(
  function () {
    if (!isSchemeEnabled) return;

    let angleBefore = ServoWrapper.getAngle();
    ServoWrapper.moveToNext();

    let angleAfter = ServoWrapper.getAngle();
    let angleDelta = ServoWrapper.getAngleDelta();
    console.log(
      "Time:", getTime().toFixed(3),
      "Old angle:", angleBefore,
      "New angle:", angleAfter,
      "Delta:", angleDelta
    );
  },
  SERVO_MOVE_TIME_MS
);
