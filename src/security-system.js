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
var button = require('@amperka/button')
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
button.on('release', toggleSchemaStatus);

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

//
function createSecurityChecker(LightSensor, SonicSensor, Light) {
  var isAlarmEnabled = false;
  var _disableAlarm = function () {
      if (!isAlarmEnabled) return;

      Light.turnOff();
      isAlarmEnabled = false;
  };

  var _enableAlarm = function () {
    if (isAlarmEnabled) return;

    Light.blink(0.6, 0.4);
    isAlarmEnabled = true;

    setTimeout(_disableAlarm, ANOMALY_ALARM_TIME_MS);
  };

  var _numValues = 0;
  var _isCheckAvailable = function () {
    // Принимать решение о тревоге можно только после того,
    // как будет полностью заполнен буфер со значениями
    return _numValues > ANOMALY_SENSORS_BUFFER_SIZE;
  };

  var _lightSensorValues = new Uint32Array(ANOMALY_SENSORS_BUFFER_SIZE);
  function addSensorValueToList(newValue, sensorValuesList) {
    if (_numValues < ANOMALY_SENSORS_BUFFER_SIZE) {
      sensorValuesList[_numValues] = newValue;
    } else {
      // Буффер заполнился, используем фиксированный размер окна
      for (var i = 1; i < ANOMALY_SENSORS_BUFFER_SIZE; i++) {
        sensorValuesList[i - 1] = sensorValuesList[i];
      }

      sensorValuesList[ANOMALY_SENSORS_BUFFER_SIZE - 1] = newValue;
    }
  }

  function resetSensorValuesList(sensorValuesList) {
    for (let i in sensorValuesList) {
      sensorValuesList[i] = 0;
    }
  }

  var _isAnomalyValue = function (value, previousValuesList) {
    let sumValues  = 0;
    let itemsCount = 0;
    for (let i in previousValuesList) {
      sumValues += previousValuesList[i];
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

  var _onValuesReady = function (lightValue, sonarValue) {
    if (_isCheckAvailable()) {
      // Пока мы умеем ловить только аномалии в свете
      let hasAnomaly = false;
      if (_isAnomalyValue(lightValue, _lightSensorValues)) {
        hasAnomaly = true;
        console.log("Light sensor anpmaly found");
      }

      if (hasAnomaly) {
        _enableAlarm();
      }
    }

    addSensorValueToList(lightValue, _lightSensorValues);

    _numValues++;
    console.log(
      "Values:", _numValues,
      "Sonar:", sonarValue,
      "light(lx):", _lightSensorValues.join(", ")
    );
  };

  return {
    'resetState': function () {
      // Сначала видимые пользователю изменения...
      _disableAlarm();

      // ... а затем невидимые
      resetSensorValuesList(_lightSensorValues);
      _numValues = 0;
    },
    'updateStatus' : function () {
      if (!isSchemeEnabled) return;

      var lightValue = LightSensor.read('lx').toFixed(0);
      var sonarValue = null;
      SonicSensor.ping(
        function (err, value) {
          if (err) {
            console.log("Cannot get ultrasonic value:", err.msg);
          } else {
            // Расстояние меряем в миллиметрах, дробная часть не нужна
            sonarValue = Math.round(value);
          }

          _onValuesReady(lightValue, sonarValue);
        },
        "mm"
      );
    }
  };
}

var Light = require('@amperka/led')
  .connect(PIN_OUTPUT_LIGHT);
var LightSensor = require('@amperka/light-sensor')
  .connect(PIN_INPUT_LIGHT);
var SonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin : PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin : PIN_INPUT_ULTRASONIC_ECHO
  });

var SecurityChecker = createSecurityChecker(
  LightSensor,
  SonicSensor,
  Light
);

function resetSchemeState() {
  console.log("Schema reset to default state");
  SecurityChecker.resetState();
}
resetSchemeState();

setInterval(SecurityChecker.updateStatus, REACTION_TIME_MS);
