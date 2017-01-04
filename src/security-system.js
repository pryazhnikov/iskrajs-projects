/**
 * Детектор движения
 */

// Настройки таймаутов
const REACTION_TIME_MS = 250;
const STATUS_SHOW_PERIOD_MS = 2000;

const ANOMALY_ALARM_TIME_MS = 5000;
const ANOMALY_SENSORS_BUFFER_SIZE = 10;
const ANOMALY_SENSIVITY_PERCENT = 20;

// Настройки подключения датчиков
const PIN_STATUS_BUTTON = P7;
const PIN_OUTPUT_LIGHT = P0;
const PIN_INPUT_LIGHT = A0;
const PIN_INPUT_ULTRASONIC_TRIGGER = P8;
const PIN_INPUT_ULTRASONIC_ECHO = P9;

console.log("Scenario run start");

/* Возможность включить-выключить схему */

// Кнопка для глобального включения / выключения
var ToggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

var isSchemeEnabled = true;
function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log("Button triggers new schema status: ", isSchemeEnabled);
  if (!isSchemeEnabled) {
    resetSchemeState();
  } else {
    resetStatusLight();
  }
}
ToggleButton.on('release', toggleSchemaStatus);

// Показ глобального статуса аналогичного ТВ:
// Лампочка моргает когда система выключена
// Лампочка выключена, когда система включена и работает
var statusValue = false;
function toggleStatusLight(forcedValue) {
  let newStatusValue;
  if (typeof forcedValue != 'undefined') {
    newStatusValue = !!forcedValue;
  } else if (isSchemeEnabled) {
    newStatusValue = false;
  } else {
    newStatusValue = !statusValue;
  }

  if (newStatusValue != statusValue) {
    statusValue = newStatusValue;
    let intValue = statusValue ? 1 : 0;
    LED1.write(intValue);
  }
}
setInterval(toggleStatusLight, STATUS_SHOW_PERIOD_MS);

// Сброс лампочки (для включения системы)
function resetStatusLight() {
  console.log("Status light reset to default state");
  toggleStatusLight(false);
}


//-- Module begin
function IntValuesWindow(windowSize) {
  this._valuesCount = 0;
  this._bufferSize = windowSize;
  this._values = new Uint32Array(this._bufferSize);
}

IntValuesWindow.prototype.addValue = function(value) {
  if (this._valuesCount < this._bufferSize) {
    // Окно еще не заполнено, просто добавляем новое значение
    this._values[this._valuesCount] = value;
  } else {
    // Окно уже полностью заполнено, чтобы добавить новое значение мы должны  убрать самое старое
    for (let i = 1; i < this._bufferSize; i++) {
      this._values[i - 1] = this._values[i];
    }

    this._values[this._bufferSize - 1] = value;
  }

  this._valuesCount++;
  return true;
};

IntValuesWindow.prototype.reset = function() {
  for (let i = 0; i < this._bufferSize; i++) {
    this._values[i] = 0;
  }
  this._valuesCount = 0;
};

IntValuesWindow.prototype.isFull = function() {
  return (this._valuesCount >= this._bufferSize);
};

IntValuesWindow.prototype.getValuesCount = function() {
  return this._valuesCount;
};

IntValuesWindow.prototype.getLastValues = function() {
  return this._values;
};
IntValuesWindow.prototype.toString = function() {
  let stopIndex = Math.min(this._valuesCount, this._bufferSize);
  let digestValues = this._values.slice(0, stopIndex);
  return digestValues.join(", ");
};

//-- Module end


//-- Module begin
function SecurityChecker(LightSensor, SonicSensor, AlarmLight) {
  this._LightSensor = LightSensor;
  this._SonicSensor = SonicSensor;
  this._AlarmLight  = AlarmLight;

  this._isAlarmEnabled = false;
  this._lightSensorValues = new IntValuesWindow(
    ANOMALY_SENSORS_BUFFER_SIZE
  );
}

SecurityChecker.prototype.resetState = function () {
  // Сначала видимые пользователю изменения...
  this.disableAlarm();

  // ... а затем невидимые
  this._lightSensorValues.reset();
};

SecurityChecker.prototype.disableAlarm = function () {
  if (!this._isAlarmEnabled) return;

  this._AlarmLight.turnOff();
  this._isAlarmEnabled = false;
};

SecurityChecker.prototype.enableAlarm = function () {
  if (this._isAlarmEnabled) return;

  this._AlarmLight.blink(0.6, 0.4);
  this._isAlarmEnabled = true;

  // Через какое-то время система сама выключается
  setTimeout(this.disableAlarm, ANOMALY_ALARM_TIME_MS);
};


SecurityChecker.prototype.updateStatus = function () {
  let lightValue = this._LightSensor.read('lx').toFixed(0);
  let context = this;
  this._SonicSensor.ping(
    function (err, value) {
      let sonarValue = null;
      if (err) {
        console.log("Cannot get ultrasonic value:", err.msg);
      } else {
        // Расстояние меряем в миллиметрах, дробная часть не нужна
        sonarValue = Math.round(value);
      }

      context._onValuesReady(lightValue, sonarValue);
    },
    "mm"
  );
};

SecurityChecker.prototype._onValuesReady = function (lightValue, sonarValue) {
  let hasAnomaly = false;

  // Пока мы умеем ловить только аномалии в свете
  if (this._lightSensorValues.isFull()) {
    if (this._isAnomalyValue(lightValue, this._lightSensorValues)) {
      hasAnomaly = true;
      console.log("Light sensor anomaly found");
    }
  }

  if (hasAnomaly) {
    this.enableAlarm();
  }

  this._lightSensorValues.addValue(lightValue);

  console.log(
    '#', this._lightSensorValues.getValuesCount(),
    "Sonar:", sonarValue,
    "light(lx):", this._lightSensorValues.toString()
  );
};

// @TODO move into standalone function & call it as a callback
SecurityChecker.prototype._isAnomalyValue = function (value, valuesWindow) {
  let sumValues  = 0;
  let itemsCount = 0;
  let itemsList = valuesWindow.getLastValues();
  for (let i in itemsList) {
    sumValues += itemsList[i];
    itemsCount++;
  }
  if (0 === itemsCount) return false;

  let avgValue = sumValues / itemsCount;
  let deltaPercent = (100 * Math.abs(avgValue - value) / avgValue);
  console.log(
    "Value:", value,
    "Average:", avgValue.toFixed(2),
    "Delta:", deltaPercent.toFixed(2)
  );

  return deltaPercent >= ANOMALY_SENSIVITY_PERCENT;
};
//-- Module end

var Light = require('@amperka/led')
  .connect(PIN_OUTPUT_LIGHT);
var LightSensor = require('@amperka/light-sensor')
  .connect(PIN_INPUT_LIGHT);
var SonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin : PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin : PIN_INPUT_ULTRASONIC_ECHO
  });

var checker = new SecurityChecker(
  LightSensor,
  SonicSensor,
  Light
);

function resetSchemeState() {
  console.log("Schema reset to default state");
  checker.resetState();
}
resetSchemeState();

setInterval(
  function () {
    if (!isSchemeEnabled) return;

    checker.updateStatus();
  },
  REACTION_TIME_MS
);
