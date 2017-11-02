/**
 * Проект: датчик измерения расстояния
 *
 * Суть:
 * Интенсивность лампочки зависит от расстояния, измеренного дальномером.
 * Чем больше измеренное расстояние, тем менее ярко светит лампа.
 */

// Настройки подключения датчиков

/** Пин кнопки включения/выключения */
const PIN_STATUS_BUTTON = P0;
/** Пин лампочки */
const PIN_DISTANCE_LIGHT = A0;
/** Пара пинов для подключения дальномера  */
const PIN_INPUT_ULTRASONIC_TRIGGER = P12;
const PIN_INPUT_ULTRASONIC_ECHO = P13;

// Остальные настройки

/** Время между снятием измерений с дальномера (в миллисекундах) */
const DISTANCE_MEASURE_INTERVAL_TIME_MS = 250;

// ====================
// Основной код
// ====================

// "Высокоуровневый" объект для работы со схемой
const RangeScheme = {
  // Работает ли схема изначально
  '_isEnabled': false,

  // Callback, вызываемый при получении новых измерений
  '_updateCallback': null,

  // Callback, вызываемый при включении/выключении схемы
  '_enabledChangeCallback': null,

  // Идентификатор таймера, запускаемого по 
  '_updateIntervalId': null,

  'isEnabled': function () {
    return this._isEnabled;
  },

  'setEnabledChangeCallback': function (callback) {
    this._enabledChangeCallback = callback;
  },

  'toggleEnabled': function () {
    this._isEnabled = !this._isEnabled;
    this._processCallback();
  },

  'run': function (updateCallback) {
    this._updateCallback = updateCallback;
    this._processCallback();
  },

  '_processCallback': function () {
    if (this._enabledChangeCallback) {
      this._enabledChangeCallback(this._isEnabled);
    }

    if (this._isEnabled && this._updateCallback) {
      let measurePeriodTime = DISTANCE_MEASURE_INTERVAL_TIME_MS;
      let context = this;
      this._updateIntervalId = setInterval(
        function () {
          context._updateCallback(measurePeriodTime);
        },
        measurePeriodTime
      );
    } else if (!this._isEnabled && this._updateIntervalId) {
      clearInterval(this._updateIntervalId);
      this._updateIntervalId = null;
    }
  }
};

// Кнопка для глобального включения / выключения
const $toggleButton = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);
$toggleButton.on('click', function () { RangeScheme.toggleEnabled(); });

// Лампочка
const $distanceLight = require('@amperka/led')
  .connect(PIN_DISTANCE_LIGHT);

// Действия при включении/выключении схемы
RangeScheme.setEnabledChangeCallback(
  function (newEnabledValue) {
    console.log("The New scheme enabled value: ", newEnabledValue);
    $distanceLight.toggle(newEnabledValue);
  }
);

// Работа с дальномером
const $sonicSensor = require('@amperka/ultrasonic')
  .connect({
    trigPin : PIN_INPUT_ULTRASONIC_TRIGGER,
    echoPin : PIN_INPUT_ULTRASONIC_ECHO
  });

/**
 * Нормировочная функция для получения яркости статусной лампы.
 * Основная идея - чем больше измеренное расстояние тем менее ярко светит лампа.
 * Нормировка нужна для того чтобы изменения на маленьких расстояниях влияли сильнее,
 * чем на больших.
 * Например, разница интенсивностей между 20 и 40 сантиметрами должна быть больше,
 * чем между 3 и 4 метрами.
 *
 * @param {number} x измеренное растояние
 * @param {number} minValue минимальное расстояние (на нём должна быть максимальная яркость)
 * @param {number} maxValue максимальное расстояние (на нём должна быть минимальная яркость)
 */
function getNormalizedBrightness(x, minValue, maxValue) {
  const yMinValue = 1;
  const yMaxValue = 0.1;

  // f(x) = a / x + b
  // f(minValue) = yMinValue
  // f(maxValue) = yMaxValue
  const a = minValue * maxValue * (yMinValue - yMaxValue) / (maxValue - minValue);
  const b = (yMaxValue * maxValue - yMinValue * minValue) / (maxValue - minValue);

  let result = a / x + b;
  if (result > yMinValue) {
    result = yMinValue;
  }
  if (result < yMaxValue) {
    result = yMaxValue;
  }

  return result;
}

/**
 * Функция, снимающая показания с дальномера и выставляющая интенсивность на лампе
 * @param {number} measurePeriodTime время между снятием измерений
 */
function getNewDistanceValue(measurePeriodTime) {
  "use strict";
  if (!RangeScheme.isEnabled()) {
    console.log("The scheme is disabled");
    return;
  }

  let timeStart = getTime();
  $sonicSensor.ping(
    function (err, value) {
      let timeFinish = getTime();
      let sonarValue = null;
      let brightness = null;
      if (err) {
        console.log("Sensor: cannot get ultrasonic value:", err.msg);
      } else {
        // Расстояние меряем в миллиметрах, дробная часть не нужна
        sonarValue = Math.round(value);
        if (RangeScheme.isEnabled()) {
          brightness = getNormalizedBrightness(sonarValue, 100, 5000);
          $distanceLight.brightness(brightness);
        }
      }

      // Вывод отладочной информации
      let waitTimeMs = 1e3 * (timeFinish - timeStart);
      console.log(
        "Sonar value, mm:", sonarValue,
        "Wait time, ms:", waitTimeMs.toFixed(3),
        "Brighness:", brightness
      );

      // Контроль параметров: если мы слишком часто снимаем показания и они не успевают сниматься,
      // то лушше будет увеличить внемя между снятиями показаний дальномера
      if (waitTimeMs > measurePeriodTime) {
        console.log("Sonar wait time is greater than measure period time", measurePeriodTime);
      }
    },
    "mm"
  );

}

// ====================
// Запуск схемы
// ====================

RangeScheme.run(getNewDistanceValue);
